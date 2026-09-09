# GenomeAtlas Site Helper Suite

The original README and LICENSE are preserved. This implementation runs entirely
as a static site with plain HTML, CSS and ES modules. It uses the supplied source
JSON, not a fabricated biological dataset. Python build and tests use the standard
library. Node 24 is only needed for JavaScript checks and the optional installed
browser smoke test; no npm install is required.

## Local use

```text
python scripts/build.py
python scripts/serve.py --port 8787
```

Open `http://127.0.0.1:8787/`. ES modules require an HTTP server; directly opening
index.html with a file URL is not supported. A checked-in generated data module
also makes source previews over HTTP possible. The build regenerates it from
the supplied JSON and writes only allowlisted public files to `dist/`.

## Checks

```text
python scripts/check.py
```

This session's browser access was declined by the browser security policy after
two isolated command-line Chrome attempts crashed. No screenshot was obtained.
Do not rerun browser checks in this session. Non-browser checks can be repeated
with `python scripts/check.py --skip-browser`; skipping is recorded as NOT_TESTED.
Ubuntu execution was also blocked by `Wsl/Service/E_ACCESSDENIED`.

This records command arguments, exact stdout/stderr (redacted if a local root is
printed), UTC timestamps, exit codes and output hashes under `evidence/`.
The suite checks real source data, plus explicitly labelled synthetic negative
fixtures. `node scripts/browser-smoke.mjs` uses an installed Chrome or Edge in a
new isolated headless profile inside the repository. It uses Node's built-in
WebSocket client and the browser's documented DevTools protocol; it never reads
an existing browser profile or cookies. It starts only a loopback static server,
does not install packages and records actual screenshots.

## Data and trust

- Registry flags and legacy probe receipts remain source claims. No imported
  record can mutate the frozen snapshot or current-session tool discovery.
- Task requests are intent only and stay in memory until explicitly exported.
  No execute backend, arbitrary shell input or deployment action exists.
- JSON preview is size/depth bounded, rejects reserved keys, validates against
  strict machine-readable schemas and renders with text nodes. Export names are
  fixed by the application. Unchanged original datasets can be round-tripped;
  changed source snapshots have no replacement route.
- Hash syntax is validated; actual artifacts are not supplied to the preview,
  so their contents and hash claims are not independently verified.
- All biological chains remain PROPOSED_NOT_EXECUTED. Metadata is NOT_REFRESHED.
  Accession syntax/uniqueness cannot establish taxonomy or no-Enterococcus status.
- The figure workflow specifies I, II (including IIG), III and IV rings without
  inventing topology or measurements. White/not-detected requires a successful,
  adequate analysis; failed, missing and unrun states remain explicit.

## Native Sites handoff

Actual exposed native Sites tool names are recorded in
`evidence/native-tools.json`. They are available but have not been invoked;
authentication, save and deployment remain NOT_TESTED. This task is explicitly
local-only. There is no Site project ID, pushed source commit, version receipt
or deployment URL to report. No `.openai/hosting.json` is fabricated.

`dist/index.html` and its relative assets are prepared as static site source.
`python scripts/package.py` packages these public files into
`evidence/genomeatlas-static.zip`, verifies every manifest hash and archive CRC,
and records `evidence/static-package.json`. This generic static ZIP is not a
native Sites deployment archive or saved version.
Actual Sites packaging/provisioning must use the parent's exposed native
workflow and a real project identifier. Deployment compatibility has not been
tested. If native tools are missing in that session, record
BLOCKED_NATIVE_SITE_ACTION. GitHub Pages is not native Sites.

BUILD prepared the source; VERIFY is represented by the independently runnable
test scripts and browser checks; DOC records evidence and limitations. Parent
review remains required, and CUT/publishing is reserved for the parent. No
independent second-agent review is claimed.
