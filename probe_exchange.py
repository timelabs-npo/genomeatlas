from pathlib import Path
import subprocess,tempfile,secrets,hashlib,json,datetime
root=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='genomeatlas-nonce-') as td:
    p=Path(td); nonce=secrets.token_hex(24); (p/'request.txt').write_text(nonce,encoding='ascii')
    helper="from pathlib import Path\nimport hashlib,json,platform\np=Path(__file__).parent\nb=(p/'request.txt').read_bytes()\nr={'request_sha256':hashlib.sha256(b).hexdigest(),'ubuntu_kernel':platform.release(),'response':'ubuntu-ack-'+hashlib.sha256(b).hexdigest()}\n(p/'response.json').write_text(json.dumps(r))\nprint(json.dumps(r))\n"
    (p/'probe.py').write_text(helper,encoding='utf-8')
    wp=subprocess.run(['wsl.exe','-d','Ubuntu','--','wslpath','-a',(p/'probe.py').as_posix()],capture_output=True,text=True,timeout=20)
    if wp.returncode: raise SystemExit('WSL path conversion failed: '+wp.stderr)
    q=subprocess.run(['wsl.exe','-d','Ubuntu','--','python3',wp.stdout.strip()],capture_output=True,text=True,timeout=30)
    receipt={'schema':'genomeatlas-check/v1','check':'windows_ubuntu_bidirectional_nonce','scope':'software-connectivity-not-biological','utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':q.returncode}
    if q.returncode: receipt.update(status='FAIL',error=q.stderr[:300])
    else:
        result=json.loads((p/'response.json').read_text()); expected=hashlib.sha256(nonce.encode()).hexdigest()
        receipt.update(status='PASS' if result['request_sha256']==expected and result['response']=='ubuntu-ack-'+expected else 'FAIL',request_sha256=expected,ubuntu_kernel=result['ubuntu_kernel'],response_sha256=hashlib.sha256((p/'response.json').read_bytes()).hexdigest())
    dest=root/'release_evidence';dest.mkdir(exist_ok=True)
    (dest/'windows_ubuntu_roundtrip.json').write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt));raise SystemExit(0 if receipt['status']=='PASS' else 1)
