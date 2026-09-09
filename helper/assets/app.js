import {MAX_BYTES, MAX_RECEIPTS, CHECKLIST, canonicalize, sha256, makePlan, validatePlan, importReceipt, receiptTemplate, reviewMatches, csv} from './core.js';

const $ = id => document.getElementById(id);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const badge = text => el('span', text.replaceAll('-', ' ').toUpperCase(), `tag ${text}`);
const button = (text, handler, className = 'quiet') => { const b = el('button', text, className); b.type = 'button'; b.addEventListener('click', handler); return b; };
let registry, planSchema, receiptSchema;
let activePlan = null, review = null, receipts = [], revision = 0, building = false;
const views = {overview:['Workspace overview','THE RESEARCH, WITH ITS RECEIPTS','Overview'],tools:['Tools & Connections','CAPABILITIES WITH BOUNDARIES','Tools & Connections'],chains:['Data Chains','FROM INPUTS TO REVIEWED OUTPUTS','Data Chains'],evidence:['Evidence & Tests','CLAIMS, CHECKS, AND THEIR SOURCES','Evidence & Tests'],delegation:['Delegation & Confirmations','AN INSPECTABLE HANDOFF','Delegation & Confirmations']};

function route() {
  const hash = location.hash.slice(1);
  const id = Object.hasOwn(views, hash) ? hash : 'overview';
  document.querySelectorAll('.view').forEach(section => { section.hidden = section.id !== `view-${id}`; });
  document.querySelectorAll('nav a').forEach(a => { if (a.dataset.view === id) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  $('view-title').textContent = views[id][0]; $('view-eyebrow').textContent = views[id][1]; $('breadcrumb').textContent = views[id][2];
  document.title = `${views[id][2]} · GenomeAtlas`;
}
window.addEventListener('hashchange', () => { route(); $('main').focus({preventScroll:true}); window.scrollTo(0,0); });
route();

function inspect(title, items, raw) {
  $('inspector-title').textContent = title;
  const body = $('inspector-body'); body.replaceChildren();
  for (const source of items) {
    body.append(el('h3',source.title),badge(source.kind),el('p',source.summary),el('p',`Limits: ${source.limits}`),el('p',`Recorded ${source.date} · ${source.id}`, 'micro'));
    if (source.id === 'local-sites') {
      const link = el('a','Official Sites documentation ↗','text-link');
      link.href = 'https://learn.chatgpt.com/docs/sites'; link.target = '_blank'; link.rel = 'noopener noreferrer'; body.append(link);
    }
  }
  if (raw) { body.append(el('h3','Machine-readable record'),el('pre',JSON.stringify(raw,null,2))); }
  $('inspector').showModal();
}
const sourceRecords = ids => ids.map(id => registry.sources.find(s => s.id === id)).filter(Boolean);
$('close-inspector').addEventListener('click', () => $('inspector').close());
document.querySelectorAll('[data-source]').forEach(b => b.addEventListener('click', () => { if (registry) inspect('Source inspection',sourceRecords([b.dataset.source])); }));

function download(name, data, type = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data,null,2)],{type});
  const url = URL.createObjectURL(blob), link = el('a'); link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
