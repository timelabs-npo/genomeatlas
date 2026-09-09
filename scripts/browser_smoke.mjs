/* Local Chromium smoke check using Node built-ins; no installs or backend. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [process.env.ATLAS_BROWSER, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "/usr/bin/chromium", "/usr/bin/google-chrome"].filter(Boolean);
const executable = candidates.find(candidate => fs.existsSync(candidate));
if (!executable) { console.error("NOT_TESTED: no installed Chromium browser available."); process.exit(2); }
fs.mkdirSync(path.join(root, ".tmp"), { recursive: true });
fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
const profile = fs.mkdtempSync(path.join(root, ".tmp", "chromium-smoke-"));
const downloads = path.join(profile, "downloads");
fs.mkdirSync(downloads);
const child = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-component-update", "--disable-sync", "--disable-extensions", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
let spawnError, socket, sessionId, nextId = 0, browserVersion = null, exitCode = 1, failure = null;
const pending = new Map(), checks = [], errors = [], network = [];
const started = new Date().toISOString();
child.stderr.resume();
child.on("error", error => { spawnError = error; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, name) {
  const end = Date.now() + 10000;
  while (Date.now() < end) { if (await predicate()) return; await delay(100); }
  throw new Error("Timed out: " + name);
}
function send(method, params = {}, session = sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error("CDP timeout: " + method)); }, 5000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function check(name, expression) {
  assert.equal(await evaluate(expression), true, name);
  checks.push(name); console.log("PASS: " + name);
}
async function importFile(id, content, resultId) {
  await evaluate(`(() => { document.getElementById(${JSON.stringify(resultId)}).textContent = ''; const d = new DataTransfer(); d.items.add(new File([${JSON.stringify(content)}], 'test.json', {type:'application/json'})); const input = document.getElementById(${JSON.stringify(id)}); input.files = d.files; input.dispatchEvent(new Event('change')); })()`);
  await until(() => evaluate(`document.getElementById(${JSON.stringify(resultId)}).textContent.length > 0 && document.getElementById(${JSON.stringify(resultId)}).textContent !== 'Validating JSON…'`), "import response");
}
try {
  const portFile = path.join(profile, "DevToolsActivePort");
  await until(() => {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error("Browser process exited before startup with code " + child.exitCode);
    return fs.existsSync(portFile);
  }, "browser startup");
  const [port, endpoint] = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
  socket = new WebSocket("ws://127.0.0.1:" + port + endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", event => {
    const m = JSON.parse(String(event.data));
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); clearTimeout(p.timeout); pending.delete(m.id);
      if (m.error) p.reject(new Error(JSON.stringify(m.error))); else p.resolve(m.result);
    } else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
    else if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errors.push(m.params.entry.text);
    else if (m.method === "Network.requestWillBeSent" && /^https?:/.test(m.params.request.url)) network.push(m.params.request.url);
  });
  browserVersion = (await send("Browser.getVersion", {}, null)).product;
  const target = await send("Target.createTarget", { url: "about:blank" }, null);
  sessionId = (await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }, null)).sessionId;
  for (const domain of ["Runtime", "Page", "Log", "Network"]) await send(domain + ".enable");
  await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloads }, null);
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(path.join(root, "docs/index.html")).href });
  await until(() => evaluate("document.documentElement.dataset.atlasReady === 'true'"), "site ready");
  await check("file site initializes all 20 tools", "document.querySelectorAll('.tool-item').length === 20 && document.title.includes('GenomeAtlas')");
  await check("seven stages expose their exact acceptance contracts", `(() => {for(const s of ATLAS_DATA.flow){document.querySelector('[data-stage="'+s.id+'"]').click();if(document.getElementById('stage-title').textContent!==s.name||document.getElementById('stage-acceptance').textContent!==s.acceptance)return false;}return true;})()`);
  await evaluate("document.querySelector('[data-stage=markers]').focus()");
  for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await check("keyboard Enter selects a workflow stage", "document.getElementById('stage-title').textContent === 'Select conserved markers'");
  await evaluate("document.querySelector('.tool-item summary').focus()");
  for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await check("keyboard Enter opens a tool contract", "document.querySelector('.tool-item').open");
  await check("registry search and filters combine", `(() => {const q=document.getElementById('tool-search');q.value='smarts';q.dispatchEvent(new Event('input'));const f=document.getElementById('layer-filter');f.value='Service';f.dispatchEvent(new Event('change'));return document.querySelectorAll('.tool-item').length===1&&document.querySelector('.tool-item').dataset.toolId==='smarts-bio';})()`);
  await check("registry shows an empty state and clears filters", `(() => {const q=document.getElementById('tool-search');q.value='no-such-tool';q.dispatchEvent(new Event('input'));if(document.getElementById('tool-empty').hidden)return false;document.getElementById('clear-filters').click();return document.querySelectorAll('.tool-item').length===20;})()`);
  await check("accession search retains exact version", `(() => {const q=document.getElementById('accession-search');q.value='GCF_023499275.1';q.dispatchEvent(new Event('input'));return document.querySelectorAll('#accession-list li').length===1&&document.querySelector('#accession-list li').textContent===q.value;})()`);
  await check("missing request fields block export", `(() => {document.getElementById('request-form').requestSubmit();return !document.getElementById('form-errors').hidden&&document.getElementById('export-request').disabled;})()`);
  await check("stage action selects its review job", `(() => {document.querySelector('[data-stage=rm]').click();document.getElementById('stage-request').click();return document.getElementById('job').value==='rm-schema-check'&&document.getElementById('request-state').textContent==='DRAFT';})()`);
  await check("valid request only requires confirmation", `(() => {document.getElementById('reviewer').value='reviewer';document.getElementById('endpoint').value='workspace';document.getElementById('request-form').requestSubmit();const r=JSON.parse(document.getElementById('request-json').textContent);return r.state==='REQUIRES_CONFIRMATION'&&r.execution==='NOT_EXECUTED'&&r.run_receipt===null&&!document.getElementById('export-request').disabled;})()`);
  await evaluate("document.getElementById('export-request').click()");
  const requestPath = path.join(downloads, "genomeatlas-rm-schema-check-review-request.json");
  await until(() => fs.existsSync(requestPath), "actual JSON download");
  const exported = JSON.parse(fs.readFileSync(requestPath, "utf8"));
  assert.equal(exported.execution, "NOT_EXECUTED"); assert.equal(exported.run_receipt, null);
  checks.push("actual downloaded JSON has no execution receipt"); console.log("PASS: actual downloaded JSON has no execution receipt");
  await check("editing a request disables export", `(() => {const b=document.getElementById('budget');b.value='1';b.dispatchEvent(new Event('input',{bubbles:true}));return document.getElementById('request-state').textContent==='DRAFT'&&document.getElementById('export-request').disabled;})()`);
  await importFile("import-request", JSON.stringify(exported), "import-message");
  await check("valid imported request resets to DRAFT", "document.getElementById('import-message').textContent.startsWith('Imported as DRAFT') && document.getElementById('export-request').disabled");
  for (const [name, content] of [["malformed", "{"], ["oversized", " ".repeat(65537)], ["receipt-bearing", JSON.stringify({...exported,run_receipt:{}})], ["markup", JSON.stringify({...exported,reviewer:'<img src=x onerror="globalThis.pwned=true">'})]]) {
    await importFile("import-request", content, "import-message");
    await check(name + " request rejected safely", "document.getElementById('import-message').textContent.startsWith('Import rejected') && document.getElementById('export-request').disabled && !globalThis.pwned");
  }
  const ledgerBefore = await evaluate("document.getElementById('probe-list').textContent");
  const receipt = {schema_version:1,kind:"RUN_RECEIPT",job:"panel-audit",claimed_status:"PASSED",summary:'<img src=x onerror="globalThis.pwned=true">',evidence_reference:"inert-test-reference"};
  await importFile("import-receipt", JSON.stringify(receipt), "receipt-message");
  await check("receipt markup stays inert and unverified", "JSON.parse(document.getElementById('receipt-preview').textContent).verified===false && document.querySelectorAll('#receipts img').length===0 && !globalThis.pwned");
  assert.equal(await evaluate("document.getElementById('probe-list').textContent"), ledgerBefore);
  await importFile("import-receipt", JSON.stringify({...receipt,verified:true}), "receipt-message");
  await check("receipt claiming verified status rejects", "document.getElementById('receipt-message').textContent.startsWith('Receipt rejected')");
  await evaluate("document.getElementById('download-registry').click()");
  await until(() => fs.existsSync(path.join(downloads,"genomeatlas-tool-registry.json")), "registry download");
  assert.equal(JSON.parse(fs.readFileSync(path.join(downloads,"genomeatlas-tool-registry.json"))).tools.length,20);
  checks.push("actual registry JSON download contains 20 tools");
  await evaluate("document.getElementById('reset-request').click(); document.querySelector('[data-stage=panel]').click(); document.querySelectorAll('details').forEach(d=>d.open=false); scrollTo(0,0)");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await check("reduced motion disables smooth scrolling", "getComputedStyle(document.documentElement).scrollBehavior==='auto'");
  for (const [name,width,height] of [["desktop",1440,1000],["mobile",390,844],["small-mobile",320,740]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor:1,mobile:width<500 });
    await evaluate("scrollTo(0,0)");
    await check(name + " has no horizontal overflow", "document.documentElement.scrollWidth<=innerWidth");
    const png=await send("Page.captureScreenshot",{format:"png"});
    fs.writeFileSync(path.join(root,"evidence/"+name+".png"),Buffer.from(png.data,"base64"));
  }
  const ax=await send("Accessibility.getFullAXTree");
  assert.equal(ax.nodes.filter(n=>!n.ignored&&["button","textbox","combobox","link"].includes(n.role?.value)&&!n.name?.value).length,0);
  checks.push("interactive controls have accessible names");
  assert.deepEqual(errors,[]); assert.deepEqual(network,[]);
  checks.push("no runtime errors or website HTTP requests");
  exitCode=0;
} catch(error) {
  failure=String(error.message).replaceAll(root,"<repository>");
  console.error("FAIL: "+failure);
} finally {
  fs.writeFileSync(path.join(root,"evidence/chromium-smoke.json"),JSON.stringify({kind:"LOCAL_BROWSER_SMOKE",state:exitCode===0?"PASSED":"FAILED",assertion_execution:checks.length?"EXECUTED":"NOT_TESTED",command:"node scripts/browser_smoke.mjs",started_at:started,finished_at:new Date().toISOString(),browser:browserVersion,browser_process_exit:child.exitCode,exit_code:exitCode,checks,failure,errors,website_http_requests:network},null,2)+"\n");
  if(socket?.readyState===WebSocket.OPEN){try{await send("Browser.close",{},null);}catch{} socket.close();}
  for(const p of pending.values())clearTimeout(p.timeout);
  if(child.exitCode===null){await Promise.race([new Promise(r=>child.once("exit",r)),delay(1500)]);if(child.exitCode===null)child.kill();}
  process.exitCode=exitCode;
}
