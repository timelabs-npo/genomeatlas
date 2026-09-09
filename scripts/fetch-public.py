"""Fetch only explicitly bounded public records through gh; never execute source text."""
import base64, hashlib, json, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = 'serg-alexv/genomeops-atlas'
MAIN = '0f139f96494e09ff0387d2b4979318288c6cf54e'
SOURCES = [
    ('main-status', MAIN, 'analyses/lab-rm-phylogenomics/STATUS.md'),
    ('stage1-journal', MAIN, 'analyses/lab-rm-phylogenomics/results/STAGE1_2026-08-26.md'),
    ('pr27-review', '7c27865b7113b0fe8b22a57a751ed82fdaae9c8a', 'analyses/lab-rm-phylogenomics/results/evidence_gate_review/INDEPENDENT_REVIEW.md'),
    ('pr28-receipt', 'f5b13cafe3f865a291d9539e6c7dc5ebd66ebce3', 'analyses/lab-rm-phylogenomics/tool-atlas/PARENT_DELIVERY_RECEIPT.md'),
    ('selected-accessions', MAIN, 'analyses/lab-rm-phylogenomics/config/selected_accessions_stage1.txt'),
]
calls=[]
def api(endpoint):
    result = subprocess.run(['gh', 'api', endpoint], capture_output=True, timeout=45)
    calls.append({'command':['gh','api',endpoint],'exitCode':result.returncode})
    if result.returncode: raise RuntimeError('gh public metadata request failed')
    return json.loads(result.stdout)

if api(f'repos/{REPO}')['visibility'] != 'public':
    raise SystemExit('Refusing nonpublic source')
manifest = []
for sid, commit, path in SOURCES:
    try:
        response = api(f'repos/{REPO}/contents/{path}?ref={commit}')
        data = base64.b64decode(response['content'], validate=False)
        if len(data) > 150_000: raise ValueError('Source exceeds bound')
        # Journals are read locally for a sanitized summary, not copied to the site.
        (ROOT / '.source-cache').mkdir(exist_ok=True)
        destination = ROOT / '.source-cache' / (sid + '.txt')
        if sid == 'selected-accessions': destination = ROOT / 'docs/sources/selected_accessions_stage1.txt'
        destination.write_bytes(data)
        manifest.append(dict(id=sid, commit=commit, path=path, url=f'https://github.com/{REPO}/blob/{commit}/{path}', sha256=hashlib.sha256(data).hexdigest(), bytes=len(data), status='fetched', local=destination.relative_to(ROOT).as_posix() if sid=='selected-accessions' else None, interpretation='Historical source, not a live scientific result'))
    except Exception as exc:
        manifest.append(dict(id=sid, commit=commit, path=path, status='blocked', reason=str(exc)))
(ROOT / 'docs/data/source-manifest.json').write_text(json.dumps({'repository':REPO,'main':MAIN,'sources':manifest}, indent=2)+'\n', encoding='utf-8')
(ROOT / 'evidence/source-fetch.json').write_text(json.dumps({'wrapper':'python scripts/fetch-public.py','calls':calls},indent=2)+'\n',encoding='utf-8')
print(json.dumps(manifest, indent=2))
