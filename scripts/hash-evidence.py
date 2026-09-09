"""Create/verify relative-path SHA-256 evidence; never walk private runtime data."""
import hashlib, pathlib, sys
root=pathlib.Path(__file__).resolve().parents[1]
manifest=root/'evidence/SHA256SUMS.txt'
paths=[]
for folder in ['docs','tests','scripts','evidence']:
    paths.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p!=manifest)
paths.extend(root/name for name in ['README.md','LICENSE','THIRD_PARTY_NOTICES.md','SECURITY.md','package.json','.gitignore','.gitattributes'])
text=''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(root).as_posix()}\n' for p in sorted(paths))
if '--verify' in sys.argv:
    if manifest.read_text(encoding='utf-8')!=text: raise SystemExit('FAIL: evidence path/hash mismatch')
    print(f'PASS: {len(paths)} relative-path hashes verified')
else:
    manifest.write_text(text,encoding='utf-8')
    print(f'Wrote {len(paths)} relative-path SHA-256 entries')