function filteredTools() {
  const search = $('tool-search').value.trim().toLowerCase(), group = $('tool-group').value, probe = $('tool-probe').value;
  return registry.tools.filter(t => (group === 'all' || t.group === group) && (probe === 'all' || t.probe === probe) && [t.name,t.role,t.detail,t.id].join(' ').toLowerCase().includes(search));
}
function renderTools() {
  const tools = filteredTools(); $('tool-list').replaceChildren();
  $('tool-count').textContent = `${tools.length} of ${registry.tools.length} tools`; $('tool-empty').hidden = tools.length > 0;
  for (const tool of tools) {
    const card = el('article',undefined,'panel tool-card'), head = el('div',undefined,'tool-head'), title = el('div');
    title.append(el('small',tool.group.toUpperCase()),el('h3',tool.name)); head.append(title,badge(tool.probe));
    const states = el('dl',undefined,'tool-states');
    for (const [key,label] of [['installation','Declared / installed'],['schema','Schema discovery'],['probe','Probe outcome'],['execution','Execution'],['scientificAcceptance','Scientific acceptance']]) {
      const cell = el('div'), dd = el('dd'); dd.append(badge(tool[key])); cell.append(el('dt',label),dd); states.append(cell);
    }
    const foot = el('div',undefined,'tool-footer'); foot.append(el('span',`${tool.sourceIds.length} source record${tool.sourceIds.length===1?'':'s'}`),button('Inspect sources ↗',() => inspect(tool.name,sourceRecords(tool.sourceIds),tool)));
    card.append(head,el('span',tool.role,'tool-role'),el('p',tool.detail),states,foot); $('tool-list').append(card);
  }
}
for (const id of ['tool-search','tool-group','tool-probe']) $(id).addEventListener('input', () => { if (registry) renderTools(); });
$('reset-filters').addEventListener('click', () => { $('tool-search').value=''; $('tool-group').value='all'; $('tool-probe').value='all'; if (registry) renderTools(); });
$('export-tools-json').addEventListener('click', () => { if (registry) download('genomeatlas-tools.json',{registryVersion:registry.version,kind:'registry-export',tools:filteredTools(),sources:registry.sources}); });
$('export-tools-csv').addEventListener('click', () => { if (registry) download('genomeatlas-tools.csv',csv(filteredTools(),['id','name','group','installation','schema','probe','execution','scientificAcceptance','detail','sourceIds']),'text/csv;charset=utf-8'); });

function svg(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
  for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}
