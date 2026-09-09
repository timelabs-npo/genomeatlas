"""Package the validated static output only; this is not a native Sites version."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def package():
    dist = ROOT / 'dist'
    manifest = json.loads((dist / 'manifest.json').read_text(encoding='utf-8'))
    files = sorted(list(manifest) + ['manifest.json'])
    contents = {}
    for name in files:
        source = (dist / name).resolve()
        if not source.is_relative_to(dist.resolve()):
            raise ValueError('Archive input escapes static output')
        contents[name] = source.read_bytes()
        if name in manifest and hashlib.sha256(contents[name]).hexdigest() != manifest[name]:
            raise ValueError(f'Manifest mismatch for {name}')
    target = ROOT / 'evidence/genomeatlas-static.zip'
    if target.is_symlink():
        raise ValueError('Refusing symlink output')
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for name in files:
            info = zipfile.ZipInfo(name,date_time=(2000,1,1,0,0,0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info,contents[name])
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None or archive.namelist() != files:
            raise ValueError('Archive verification failed')
    receipt = {'schema':'genomeatlas.static-package/1','state':'LOCAL_STATIC_PACKAGE_NOT_DEPLOYED',
               'path':'evidence/genomeatlas-static.zip','sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
               'file_count':len(files),'files':files,'native_site_version':None,'native_compatibility':'NOT_TESTED'}
    (ROOT / 'evidence/static-package.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(f'Packaged and CRC-verified {len(files)} static files: evidence/genomeatlas-static.zip')
    print('Native Sites compatibility / version / deployment: NOT_TESTED / none / NOT_DEPLOYED')


if __name__ == '__main__':
    package()
