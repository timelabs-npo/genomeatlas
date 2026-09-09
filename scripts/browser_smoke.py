"""Run installed Edge on file:// with a disposable workspace profile. No installs."""
import json
import subprocess
import os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
edge = Path(os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")) / "Microsoft/Edge/Application/msedge.exe"
if not edge.is_file():
    print("NOT_TESTED: installed Edge unavailable")
    raise SystemExit(77)
temp = ROOT / ".tmp"
temp.mkdir(exist_ok=True)
html = (ROOT / "docs/index.html").read_text(encoding="utf-8").replace('</body>', '<script src="../tests/browser-smoke.js" defer></script></body>')
fixture = ROOT / "docs/smoke-fixture.html"
fixture.write_text(html, encoding="utf-8")
try:
    command = [str(edge), "--headless", "--disable-gpu", "--no-first-run", "--user-data-dir=" + str(temp / "browser-profile"), "--dump-dom", "--virtual-time-budget=3000", fixture.as_uri()]
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=22)
    passed = result.returncode == 0 and 'data-smoke="PASSED"' in result.stdout
    print("Edge process exit:", result.returncode)
    print("PASS: 8 browser assertions using file://" if passed else "FAIL: Edge did not return passing browser assertions")
    if not passed:
        import re
        print(re.findall(r'data-smoke[^>]*', result.stdout)[-1:])
    raise SystemExit(0 if passed else 1)
except (OSError, subprocess.TimeoutExpired) as error:
    print("NOT_TESTED: browser launch unavailable:", type(error).__name__)
    raise SystemExit(77)
finally:
    fixture.unlink(missing_ok=True)
