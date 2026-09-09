// Pure validation and export logic shared by the browser and Node tests.
export const MAX_BYTES = 100_000;
export const DIMENSIONS = Object.freeze(['exposed', 'installed', 'authenticated', 'probed', 'executed']);
export const STATES = Object.freeze(['unknown', 'yes', 'no', 'blocked', 'not-tested']);
export const INVARIANTS = Object.freeze({genomes:177, groups:10, enterococcus:false, markerBasis:'conserved-single-copy-proteins', separateAlignments:true, rmIndependent:true, missingIsAbsence:false, unreviewedIsPartial:false, modelIsFunction:false});
const fail = message => { throw new Error(message); };
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('Expected a plain object');
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(value, key))) fail('Missing or unexpected field');
}
function text(value, max=1200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('Invalid text length');
  if (/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value) || /(?:javascript|data|vbscript)\s*:|&#|&(?:lt|gt);/i.test(value)) fail('Unsafe markup or control text');
  return value;
}
function id(value) { text(value,80); if (!/^[a-z][a-z0-9-]*$/.test(value)) fail('Invalid identifier'); }
function unique(values) { if (new Set(values).size !== values.length) fail('Duplicate identifier'); }
function list(values, max=100) { if (!Array.isArray(values) || !values.length || values.length > max) fail('Empty or oversized list'); }
export function validateScience(value) {
  object(value,Object.keys(INVARIANTS));
  for (const key of Object.keys(INVARIANTS)) if (value[key] !== INVARIANTS[key]) fail('Scientific invariant violated: '+key);
  return value;
}
export function validateAccessions(value, frozen=false) {
  if (typeof value !== 'string' || new TextEncoder().encode(value).length > MAX_BYTES) fail('Invalid accession input size');
  const lines=value.trim().split(/\r?\n/).map(x=>x.trim());
  list(lines,1000);
  if (lines.some(x=>!/^GCF_\d{9}\.\d+$/.test(x))) fail('Expected nonempty versioned RefSeq accession on each line');
  unique(lines);
  if (frozen && lines.length !== INVARIANTS.genomes) fail('Frozen panel must contain 177 accessions');
  return lines;
}
export function validateDocument(doc) {
  object(doc,['schemaVersion','kind','records']);
  if (doc.schemaVersion !== 1 || !['registry','probes'].includes(doc.kind)) fail('Unsupported schema or document kind');
  list(doc.records);
  for (const row of doc.records) {
    if (doc.kind === 'registry') {
      object(row,['id','name','purpose','states','evidenceIds','notes']);
      id(row.id); text(row.name,100); text(row.purpose); text(row.notes);
      object(row.states,DIMENSIONS);
      for (const dimension of DIMENSIONS) if (!STATES.includes(row.states[dimension])) fail('Invalid registry state');
      if (!Array.isArray(row.evidenceIds) || row.evidenceIds.length > 20) fail('Invalid evidence IDs');
      row.evidenceIds.forEach(id); unique(row.evidenceIds);
      if (Object.values(row.states).includes('yes') && !row.evidenceIds.length) fail('Positive state requires evidence reference');
    } else {
      object(row,['id','toolId','observedAt','dimension','state','summary']);
      id(row.id); id(row.toolId); text(row.summary);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(row.observedAt) || !Number.isFinite(Date.parse(row.observedAt)) || new Date(row.observedAt).toISOString().replace('.000','') !== row.observedAt) fail('Invalid UTC observation timestamp');
      if (!DIMENSIONS.includes(row.dimension) || !STATES.includes(row.state)) fail('Invalid probe state');
    }
  }
  unique(doc.records.map(row=>row.id));
  return doc;
}
export function parseImport(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_BYTES) fail('JSON exceeds 100,000 bytes');
  let doc; try { doc=JSON.parse(raw); } catch { fail('Malformed JSON'); }
  validateDocument(doc);
  // The input has no authority field. Claims cannot alter the bundled registry.
  return {origin:'user-supplied', verified:false, claims:structuredClone(doc)};
}
// Adapter for the explicitly supplied parent format. Validation never grants trust.
export function parseParentSnapshot(raw) {
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES) fail('Parent JSON exceeds size limit');
  let doc; try{doc=JSON.parse(raw.replace(/^\uFEFF/,''));}catch{fail('Malformed parent JSON');}
  object(doc,['schema_version','observed_at','scope','probes','scientific_state']);
  if(doc.schema_version!=='1.0'||doc.scope!=='readiness, not biological results')fail('Unknown parent schema/scope');
  object(doc.scientific_state,['panel','host_tree','rm_calls','experimental_curation']);
  text(doc.scientific_state.panel);
  for(const key of ['host_tree','rm_calls','experimental_curation'])if(doc.scientific_state[key]!=='NOT_RUN')fail('Biological result promotion rejected');
  list(doc.probes);unique(doc.probes.map(p=>p.id));
  const map={PROBED_OK:['probed','yes'],TEST_PASSED:['probed','yes'],RUNNING:['probed','yes'],FAILED:['probed','no'],INSTALLED_SKILL_READ:['installed','yes'],AUTH_BLOCKED:['authenticated','blocked'],NOT_CONNECTED:['exposed','no']};
  const records=doc.probes.map(p=>{
    const allowed=['id','tool','status','result','input_sha256','output_sha256','commit','sha256','version','session_id','exit_code'];
    if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!allowed.includes(k)))fail('Unexpected parent probe fields');
    for(const key of ['id','tool','status','result'])text(p[key]);id(p.id);
    if(!Object.hasOwn(map,p.status))fail('Unknown parent state');
    for(const key of ['input_sha256','output_sha256','sha256'])if(p[key]!==undefined&&!/^[a-f0-9]{64}$/.test(p[key]))fail('Invalid parent hash');
    if(p.commit!==undefined&&!/^[a-f0-9]{40}$/.test(p.commit))fail('Invalid parent commit');
    if(p.version!==undefined)text(p.version,30);
    if(p.session_id!==undefined&&!/^[a-f0-9-]{36}$/.test(p.session_id))fail('Invalid session reference');
    if(p.exit_code!==undefined&&(!Number.isInteger(p.exit_code)||p.exit_code<0||p.exit_code>255))fail('Invalid exit code');
    const [dimension,state]=map[p.status];
    // Deliberately omit session_id and opaque identity fields from the public projection.
    const evidence=['input_sha256','output_sha256','sha256','commit','version','exit_code'].filter(k=>p[k]!==undefined).map(k=>`${k}: ${p[k]}`).join('; ');
    return {id:p.id,toolId:p.id,observedAt:doc.observed_at,dimension,state,summary:`${p.tool} | ${p.status} | ${p.result}${evidence?' | '+evidence:''}`};
  });
  return validateDocument({schemaVersion:1,kind:'probes',records});
}
export function exportImport(value) {
  object(value,['origin','verified','claims']);
  if(value.origin!=='user-supplied' || value.verified!==false) fail('False-result promotion rejected');
  validateDocument(value.claims);
  return JSON.stringify(value,null,2)+'\n';
}
export function makeJob(fields) {
  object(fields,['task','inputs','expectedOutputs','testGate','permissionBoundary','reviewerDecision']);
  ['task','inputs','expectedOutputs','testGate','permissionBoundary'].forEach(k=>text(fields[k],3000));
  if (!['pending','approved','rejected','needs-changes'].includes(fields.reviewerDecision)) fail('Invalid reviewer decision');
  return {schemaVersion:1,kind:'job-request',...structuredClone(fields),origin:'user-supplied',executionStatus:'not-executed',certified:false,receiptSchema:{required:['jobRequestSha256','inputHashes','outputHashes','toolVersions','startedAt','endedAt','exitCode','testGateResult','reviewer','evidenceIds'],hashAlgorithm:'SHA-256',pathRule:'relative paths only',evidenceRule:'independent review required; a request is not a receipt'}};
}
export function serializeJob(job) {
  const rebuilt=makeJob(Object.fromEntries(['task','inputs','expectedOutputs','testGate','permissionBoundary','reviewerDecision'].map(k=>[k,job[k]])));
  if (JSON.stringify(job)!==JSON.stringify(rebuilt)) fail('Job export integrity failure');
  return JSON.stringify(rebuilt,null,2)+'\n';
}