function renderWorkflow() {
  const root = $('workflow'); root.replaceChildren(svg('title',{},'Original LAB R-M workflow'),svg('desc',{},'A shared versioned genome panel and annotated proteins feed independent host phylogeny and R-M annotation methods. Every biological stage is not run.'));
  const defs = svg('defs'), marker = svg('marker',{id:'arrow',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'}); marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'#8c9f91'})); defs.append(marker); root.append(defs);
  root.append(svg('path',{d:'M365 85 V119 M365 185 V210 H176 V245 M365 210 H554 V245',fill:'none',stroke:'#8c9f91','stroke-width':1.5,'marker-end':'url(#arrow)'}));
  root.append(svg('text',{x:20,y:232,'font-size':10,fill:'#4b7b67','letter-spacing':1.2},'HOST PHYLOGENY'),svg('text',{x:398,y:232,'font-size':10,fill:'#936738','letter-spacing':1.2},'R-M ANNOTATION'));
  const host = ['markers','alignments','concatenation','host-tree','export'], rm = ['ordered','detection','hits','review','rings'];
  for (let i=0;i<4;i++) {
    for (const [x,color] of [[176,'#739785'],[554,'#b59870']]) root.append(svg('path',{d:`M${x} ${310+i*112} V${357+i*112}`,stroke:color,'stroke-width':1.5,'marker-end':'url(#arrow)'}));
  }
  const positions = {panel:[220,20],proteins:[220,120]}; host.forEach((id,i) => {positions[id]=[20,250+i*112];}); rm.forEach((id,i) => {positions[id]=[398,250+i*112];});
  for (const stage of registry.stages) {
    const [x,y] = positions[stage.id], shared = stage.branch === 'Shared', width = shared ? 290 : 312;
    const group = svg('g',{class:`stage-node${stage.branch==='R-M annotation'?' rm':''}`,tabindex:0,role:'button','aria-label':stage.name,'aria-pressed':'false','data-stage':stage.id});
    group.append(svg('rect',{x,y,width,height:60,rx:7}),svg('text',{x:x+15,y:y+21,class:'stage-num'},`${String(registry.stages.indexOf(stage)+1).padStart(2,'0')} / NOT RUN`),svg('text',{x:x+15,y:y+43},stage.name));
    group.addEventListener('click',() => selectStage(stage.id)); group.addEventListener('keydown',e => { if (e.key==='Enter'||e.key===' ') {e.preventDefault();selectStage(stage.id);} }); root.append(group);
  }
  root.append(svg('path',{d:'M332 728 H396',stroke:'#8c9f91','stroke-dasharray':'4 4','marker-end':'url(#arrow)'}),svg('text',{x:365,y:790,'text-anchor':'middle','font-size':10,fill:'#72836d'},'Dashed link: map reviewed rings to the exported host tree.'));
  selectStage('panel');
}
function selectStage(id) {
  const stage = registry.stages.find(s => s.id === id); if (!stage) return;
  $('workflow').querySelectorAll('[data-stage]').forEach(n => n.setAttribute('aria-pressed',String(n.dataset.stage===id)));
  const detail = $('stage-detail'); detail.replaceChildren(badge(stage.branch),el('h2',stage.name),el('p',stage.description),badge('not-run'),el('h3','Input dependency'),el('p',stage.dependsOn.length ? stage.dependsOn.map(d=>registry.stages.find(s=>s.id===d).name).join(', ') : 'Versioned panel manifest; no accession rows supplied.'),el('h3','Declared tools'),el('p',stage.toolIds.map(t=>registry.tools.find(v=>v.id===t).name).join(' · ')),el('h3','Before scientific acceptance'),el('p',stage.acceptance),button('Inspect inherited source ↗',()=>inspect(stage.name,sourceRecords(stage.sourceIds),stage)),button('Prepare a plan for this stage →',()=>{invalidatePlan();$('plan-stage').value=id;populatePlanTools();location.hash='delegation';}));
}

function renderSources() {
  $('source-list').replaceChildren();
  for (const source of registry.sources) {
    const row=el('article',undefined,'source-row'),text=el('div');text.append(el('h3',source.title),el('p',`${source.date} · ${source.id}`));
    row.append(badge(source.kind),text,button('Inspect ↗',()=>inspect(source.title,[source],source)));$('source-list').append(row);
  }
}
function renderReport(report) {
  $('test-status').textContent=report.status.replaceAll('_',' '); $('test-status').className=`tag ${report.status==='PASSED'?'passed':'unknown'}`;
  const box=$('test-summary');box.replaceChildren();
  for (const check of report.checks) {const row=el('div',undefined,'check-line');row.append(el('span',check.name),el('strong',check.exitCode===null?'NOT TESTED':`exit ${check.exitCode} · ${check.summary}`));box.append(row);}
  box.append(el('p',`Recorded ${report.recordedAt}. ${report.note}`,'micro'),el('p',`NOT_TESTED: ${report.notTested.join('; ')}.`,'test-limit'));
  for (const shot of report.screenshots || []) {const a=el('a',shot.label,'test-link');a.href=shot.path;a.target='_blank';a.rel='noopener noreferrer';box.append(a);}
}
function renderReceipts() {
  $('receipt-count').textContent=String(receipts.length);$('receipt-empty').hidden=receipts.length>0;$('receipt-list').replaceChildren();
  for (const id of ['export-receipts-json','export-receipts-csv','clear-receipts']) $(id).disabled=!receipts.length;
  for (const imported of receipts) {
    const r=imported.receipt,card=el('article',undefined,'panel receipt-card');
    card.append(el('h3',r.receiptId),badge('unverified'),el('p',`${registry.stages.find(s=>s.id===r.stageId).name} · ${registry.tools.find(t=>t.id===r.toolId).name}`),el('p',`Claimed outcome: ${r.claimedOutcome}. Scientific acceptance: not assessed.`),el('p',r.notes,'receipt-note'),button('Inspect receipt JSON ↗',()=>inspect('Imported claim · unverified',[],imported)),button('Export this receipt ↓',()=>download('genomeatlas-receipt.json',r)));
    $('receipt-list').append(card);
  }
}
$('receipt-file').addEventListener('change',async event => {
  const file=event.target.files[0]; if (!file) return;
  try {
    if (!registry) throw new Error('Workspace is not loaded. Retry loading before import.');
    if (file.size>MAX_BYTES) throw new Error('Receipt exceeds the 1 MiB limit.');
    if (receipts.length>=MAX_RECEIPTS) throw new Error('This tab holds at most 100 receipts. Export or clear imports first.');
    const importRevision=revision;
    const imported=await importReceipt(await file.text(),{registry,receiptSchema,planSchema,activePlan});
    if (importRevision!==revision) throw new Error('Plan changed during import. Retry against the current plan.');
    if (receipts.some(r=>r.receipt.receiptId===imported.receipt.receiptId || r.receiptHash===imported.receiptHash)) throw new Error('Duplicate receipt ID or content. This claim is already in the tab.');
    receipts.push(imported);renderReceipts();$('import-feedback').textContent='Imported as UNVERIFIED. No execution or scientific acceptance established.';$('import-feedback').className='success-text';
  } catch(error) {$('import-feedback').textContent=error.message;$('import-feedback').className='error-text';}
  event.target.value='';
});
$('export-receipts-json').addEventListener('click',()=>download('genomeatlas-claims.json',{kind:'unverified-claims-export',schemaVersion:'1.0',authority:'none',claims:receipts}));
$('export-receipts-csv').addEventListener('click',()=>download('genomeatlas-claims.csv',csv(receipts.map(r=>({receiptId:r.receipt.receiptId,stageId:r.receipt.stageId,toolId:r.receipt.toolId,claimedOutcome:r.receipt.claimedOutcome,evidenceStatus:r.evidenceStatus,scientificAcceptance:r.scientificAcceptance,planHash:r.receipt.planHash,receiptHash:r.receiptHash,notes:r.receipt.notes})),['receiptId','stageId','toolId','claimedOutcome','evidenceStatus','scientificAcceptance','planHash','receiptHash','notes']),'text/csv;charset=utf-8'));
$('clear-receipts').addEventListener('click',()=>{receipts=[];renderReceipts();$('import-feedback').textContent='Imports cleared from this tab.';$('import-feedback').className='';});

function populatePlanTools() {
  $('plan-tool').replaceChildren();
  for (const id of registry.stages.find(s=>s.id===$('plan-stage').value).toolIds) {const option=el('option',registry.tools.find(t=>t.id===id).name);option.value=id;$('plan-tool').append(option);}
}
function invalidatePlan(message = 'Plan cleared. Rebuild after changing the inputs or method.') {
  revision++;activePlan=null;review=null;$('review-checklist').disabled=true;
  document.querySelectorAll('[data-check]').forEach(c=>{c.checked=false;});
  for (const id of ['export-plan','export-template','export-review']) $(id).disabled=true;
  $('review-binding').textContent='Build a plan to enable the checklist.';$('review-status').textContent='No local review recorded.';
  $('plan-feedback').textContent=message;$('plan-feedback').className='';$('plan-details').hidden=true;$('plan-json').textContent='';
  $('active-binding').textContent='No active plan; valid receipts can be inspected as unverified claims.';
}
$('plan-form').addEventListener('input',()=>invalidatePlan());
$('plan-stage').addEventListener('change',()=>{if(registry)populatePlanTools();});
$('clear-plan').addEventListener('click',()=>{$('plan-form').reset();if(registry)populatePlanTools();invalidatePlan('Plan and review cleared.');});
$('plan-form').addEventListener('submit',async event=>{
  event.preventDefault();if(building)return;
  invalidatePlan('Hashing local input files…');const buildRevision=revision;building=true;$('build-plan').disabled=true;
  try {
    if (!registry) throw new Error('Workspace is not loaded. Retry loading.');
    if (!globalThis.crypto?.subtle) throw new Error('SHA-256 requires localhost or HTTPS. Serve this site with the documented local command.');
    const files=Array.from($('plan-files').files);
    if (!files.length || files.length>16) throw new Error('Choose 1–16 small manifest or artifact files.');
    if(files.some(f=>f.size>8388608))throw new Error('Each input must be at most 8 MiB. Use a small manifest, not a full genome.');
    const inputs=[];
    for(const file of files) inputs.push({label:file.name,bytes:file.size,sha256:await sha256(await file.arrayBuffer())});
    const plan=await makePlan({stageId:$('plan-stage').value,toolId:$('plan-tool').value,purpose:$('plan-purpose').value.trim(),parameters:$('plan-parameters').value.trim(),inputs},registry);
    const errors=await validatePlan(plan,registry,planSchema);if(errors.length)throw new Error(errors.join('\n'));
    if(buildRevision!==revision)throw new Error('Inputs changed while hashing. Rebuild the plan.');
    activePlan=plan;review={kind:'local-review',authority:'local-review-only',planHash:plan.planHash,checks:Object.fromEntries(CHECKLIST.map(k=>[k,false]))};
    $('review-checklist').disabled=false;$('export-plan').disabled=false;$('export-template').disabled=false;
    $('review-binding').textContent=`Bound to ${plan.planHash}`;$('plan-feedback').textContent='Plan prepared. No tools were executed.';$('plan-feedback').className='success-text';
    $('plan-details').hidden=false;$('plan-json').textContent=JSON.stringify(plan,null,2);$('active-binding').textContent='Active plan: receipts with different inputs or method hashes will be rejected.';renderReview();
  } catch(error) {$('plan-feedback').textContent=error.message;$('plan-feedback').className='error-text';}
  finally{building=false;$('build-plan').disabled=false;}
});
function renderReview(){
  const count=CHECKLIST.filter(k=>review.checks[k]).length,complete=reviewMatches(review,activePlan);
  $('review-status').textContent=complete?'6 of 6 locally reviewed. External authorization is still required; nothing will execute.':`${count} of 6 locally reviewed. No execution authority.`;
  $('export-review').disabled=!complete;
}
document.querySelectorAll('[data-check]').forEach(box=>box.addEventListener('change',()=>{if(review&&activePlan){review.checks[box.dataset.check]=box.checked;renderReview();}}));
$('export-plan').addEventListener('click',()=>{if(activePlan)download('genomeatlas-plan.json',activePlan);});
$('export-template').addEventListener('click',()=>{if(activePlan)download('genomeatlas-receipt-template.json',receiptTemplate(activePlan));});
$('export-review').addEventListener('click',()=>{if(reviewMatches(review,activePlan))download('genomeatlas-local-review.json',{...review,reviewState:'locally-reviewed',executionAuthority:false});});
$('retry-load').addEventListener('click',()=>location.reload());

async function loadJSON(path) {const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw new Error(`${path}: HTTP ${response.status}`);return response.json();}
async function init(){
  try {
    [registry,planSchema,receiptSchema]=await Promise.all(['data/registry.json','schemas/plan.schema.json','schemas/receipt.schema.json'].map(loadJSON));
    if (!Array.isArray(registry.tools)||!Array.isArray(registry.stages)||!Array.isArray(registry.sources)) throw new Error('Registry is missing required collections.');
    for (const group of [...new Set(registry.tools.map(t=>t.group))].sort()) {const option=el('option',group);option.value=group;$('tool-group').append(option);}
    for (const stage of registry.stages) {const option=el('option',stage.name);option.value=stage.id;$('plan-stage').append(option);}
    for(const [key,value] of Object.entries(registry.semantics))$('semantics-list').append(el('dt',key),el('dd',value));
    populatePlanTools();renderTools();renderWorkflow();renderSources();
    document.documentElement.dataset.ready='true';
    try{renderReport(await loadJSON('data/test-report.json'));}catch{$('test-summary').replaceChildren(el('p','Test report unavailable. No passing tests can be inferred. See the repository test report.'));}
  }catch(error){$('boot-error').hidden=false;$('boot-error-message').textContent=`${error.message}. Serve site/ over HTTP using node scripts/serve.mjs, then retry. File URLs are not supported.`;document.documentElement.dataset.ready='error';}
}
init();
