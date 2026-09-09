#!/usr/bin/env python3
"""One-time release migration. Runs only in a clean candidate worktree; no secrets."""
import hashlib,json,re,subprocess,datetime,secrets
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DOC=ROOT/'docs'
if not (ROOT/'LICENSE').exists(): raise SystemExit('Not a GenomeAtlas checkout')
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,x): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(b): return hashlib.sha256(b).hexdigest()
app=DOC/'app.js';text=app.read_text(encoding='utf-8')
old=r'/^sha256:[A-Za-z0-9._-]+$/'
assert old in text,'Expected original digest validator missing; inspect rather than overwrite'
text=text.replace(old,r'/^sha256:[a-fA-F0-9]{64}$/').replace('evidence.sha256 must be present as a sha256: token.','evidence.sha256 must be sha256: followed by exactly 64 hexadecimal characters; this checks format, not truth.')
text=text.replace(r'/^[=+\-@]/',r'/^[\s]*[=+\-@]/')
text=text.replace('if (!Number.isInteger(receipt.result.exitCode)) {','if (!Object.hasOwn(receipt.result, "exitCode") || (receipt.result.exitCode !== null && !Number.isInteger(receipt.result.exitCode))) {').replace('result.exitCode must be an integer.','result.exitCode must be an integer or explicit null for non-process probes.')
schema=load(ROOT/'schemas/probe.schema.json');schema['properties']['version']['pattern']=r'^1\.0\.0$';schema['properties']['evidence']['properties']['sha256']['pattern']=r'^sha256:[a-fA-F0-9]{64}$';schema['properties']['result']['properties']['exitCode']['type']=['integer','null'];save(ROOT/'schemas/probe.schema.json',schema)
# Valid synthetic examples must use syntactically valid digests. Missing-hash fixtures remain missing.
for p in list((ROOT/'tests/fixtures').glob('*.json'))+[ROOT/'tests/app.test.js']:
 s=p.read_text(encoding='utf-8');s=re.sub(r'sha256:([A-Za-z0-9._-]+)',lambda m:'sha256:'+digest(m.group(1).encode()) if len(m.group(1))!=64 else m.group(0),s);p.write_text(s,encoding='utf-8')
# Source receipts are normalized and explicitly not cryptographic attestations.
public_sources=[]
def observation(oid,tool,state,classification,summary,details,exit_code=None,timestamp=None):
 ts=timestamp or now();source={'schema':'genomeatlas-normalized-probe-v1','id':oid,'toolId':tool,'observedAt':ts,'state':state,'classification':classification,'exitCode':exit_code,'summary':summary,'details':details,'scope':'capability/control probe, not biological analysis','attestation':'parent-recorded; external review still required'}
 p=DOC/'evidence'/(oid+'.json');save(p,source);public_sources.append(source)
 return {'id':oid,'toolId':tool,'state':state,'timestamp':ts,'evidenceLocation':'evidence/'+p.name,'hashSha256':'sha256:'+digest(p.read_bytes()),'classification':classification,'exitCode':exit_code,'summary':summary}
obs=[]
obs.append(observation('rdc-pong','rdc','PROBED','DETECTED','Authorized WD endpoint returned pong.','Remote Desktop Commander ping response; no personal endpoint identifiers published.',timestamp='2026-09-09T14:34:03.065Z'))
# Fresh Windows-to-Ubuntu-to-Windows microtest, restricted to this worktree and /tmp.
nonce=secrets.token_hex(12);temp=ROOT/'.private-probes';temp.mkdir(exist_ok=True);payload=temp/'windows.txt';payload.write_text('GENOMEATLAS:'+nonce,encoding='ascii')
linux='/mnt/'+payload.drive[0].lower()+str(payload)[2:].replace('\\','/')
code="import pathlib,hashlib,json,sys,platform; b=pathlib.Path(sys.argv[1]).read_bytes();r={'nonce':sys.argv[2],'input_sha256':hashlib.sha256(b).hexdigest(),'kernel':platform.release()};p=pathlib.Path('/tmp/genomeatlas-'+sys.argv[2]+'.json');p.write_text(json.dumps(r));print(p.read_text())"
try:
 r=subprocess.run(['wsl.exe','-d','Ubuntu','--','python3','-c',code,linux,nonce],capture_output=True,text=True,timeout=45);reply=json.loads(r.stdout);ok=r.returncode==0 and reply['nonce']==nonce and reply['input_sha256']==digest(payload.read_bytes());details={'nonce_matches':reply['nonce']==nonce,'sha256_matches':reply['input_sha256']==digest(payload.read_bytes()),'kernel':reply['kernel'],'windows_payload_sha256':digest(payload.read_bytes()),'test_kind':'real cross-runtime file-exchange control'}
 obs.append(observation('wsl-roundtrip','wsl-ubuntu','EXECUTED' if ok else 'BLOCKED','DETECTED' if ok else 'FAILED','Actual Windows payload read in Ubuntu; Ubuntu /tmp response read back by Windows.',details,r.returncode))
