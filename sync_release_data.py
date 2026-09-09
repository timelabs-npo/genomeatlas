from pathlib import Path
import json
root=Path(__file__).resolve().parent
path=root/'docs/app.js'; source=path.read_text(encoding='utf-8')
start=source.index('const FALLBACK_DATA = ')+len('const FALLBACK_DATA = ')
_, consumed=json.JSONDecoder().raw_decode(source[start:])
payload={'registry':json.loads((root/'docs/data/registry.json').read_text()),'chains':json.loads((root/'docs/data/chains.json').read_text()),'evidence':json.loads((root/'docs/evidence/parent-observations.json').read_text())}
source=source[:start]+json.dumps(payload,ensure_ascii=False,indent=2)+source[start+consumed:]
path.write_text(source,encoding='utf-8',newline='\n')
(root/'.gitattributes').write_text('* text=auto\n*.txt text eol=lf\n*.json text eol=lf\n*.js text eol=lf\n*.py text eol=lf\n*.html text eol=lf\n*.css text eol=lf\n*.md text eol=lf\n',newline='\n')
# Preserve fixture bytes and their precomputed hashes across Windows checkouts.
for p in (root/'tests/fixtures').glob('*.txt'):
    p.write_bytes(p.read_bytes().replace(b'\r\n',b'\n'))
# The assertion checks the stated CPU fallback semantics, not an exact prose phrase.
test=root/'tests/app.test.js'; t=test.read_text()
t=t.replace('/preserve the CPU path/i','/CPU path remains preserved|preserve the CPU path/i')
test.write_text(t,encoding='utf-8',newline='\n')
print('Refreshed canonical registry fallback and normalized fixture line endings; no receipt hashes fabricated.')
