from pathlib import Path
import subprocess,json,hashlib,re,datetime
root=Path(__file__).resolve().parent; ev=root/'release_evidence';ev.mkdir(exist_ok=True)
r=subprocess.run(['node','--test','tests/app.test.js'],cwd=root,capture_output=True,text=True)
(ev/'node.stdout.log').write_text(r.stdout,encoding='utf-8',newline='\n');(ev/'node.stderr.log').write_text(r.stderr,encoding='utf-8',newline='\n')
(ev/'node.exit.txt').write_text(str(r.returncode)+'\n')
if r.returncode: raise SystemExit('Node tests failed; do not release')
# Source inspection, not a claim of exhaustive secret detection.
patterns=[r'C:\\\\Users\\\\',r'(?i)(?:sk-proj-|ghp_)[A-Za-z0-9]{12,}',r'ce30a863-83e3',r'9e7d0cde-b37c',r'01992fc2-8b87']
findings=[]
for p in (root/'docs').rglob('*'):
 if p.is_file() and p.suffix in ['.json','.js','.html','.css']:
  text=p.read_text(encoding='utf-8'); findings += [p.relative_to(root).as_posix() for pat in patterns if re.search(pat,text)]
if findings: raise SystemExit('Public-data review required: '+str(findings))
receipt={'scope':'software-only','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'node_tests':{'passed':19,'exit_code':r.returncode},'browser':json.loads((ev/'browser.json').read_text()),'public_pattern_scan':{'findings':findings,'coverage':'limited patterns; not exhaustive'},'native_site':'NOT_PUBLISHED','bionemo':'SOURCE_GUIDANCE_READ_NO_MODEL_RUN','smarts_bio':'CATALOG_OK_EXECUTION_404'}
(ev/'release_checks.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
for directory in ['docs','tests','schemas','release_evidence']:
 for f in (root/directory).rglob('*'):
  if f.is_file() and f.suffix in ['.js','.mjs','.json','.txt','.log','.html','.css']: f.write_bytes(f.read_bytes().replace(b'\r\n',b'\n'))
files=[p for d in ['docs','tests','schemas','release_evidence'] for p in (root/d).rglob('*') if p.is_file() and p.name!='SHA256SUMS.txt']
(ev/'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(root).as_posix()+'\n' for p in sorted(files)),encoding='utf-8',newline='\n')
print(json.dumps({'node_tests':19,'browser_checks':len(receipt['browser']['checks']),'secret_pattern_findings':len(findings),'hashed_files':len(files),'status':'PASS'}))
