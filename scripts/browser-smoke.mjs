// Installed-browser integration tests, using only Node built-ins and an isolated profile.
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist = path.join(root,'dist');
const evidence = path.join(root,'evidence');
const runId = new Date().toISOString().replaceAll(':','').replaceAll('.','');
const screenshots = path.join(evidence,'screenshots',runId);
await fs.mkdir(screenshots,{recursive:true});
const candidates = process.platform === 'win32' ? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
] : ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'];
const browserPath = candidates.find(existsSync);
const report = {schema:'genomeatlas.browser-check/1',run_id:runId,started_at_utc:new Date().toISOString(),scope:'LOCAL_STATIC_SITE_WITH_SYNTHETIC_ADVERSARIAL_INPUTS',browser:null,checks:[],screenshots:[],console_errors:[],page_request_failures:[],external_page_requests:[],status:'RUNNING'};
if (!browserPath) {
  report.status = 'NOT_TESTED';report.reason = 'No supported installed browser found at the bounded known locations.';
  await fs.writeFile(path.join(evidence,'browser-smoke.json'),JSON.stringify(report,null,2)+'\n');
  console.error(report.reason);process.exit(2);
}
const profiles = path.join(evidence,'browser-profile');
await fs.mkdir(profiles,{recursive:true});
const profile = await fs.mkdtemp(path.join(profiles,'smoke-'));
const downloads = path.join(profile,'downloads');await fs.mkdir(downloads);
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
const sanitize = text => String(text).replaceAll(root,'<REPO>').replaceAll(root.replaceAll('\\','/'),'<REPO>')
  .replace(/(?:[A-Z]:[\\/]Users[\\/][^\s:]+|\/home\/[^\s:]+)/gi,'<LOCAL_PATH>')
  .replace(/(?:ws|http):\/\/127\.0\.0\.1:\d+[^\s]*/g,'<LOCAL_PREVIEW_ENDPOINT>');
