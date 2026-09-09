import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import snapshot from '../assets/data.mjs';
import {deepFreeze,filterRegistry,previewImport,createRequest,normalizeInterval,safeFilename,validate,MAX_IMPORT_BYTES} from '../assets/core.mjs';
const data = deepFreeze(snapshot);
const probe = JSON.parse(fs.readFileSync(new URL('../templates/probe-result.synthetic.json',import.meta.url)));
const task = JSON.parse(fs.readFileSync(new URL('../templates/task-request.json',import.meta.url)));

test('actual registry: full search plus intersecting layer/status/probed filters',() => {
  assert.equal(filterRegistry(data.registry.entries).length,134);
  assert.equal(filterRegistry(data.registry.entries,{query:'smarts.bio',status:'AUTH_REQUIRED',probed:'true'}).length,1);
  assert.equal(filterRegistry(data.registry.entries,{query:'smarts.bio',status:'AUTH_REQUIRED',probed:'false'}).length,0);
  assert.equal(filterRegistry(data.registry.entries,{layer:'skill-package'}).length,6);
  assert.equal(filterRegistry(data.registry.entries,{query:'NOT-A-REAL-TOOL'}).length,0);
});
test('actual source snapshots round-trip without changing frozen truth',() => {
  const original = JSON.stringify(data);
  for(const name of ['panel','chains','registry','probes']) {
    const result = previewImport(JSON.stringify(data[name]),data);
    assert.equal(result.verification,'UNVERIFIED');assert.equal(result.effect,'PREVIEW_ONLY');
  }
  assert.equal(JSON.stringify(data),original);
  assert.throws(() => {data.probes.receipts[0].status = 'EDITED';},TypeError);
});
test('synthetic positive probe is quarantined even when it claims PASS',() => {
  const original = JSON.stringify(data);
  const result = previewImport(JSON.stringify({...probe,claimed_result:'PASS'}),data);
  assert.equal(result.verification,'UNVERIFIED');assert.equal(result.effect,'PREVIEW_ONLY');
  assert.equal(JSON.stringify(data),original);
});
test('synthetic task creation produces intent only for actual panel accessions',() => {
  const request = createRequest({chain:'rm',role:'VERIFY',endpoint:'review-queue',accessions:data.panel.map(row => row.accession)},data,new Date('2000-01-01T00:00:00Z'));
  assert.equal(request.state,'TASK_REQUEST_ONLY');assert.equal(request.compute,'cpu');
  assert.equal(request.config.use_gpu,false);assert.equal(request.genome_accessions.length,177);
  assert.ok(request.acceptance_criteria.includes('raw-components-reviewed'));
  assert.equal(previewImport(JSON.stringify(request),data).verification,'UNVERIFIED');
});
test('synthetic imports reject every omitted probe requirement',() => {
  for(const key of data.schemas.probe.required) {
    const sample = {...probe};delete sample[key];assert.throws(() => previewImport(JSON.stringify(sample),data));
  }
});
test('synthetic imports reject malformed JSON, oversized and deeply nested structures',() => {
  for(const raw of ['{','null','[]','"plain"','x'.repeat(MAX_IMPORT_BYTES+1),'['.repeat(20)+'0'+']'.repeat(20)]) assert.throws(() => previewImport(raw,data));
});
test('synthetic imports reject prototype pollution and HTML / shell payloads',() => {
  assert.throws(() => previewImport('{"__proto__":{"polluted":true}}',data));
  assert.equal({}.polluted,undefined);
  for(const bad of ['<img src=x onerror=alert(1)>','probe;whoami','../outside','https://example.invalid','local\n']) {
    assert.throws(() => previewImport(JSON.stringify({...probe,endpoint_alias:bad}),data));
  }
});
test('synthetic imports reject privilege escalation and modified source receipts',() => {
  for(const bad of [{...task,state:'PASS'},{...task,execute:true},{...probe,verification:'VERIFIED'},{...probe,claimed_result:'PASS',exit_code:1},{...probe,redacted:false}]) assert.throws(() => previewImport(JSON.stringify(bad),data));
  const source = structuredClone(data.probes);source.receipts[0].status = 'ACCEPTED';
  assert.throws(() => previewImport(JSON.stringify(source),data));
});
test('synthetic imports reject bad timestamps, hashes and non-integer codes',() => {
  for(const sample of [{...probe,observed_at_utc:'2026-02-30T00:00:00Z'},{...probe,observed_at_utc:'2026-01-01T00:00:00+03:00'},{...probe,input_hashes:{}},{...probe,input_hashes:{input:'abc'}},{...probe,exit_code:'0'},{...probe,exit_code:0.5}]) assert.throws(() => previewImport(JSON.stringify(sample),data));
  assert.throws(() => previewImport(JSON.stringify({...probe,input_hashes:{input:'0'.repeat(64)+'\n'}}),data));
});
test('synthetic tasks reject invented IDs, GPU and incorrect host-tree method',() => {
  for(const sample of [{...task,genome_accessions:['GCF_999999999.1']},{...task,genome_accessions:[]},{...task,config:{...task.config,use_gpu:true}},{...task,config:{...task.config,host_tree:'AlphaGenome'}},{...task,acceptance_criteria:['exact-input-set']}]) assert.throws(() => previewImport(JSON.stringify(sample),data));
});
test('synthetic coordinates: one-based single base and zero-based boundaries',() => {
  assert.deepEqual(normalizeInterval(1,1,100,'one'),{start:0,end:1,length:1,coordinate_system:'0-based-half-open'});
  assert.equal(normalizeInterval(0,100,100,'zero').length,100);
  for(const args of [[-1,10,100,'zero'],[0,1,100,'one'],[1,0,100,'zero'],[0,101,100,'zero'],[0,0,100,'zero'],[0.5,1,100,'zero'],[0,1,0,'zero'],[0,1,100,'unknown']]) assert.throws(() => normalizeInterval(...args));
});
test('export filenames are fixed and cannot escape a download name',() => {
  assert.equal(safeFilename('request'),'genomeatlas-task-request.json');
  assert.equal(safeFilename('preview'),'genomeatlas-unverified-preview.json');
  for(const value of ['../outside','constructor','toString']) assert.throws(() => safeFilename(value));
});
test('synthetic boolean and integer types remain distinct in schema checks',() => {
  assert.ok(validate({...probe,exit_code:true},data.schemas.probe).length);
  assert.ok(validate({...probe,redacted:'true'},data.schemas.probe).length);
});