except Exception as e: obs.append(observation('wsl-roundtrip','wsl-ubuntu','BLOCKED','FAILED','Cross-runtime probe failed.',str(e)))
try:
 r=subprocess.run(['gh','api','repos/timelabs-npo/genomeatlas','--jq','.permissions'],capture_output=True,text=True,timeout=30);ok=r.returncode==0;details={'repository':'timelabs-npo/genomeatlas','permissions':json.loads(r.stdout) if ok else None,'error':r.stderr[:500] if not ok else None};obs.append(observation('github-read','github-cli','EXECUTED' if ok else 'BLOCKED','DETECTED' if ok else 'FAILED','Authenticated repository-permission read through GitHub CLI.',details,r.returncode))
except Exception as e: obs.append(observation('github-read','github-cli','BLOCKED','FAILED','GitHub CLI read failed.',str(e)))
obs.append(observation('copilot-parent-tests','copilot','EXECUTED','DETECTED','Parent independently ran node --test on Copilot PR2 exact head: 8 passed. Two extra challenges failed before this repair.','Source 2e5d87afcaadaab2bfe9c2199f363c2afee42df1; failed challenges: non-hex hash token and whitespace-prefixed CSV formula. Final repaired tests are separate evidence.',0,timestamp='2026-09-09T14:56:18.140Z'))
obs.append(observation('codex-sites-probe','codex-cli-session','EXECUTED','DETECTED','A real new WD Codex session ran native Sites read-only discovery and listing.','Native Sites listed an owner site; listing succeeded. A later build session was blocked before source save. No genomic run. Private thread receipts retained by owner.',0,timestamp='2026-09-09T14:44:57.101Z'))
obs.append(observation('native-sites-blocker','native-chatgpt-sites','BLOCKED','UNKNOWN','Native owner site exists at version 0; no deployment.','Sites save-version requires a pushed source-repository HEAD. Codex shell execution is prohibited and no native source-edit/push action was exposed. No policy bypass attempted.',None,timestamp='2026-09-09T14:52:52.802Z'))
obs.append(observation('smarts-tool-404','smarts-bio','BLOCKED','FAILED','Authenticated workspace listing succeeded, but advertised GC tool returned 404.','bioinformatics.gcContent on synthetic ACGTACGT could not execute. smarts_query independently reported BLOCKED. No tool output exists.'))
obs.append(observation('bionemo-skill-source','bionemo-nim','DISCOVERED','UNKNOWN','NVIDIA BioNeMo official genomics-workflow-acceleration skill was read; runtime not executed.','Skill v1.1.0, Git blob 9efa9a24a44d0d84ba0b7fd20b550ae293174f5e. Preserve CPU paths; GPU alternatives default off; no mapping invented for GToTree/IQ-TREE/DefenseFinder. Canonical plugin dependency lookup failed plugin_not_found.'))
reg=load(DOC/'data/registry.json');reg['generatedAt']=now();by={o['toolId']:o for o in obs}
for entry in reg['entries']:
 o=by.get(entry['id']);entry['layer']='external-tool' if entry['id'] in ['ncbi-datasets','gtotree','hmmer','alignment-trimming','iqtree','defensefinder'] else 'connector-or-skill'
 if o: entry.update(state=o['state'],probeTimestamp=o['timestamp'],evidenceLocation=o['evidenceLocation'],notes=o['summary'])
 else: entry.update(state='DECLARED',probeTimestamp=None,evidenceLocation='data/registry.json#'+entry['id'],notes='Catalogued route only; no successful runtime probe is claimed.')