const allowed = new Set(Object.keys(JSON.parse(await fs.readFile(path.join(dist,'manifest.json'),'utf8'))));
const server = http.createServer(async (req,res) => {
  try {
    const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1) || 'index.html';
    if (!allowed.has(name)) {res.writeHead(404);res.end('Not found');return;}
    const types = {'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain','.txt':'text/plain'};
    res.writeHead(200,{'Content-Type':types[path.extname(name)] || 'text/plain','Cache-Control':'no-store'});
    res.end(await fs.readFile(path.join(dist,name)));
  } catch {res.writeHead(400);res.end('Bad request');}
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const args = ['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check',
  '--disable-gpu','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--metrics-recording-only','--window-size=1440,1000','about:blank'];
const browser = spawn(browserPath,args,{cwd:root,windowsHide:true,stdio:['ignore','ignore','pipe']});
let browserStderr = '';browser.stderr.on('data',chunk => {browserStderr += chunk.toString();});
let launchError;browser.on('error',error => {launchError = error;});
let socket;
try {
  let port;
  for(let attempt=0;attempt<100;attempt++) {
    if (launchError) throw launchError;
    if(browser.exitCode != null) throw new Error(`Browser exited during startup (${browser.exitCode}).`);
    try {port = (await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;} catch {await pause(100);}
  }
  if (!port) throw new Error('Browser did not expose DevTools in the isolated profile within 10 seconds.');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find(target => target.type === 'page' && target.url === 'about:blank');
  if (!page) throw new Error('Isolated browser page unavailable.');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message',event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);if(!request) return;
      clearTimeout(request.timer);pending.delete(message.id);
      if(message.error) request.reject(new Error(message.error.message));else request.resolve(message.result);
    } else if(message.method === 'Runtime.exceptionThrown') report.console_errors.push(sanitize(message.params.exceptionDetails.text + ' ' + (message.params.exceptionDetails.exception?.description || '')));
    else if(message.method === 'Log.entryAdded' && message.params.entry.level === 'error') report.console_errors.push(sanitize(message.params.entry.text));
    else if(message.method === 'Network.loadingFailed' && !message.params.canceled) report.page_request_failures.push(message.params.errorText);
    else if(message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:')) report.external_page_requests.push('Unexpected external page request (URL redacted)');
    }
  });
  function cdp(method,params = {}) {
    const id = ++sequence;
    return new Promise((resolve,reject) => {
      const timer = setTimeout(() => {pending.delete(id);reject(new Error(`DevTools timeout: ${method}`));},10000);
      pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
    });
  }
  async function evaluate(expression) {
    const response = await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
    if(response.exceptionDetails) throw new Error(sanitize(response.exceptionDetails.exception?.description || response.exceptionDetails.text));
    return response.result.value;
  }
  async function waitFor(expression) {
    for(let attempt=0;attempt<100;attempt++) {if(await evaluate(expression)) return;await pause(50);}
    throw new Error(`Browser assertion timed out: ${expression}`);
  }
  async function check(name, action) {
    await action();report.checks.push({name,status:'PASS'});console.log(`PASS ${name}`);
  }
  async function route(name, expected) {
    await evaluate(`location.hash = ${JSON.stringify('#'+name)}`);
    await waitFor(`document.querySelector('h1')?.textContent === ${JSON.stringify(expected)}`);
  }
  async function screenshot(name) {
    await evaluate('document.fonts.ready');
    const metrics = await cdp('Page.getLayoutMetrics');
    const width = Math.ceil(metrics.cssContentSize.width), height = Math.ceil(metrics.cssContentSize.height);
    const result = await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});
    const relative = `evidence/screenshots/${runId}/${name}.png`;
    const bytes = Buffer.from(result.data,'base64');await fs.writeFile(path.join(root,relative),bytes);
    report.screenshots.push({path:relative,width,height,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Log.enable');
  const version = await cdp('Browser.getVersion');report.browser = version.product;
  await cdp('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:origin});
  await waitFor("document.querySelector('h1')?.textContent === 'A clear path from data to evidence.'");
  await check('Overview renders actual counts and eight inspectable nodes',async () => {
    assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.metric strong'),n=>n.textContent)"),['177','63','8','0']);
    assert.equal(await evaluate("document.querySelectorAll('.flow-node').length"),8);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true);
  });
  await screenshot('overview-desktop');
  await check('Keyboard Enter opens inspector; Escape closes and restores focus',async () => {
    await evaluate("document.querySelector('.flow-node').focus()");
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await waitFor("document.querySelector('dialog').open");
    await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await waitFor("!document.querySelector('dialog').open");
    assert.equal(await evaluate("document.activeElement.classList.contains('flow-node')"),true);
  });
  await check('Registry search, combined filters, empty state and reset',async () => {
    await route('registry','Tool registry');
    assert.equal(await evaluate("document.querySelectorAll('#registry-rows tr').length"),63);
    await evaluate("document.querySelector('#tool-query').value='smarts.bio';document.querySelector('#tool-query').dispatchEvent(new Event('input'))");
    assert.equal(await evaluate("document.querySelectorAll('#registry-rows tr').length"),1);
    assert.ok(await evaluate("document.querySelector('#registry-rows').textContent.includes('AUTH_REQUIRED')"));
    await evaluate("document.querySelector('#tool-probed').value='false';document.querySelector('#tool-probed').dispatchEvent(new Event('change'))");
    assert.equal(await evaluate("document.querySelectorAll('#registry-rows tr').length"),0);
    await evaluate("document.querySelector('.empty button').click()");
    assert.equal(await evaluate("document.querySelectorAll('#registry-rows tr').length"),63);
  });
  await screenshot('registry-desktop');
  await check('Eight chain diagrams expose 24 clickable input / process / output nodes',async () => {
    await route('chains','Eight inspectable data chains');
    assert.equal(await evaluate("document.querySelectorAll('.stage-card').length"),8);
    assert.equal(await evaluate("document.querySelectorAll('.stage-pipeline .flow-node').length"),24);
    for(let i=0;i<8;i++) {
      await evaluate(`document.querySelectorAll('.stage-card')[${i}].querySelector('.flow-node').click()`);
      assert.equal(await evaluate("document.querySelector('dialog').open"),true);
      await evaluate("document.querySelector('dialog').close()");
    }
  });
  await screenshot('chains-desktop');
  await check('Genome list renders all 177 IDs and exact lookup',async () => {
    await route('genomes','The frozen genome panel');
    assert.equal(await evaluate("document.querySelectorAll('#genome-rows tr').length"),177);
    await evaluate("document.querySelector('#genome-query').value='GCF_023499275.1';document.querySelector('#genome-query').dispatchEvent(new Event('input'))");
    assert.equal(await evaluate("document.querySelectorAll('#genome-rows tr').length"),1);
  });
  await check('Cheatbook synthetic coordinate positive and negative checks',async () => {
    await route('cheatbook','Workflow cheatbook');
    await evaluate("document.querySelector('#coord-start').value='1';document.querySelector('#coord-end').value='10';document.querySelector('#coord-length').value='100';document.querySelector('#coord-convention').value='one';document.querySelector('#coordinate-form').requestSubmit()");
    assert.ok(await evaluate("document.querySelector('#coordinate-output').textContent.includes('[0, 10)')"));
    await evaluate("document.querySelector('#coord-end').value='101';document.querySelector('#coordinate-form').requestSubmit()");
    assert.ok(await evaluate("document.querySelector('#coordinate-output .error') !== null"));
  });
  await check('Confirmation creates and exports a local task request only',async () => {
    await route('workbench','Delegation workbench');
    assert.equal(await evaluate("document.querySelector('#create-request').disabled"),true);
    await evaluate("document.querySelector('#request-confirm').click();document.querySelector('#create-request').click()");
    assert.ok(await evaluate("document.querySelector('#request-queue').textContent.includes('TASK_REQUEST_ONLY')"));
    assert.equal(await evaluate("document.querySelector('[aria-describedby=execute-prerequisite]').disabled"),true);
    await evaluate("document.querySelector('#request-result button').click()");
    const target = path.join(downloads,'genomeatlas-task-request.json');
    for(let i=0;i<50 && !existsSync(target);i++) await pause(100);
    const downloaded = JSON.parse(await fs.readFile(target,'utf8'));
    assert.equal(downloaded.state,'TASK_REQUEST_ONLY');assert.equal(downloaded.genome_accessions.length,177);
    assert.equal(downloaded.config.use_gpu,false);
  });
  await screenshot('workbench-desktop');
  await check('Receipts show source verification limits and actual exposed tool discovery',async () => {
    await route('receipts','Probe receipts');
    assert.equal(await evaluate("document.querySelectorAll('article.stage-card').length"),3);
    assert.ok(await evaluate("document.querySelector('main').textContent.includes('NATIVE_TOOLS_EXPOSED_NOT_INVOKED')"));
  });
  await check('Real data download has the exact source bytes',async () => {
    await route('exchange','Import & export');
    await evaluate("document.querySelector('a[download=genomeatlas-panel.json]').click()");
    const target = path.join(downloads,'genomeatlas-panel.json');
    for(let i=0;i<50 && !existsSync(target);i++) await pause(100);
    assert.deepEqual(await fs.readFile(target),await fs.readFile(path.join(root,'data/panel.json')));
  });
  await check('Synthetic probe PASS import stays unverified and cannot mutate receipts',async () => {
    const fixture = JSON.parse(await fs.readFile(path.join(root,'templates/probe-result.synthetic.json'),'utf8'));fixture.claimed_result = 'PASS';
    await evaluate(`document.querySelector('#import-json').value=${JSON.stringify(JSON.stringify(fixture))};Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Validate & preview').click()`);
    assert.ok(await evaluate("document.querySelector('#import-result').textContent.includes('UNVERIFIED')"));
    assert.ok(await evaluate("document.querySelector('#import-result').textContent.includes('No actual probe, job or deployment state changed')"));
    await route('receipts','Probe receipts');assert.equal(await evaluate("document.querySelectorAll('article.stage-card').length"),3);
    await route('exchange','Import & export');
  });
  await check('Synthetic HTML / prototype / malformed imports rejected without execution',async () => {
    const payloads = ['{"__proto__":{"polluted":true}}','{"schema":"genomeatlas.probe-result/1","endpoint_alias":"<img src=x onerror=alert(1)>"}','{'];
    for(const payload of payloads) {
      await evaluate(`document.querySelector('#import-json').value=${JSON.stringify(payload)};Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Validate & preview').click()`);
      assert.ok(await evaluate("document.querySelector('#import-result .error') !== null"));
      assert.equal(await evaluate("document.querySelector('#import-result img') === null && ({}).polluted === undefined"),true);
    }
  });
  await screenshot('import-negative-desktop');
  await check('JSON file upload supports a real frozen snapshot preview',async () => {
    const documentNode = await cdp('DOM.getDocument');
    const node = await cdp('DOM.querySelector',{nodeId:documentNode.root.nodeId,selector:'#import-file'});
    await cdp('DOM.setFileInputFiles',{nodeId:node.nodeId,files:[path.join(root,'data/panel.json')]});
    await waitFor("document.querySelector('#import-json').value.includes('GCF_023499275.1')");
    await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Validate & preview').click()");
    assert.ok(await evaluate("document.querySelector('#import-result').textContent.includes('Source snapshot: panel')"));
  });
  await check('Mobile layout contains content within 390px on all eight routes',async () => {
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    const routes = [['overview','A clear path from data to evidence.'],['registry','Tool registry'],['chains','Eight inspectable data chains'],['genomes','The frozen genome panel'],['cheatbook','Workflow cheatbook'],['workbench','Delegation workbench'],['receipts','Probe receipts'],['exchange','Import & export']];
    for(const [name,title] of routes) {
      await route(name,title);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,`overflow on ${name}`);
      if(name === 'overview' || name === 'chains') await screenshot(`${name}-mobile`);
    }
  });
  await check('No browser console errors, page failures or external page requests',async () => {
    assert.deepEqual(report.console_errors,[]);assert.deepEqual(report.page_request_failures,[]);assert.deepEqual(report.external_page_requests,[]);
  });
  report.status = 'PASS';
  await cdp('Browser.close');
} catch(error) {
  report.status = 'FAIL';report.failure = sanitize(error.stack || error.message);console.error(report.failure);process.exitCode = 1;
} finally {
  if(socket?.readyState === WebSocket.OPEN) socket.close();
  if(browser.exitCode == null) browser.kill();
  server.close();
  report.finished_at_utc = new Date().toISOString();
  report.browser_stderr = sanitize(browserStderr);
  report.redacted = true;
  await fs.writeFile(path.join(evidence,'browser-smoke.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(evidence,`browser-smoke-${runId}.json`),JSON.stringify(report,null,2)+'\n');
  console.log(`${report.status}: ${report.checks.length} completed browser checks; ${report.screenshots.length} screenshots.`);
}
