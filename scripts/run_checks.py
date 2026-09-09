"""Record bounded local checks. Browser attempts are separate and never implied."""
import argparse
import datetime
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def sanitize(value):
    return value.replace(str(ROOT), "<repository>").replace(ROOT.as_posix(), "<repository>")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--browser", action="store_true", help="Also attempt the installed Chromium smoke script; only use where browser access is permitted.")
    args = parser.parse_args()
    commands = [
        ["python", "--version"], ["node", "--version"], ["git", "--version"],
        ["python", "scripts/build_data.py", "--check"],
        ["python", "scripts/verify.py"],
        ["python", "-m", "unittest", "discover", "-s", "tests", "-v"],
        ["node", "--test", "tests/contracts.test.js", "tests/contracts.test.cjs"],
        ["node", "--check", "docs/contracts.js"],
        ["node", "--check", "docs/app.js"],
        ["node", "--check", "docs/data.js"],
        ["node", "--check", "tests/browser-smoke.js"],
        ["node", "--check", "scripts/browser_smoke.mjs"],
        ["python", "-c", "import ast,pathlib; files=list(pathlib.Path('scripts').glob('*.py'))+list(pathlib.Path('tests').glob('*.py')); [ast.parse(p.read_text(encoding='utf-8'),filename=str(p)) for p in files]; print('PASS: Python syntax for',len(files),'files')"],
        ["git", "diff", "--check"],
    ]
    if args.browser:
        commands.append(["node", "scripts/browser_smoke.mjs"])
    results = []
    for command in commands:
        started = now()
        actual = [sys.executable, *command[1:]] if command[0] == "python" else command
        try:
            run = subprocess.run(actual, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=45)
            code, stdout, stderr = run.returncode, run.stdout, run.stderr
        except subprocess.TimeoutExpired:
            code, stdout, stderr = 124, "", "Bounded check timed out after 45 seconds"
        except OSError as error:
            code, stdout, stderr = 127, "", type(error).__name__ + ": executable unavailable"
        row = dict(command=subprocess.list2cmdline(command), started_at=started, finished_at=now(), exit_code=code,
                   state="PASSED" if code == 0 else ("NOT_TESTED" if code in {2, 77, 127} else "FAILED"),
                   stdout=sanitize(stdout.strip()), stderr=sanitize(stderr.strip()))
        results.append(row)
        print(row["command"], "exit=" + str(code), row["state"], flush=True)
        if code:
            print(row["stdout"], row["stderr"], flush=True)
    browser_path = ROOT / "evidence/chromium-smoke.json"
    browser_attempt = json.loads(browser_path.read_text()) if browser_path.exists() else None
    core_passed = all(row["exit_code"] == 0 for row in results)
    record = dict(origin="LOCAL_TEST_EXECUTION", checked_at=now(), core_checks_state="PASSED" if core_passed else "FAILED", checks=results,
                  browser_assertions="PASSED" if args.browser and results[-1]["exit_code"] == 0 else "NOT_TESTED",
                  prior_browser_attempt=browser_attempt,
                  browser_limitation="Prior Edge and Chrome attempts returned no assertions; browser automation URL policy blocked local preview. See evidence/browser-policy.json. No browser rerun is implied by syntax validation.",
                  not_biological_receipts=True)
    for relative in ["evidence/checks.json", "docs/evidence/local-verification.json"]:
        target = ROOT / relative
        target.parent.mkdir(exist_ok=True, parents=True)
        target.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    return 0 if core_passed else 1

if __name__ == "__main__":
    raise SystemExit(main())

raise SystemExit(1 if any(r["state"] == "FAILED" for r in results) else 0)
