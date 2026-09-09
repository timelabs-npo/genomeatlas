const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const app=require('../docs/app.js');
function good(){return {kind:'probe-receipt',version:'1.0.0',toolId:'github-cli',state:'EXECUTED',probeTimestamp:'2026-09-09T14:50:00Z',summary:'SYNTHETIC validation control',inputContract:'Synthetic input',outputContract:'Synthetic output',evidence:{location:'synthetic/control.txt',sha256:'sha256:'+'a'.repeat(64)},result:{classification:'DETECTED',exitCode:0},review:{verified:false,reviewer:null}};}
test('parent: valid 64-hex digest accepted',()=>assert.equal(app.validateReceipt(good()).valid,true));
test('parent: fake hash token rejected',()=>{const x=good();x.evidence.sha256='sha256:not-a-hash';assert.equal(app.validateReceipt(x).valid,false);});
test('parent: whitespace CSV formula is neutralized',()=>assert.ok(app.escapeCsvCell(' \t=1+1').startsWith("'")));
test('parent: imported verified claim cannot promote trust',()=>{const x=good();x.review={verified:true,reviewer:'Synthetic'};assert.equal(app.importReceiptText(JSON.stringify(x))[0].review.verified,false);});
test('parent: unknown tool receipt rejected',()=>{const x=good();x.toolId='nonexistent-unlisted-tool';assert.throws(()=>app.importReceiptText(JSON.stringify(x)),/Unknown registry tool/);});
test('parent: missing process exit status rejected',()=>{const x=good();delete x.result.exitCode;assert.equal(app.validateReceipt(x).valid,false);});
test('parent: explicit null for RPC is not a fake process exit',()=>{const x=good();x.result.exitCode=null;assert.equal(app.validateReceipt(x).valid,true);});
test('parent: receipt size bound enforced',()=>assert.throws(()=>app.importReceiptText(' '.repeat(1000001)),/too large/));
test('parent: too many receipts rejected',()=>assert.throws(()=>app.importReceiptText(JSON.stringify(Array.from({length:201},good))),/Too many/));
test('parent: confirm creates REQUESTED only',()=>{const x=app.createRequestArtifact({confirmed:true,toolId:'github-cli',stageId:'review',summary:'Synthetic',justification:'test',status:'COMPLETE'});assert.equal(x.status,'REQUESTED');assert.equal(x.execution,null);assert.equal(x.verified,false);});
test('parent: registry IDs unique and no biology execution claimed',()=>{const r=app.FALLBACK_DATA.registry.entries;assert.equal(new Set(r.map(x=>x.id)).size,r.length);for(const id of ['gtotree','iqtree','defensefinder'])assert.equal(r.find(x=>x.id===id).state,'DECLARED');});
test('parent: fallback JSON is identical to served payloads',()=>{for(const [key,name] of [['registry','data/registry.json'],['chains','data/chains.json'],['evidence','evidence/parent-observations.json']])assert.deepEqual(app.FALLBACK_DATA[key],JSON.parse(fs.readFileSync(path.join(__dirname,'../docs',name),'utf8')));});
test('parent: normalized evidence hashes match actual payloads',()=>{for(const o of app.FALLBACK_DATA.evidence.observations){const b=fs.readFileSync(path.join(__dirname,'../docs',o.evidenceLocation));assert.equal(o.hashSha256,'sha256:'+crypto.createHash('sha256').update(b).digest('hex'));}});
test('parent: frozen public accession input is 177 unique versioned IDs',()=>{const b=fs.readFileSync(path.join(__dirname,'../docs/data/selected_accessions.txt'));const a=b.toString().trim().split(/\r?\n/);assert.equal(a.length,177);assert.equal(new Set(a).size,177);assert.ok(a.every(x=>/^GCF_\d+\.\d+$/.test(x)));const r=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/data/panel_receipt.json')));assert.equal(r.sha256,crypto.createHash('sha256').update(b).digest('hex'));});

test('parent: four ring meanings are the four R-M types',()=>assert.deepEqual(app.FALLBACK_DATA.chains.rings,['Type I','Type II (including Type IIG)','Type III','Type IV']));
