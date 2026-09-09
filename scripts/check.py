"""Run bounded checks and retain real command transcripts, including failures."""
import datetime
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidence'


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')


def redact(text):
    text = text.replace(str(ROOT), '<REPO>').replace(ROOT.as_posix(), '<REPO>')
    text = re.sub(r'(?i)[A-Z]:[\\/]Users[\\/][^\s:]+', '<LOCAL_PATH>', text)
    return re.sub(r'/home/[^\s:]+', '<LOCAL_PATH>', text)


def run(command, label, timeout=90):
    started = utc()
    try:
        result = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=timeout,
                                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        code, stdout, stderr = result.returncode, result.stdout, result.stderr
    except (OSError,subprocess.TimeoutExpired) as error:
        code, stdout, stderr = None, '', str(error)
    safe_stdout, safe_stderr = redact(stdout), redact(stderr)
    index = len(records) + 1
    stem = f'check-{run_id}-{index:02}-{label}'
    stdout_file = f'evidence/{stem}.stdout.txt'
    stderr_file = f'evidence/{stem}.stderr.txt'
    (ROOT / stdout_file).write_text(safe_stdout,encoding='utf-8',newline='\n')
    (ROOT / stderr_file).write_text(safe_stderr,encoding='utf-8',newline='\n')
    record = {'command':command,'cwd_alias':'REPO','started_at_utc':started,'finished_at_utc':utc(),'exit_code':code,
              'scope':'LOCAL_SITE_CHECK_SYNTHETIC_INPUTS_WHERE_LABELLED','stdout':safe_stdout,'stderr':safe_stderr,
              'stdout_path':stdout_file,'stderr_path':stderr_file,'redaction_applied':safe_stdout != stdout or safe_stderr != stderr,
              'stdout_sha256':hashlib.sha256(safe_stdout.encode()).hexdigest(),'stderr_sha256':hashlib.sha256(safe_stderr.encode()).hexdigest()}
    records.append(record)
    print(f'{label}: exit={code}',flush=True)
    if safe_stdout:
        print(safe_stdout, end='' if safe_stdout.endswith('\n') else '\n',flush=True)
    if safe_stderr:
        print(safe_stderr, end='' if safe_stderr.endswith('\n') else '\n',flush=True)
    return code == 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--skip-browser', action='store_true', help='Run non-browser checks only and record browser NOT_TESTED')
    args = parser.parse_args()
    EVIDENCE.mkdir(exist_ok=True)
    run_id = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    records = []
    commands = [(['python','--version'],'python-version'),(['node','--version'],'node-version'),
                (['python','scripts/build.py'],'build'),(['python','-m','unittest','discover','-s','tests','-v'],'python-tests'),
                (['node','--check','assets/app.mjs'],'js-syntax'),(['node','--test','tests/core.test.mjs'],'js-tests'),
                (['python','scripts/package.py'],'static-package')]
    if not args.skip_browser:
        commands.append((['node','scripts/browser-smoke.mjs'],'browser-smoke'))
    success = True
    for command,label in commands:
        ok = run(command,label)
        success = ok and success
        if label == 'build' and not ok:
            break
    result = {'schema':'genomeatlas.local-check-run/1','run_id':run_id,'status':'PASS' if success else 'FAIL',
              'browser_status':'NOT_TESTED' if args.skip_browser else ('SEE_BROWSER_REPORT'),
              'records':records,'not_tested':['Biological workflows','GPU/CPU output parity','Paid APIs','Native Sites authentication/save/deploy'] + (['Browser checks explicitly skipped; see evidence/browser-access.json'] if args.skip_browser else [])}
    serialized = json.dumps(result,indent=2) + '\n'
    (EVIDENCE / f'checks-{run_id}.json').write_text(serialized,encoding='utf-8')
    (EVIDENCE / 'checks-latest.json').write_text(serialized,encoding='utf-8')
    raise SystemExit(0 if success else 1)