# Optional generic catalog: no account tokens, private paths, connection inventories or scientific claims.
extras=['BioRender','Consensus','Elicit','Undermind','Hugging Face','Proto','Rowan','Tamarind Bio','UniProt','RCSB PDB','AlphaFold DB','NCBI Entrez','Academic Writing Toolkit','Adobe','Canva','Figma','Google Drive','Files','Trae','Antigravity']
existing={e['id'] for e in reg['entries']}
for name in extras:
 tid=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
 if tid not in existing: reg['entries'].append({'id':tid,'name':name,'category':'optional-catalog','layer':'catalog-only','state':'DECLARED','stageIds':['review'],'probeTimestamp':None,'evidenceLocation':'data/registry.json#'+tid,'inputContract':'Explicitly selected public or owner-authorized project data only.','outputContract':'Tool-specific result with real source and receipt; discover schema before execution.','notes':'Catalogued optional route, not proof of installation, authentication or execution on this device.'})
reg['disclaimer']='Catalogued is not connected; connected is not executed; execution is not scientific validation.';save(DOC/'data/registry.json',reg)
evidence={'version':'1.0.1','historical':True,'redacted':True,'observations':obs};save(DOC/'evidence/parent-observations.json',evidence)
chains=load(DOC/'data/chains.json')
# Keep zero-network fallback identical to the auditable JSON files.
marker='  const FALLBACK_DATA = ';start=text.index(marker)+len(marker);_,used=json.JSONDecoder().raw_decode(text[start:]);text=text[:start]+json.dumps({'registry':reg,'chains':chains,'evidence':evidence},indent=2)+text[start+used:];app.write_text(text,encoding='utf-8')
# Index: emphasize scientific and deployment boundary. No fake metrics.
p=DOC/'index.html';s=p.read_text();s=s.replace('sha256:example-proof-hash','sha256: followed by 64 hexadecimal characters');s=s.replace('<section class="panel" data-flow>', '<section class="panel" aria-label="Deployment boundary"><h2>Execution is not acceptance</h2><p>Real WD and native Codex capability probes are recorded below. Native ChatGPT Site source sync remains blocked: the owner site has no saved version or live URL. This portable source is not a native deployment. No host tree or R-M prevalence is fabricated.</p><p>Original timelabs-npo code: MIT. Third-party references retain their own terms. Imports stay local; a request never starts a job.</p></section>\n<section class="panel" data-flow>');p.write_text(s,encoding='utf-8')
(ROOT/'.gitignore').write_text('.private-probes/\nnode_modules/\n*.zip\n__pycache__/\n',encoding='utf-8')
(DOC/'NATIVE_SITES_HANDOFF.md').write_text('# Native deployment gate\n\nA real native owner Site exists, but latest version is 0. No deployment URL exists. Native save requires source pushed to the configured Site repository. The WD Codex session cannot execute its shell under its current policy. Do not use bypass flags or leak write credentials. Use a normally authorized Sites-capable workspace to sync this audited static source, save a real version, inspect build and browser results, then deploy and retain the returned URL and source revision. GitHub Pages is a separate optional distribution channel and is not called ChatGPT Sites.\n',encoding='utf-8')
(ROOT/'THIRD_PARTY_NOTICES.md').write_text('# Third-party boundaries\n\nOriginal GenomeAtlas code is MIT. BioNeMo guidance: NVIDIA-BioNeMo/bionemo-agent-toolkit, genomics-workflow-acceleration v1.1.0, CC BY 4.0 documentation / Apache-2.0 source. We reference its off-by-default acceleration and compare-before-production practices; no BioNeMo code, model, weight or runtime is bundled. AlphaGenome: google-deepmind/alphagenome, Apache-2.0 software / CC BY 4.0 documentation; we use original implementations of typed input, versioned output and bounded retry patterns. Human regulatory predictions do not replace LAB marker phylogeny or R-M detection. API/model/data terms remain separate.\n',encoding='utf-8')
print(json.dumps({'migration':'applied','registry_entries':len(reg['entries']),'actual_normalized_probes':len(obs),'native_site_deployed':False,'biological_analysis_completed':False}))
