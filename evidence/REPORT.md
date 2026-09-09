# GenomeAtlas implementation evidence — 2026-09-09

The seven-view static suite is implemented under `docs/` on `feat/site-helper-suite-20260909`. Repository owner/product: `timelabs-npo/genomeatlas`. No dependencies installed, scientific jobs started, credentials read, global/device/remote settings changed, pushes or merges performed.

**HEAD remains `9b7c396f7f40efc9d7b943920affba47a366bb2b`.** The implementation is an unstaged working-tree delivery: staging failed with `.git/index.lock: Permission denied` because Git metadata is read-only in this sandbox. The failed command and exit code are preserved in `git-status.json`. Do not interpret the base commit as containing this implementation. `changed-files.txt` lists its exact files; `SHA256SUMS.txt` hashes their bytes and this evidence using relative paths.

## Actual checks

| Check | Exact command | Actual result |
|---|---|---|
| Unit/security/scientific validation | `node --test --test-reporter=tap tests/core.test.mjs`, captured by `node scripts/test.mjs` | 60 tests, 60 passed, 0 failed, 0 skipped; exit 0 |
| Local serving | `python -m http.server 8765 --bind 127.0.0.1 --directory docs` | Served assets on loopback for HTTP checks |
| HTTP assets and isolation | `node scripts/http-check.mjs` | 19 HTTP status checks plus module-MIME and CSP assertions; exit 0 |
| Static structure/license/contrast | `python scripts/static-check.py` | 11 source/computed checks; exit 0; not a browser accessibility audit |
| JS syntax | `node --check docs/app.mjs` and `node --check docs/core.mjs` | Both exit 0 |
| Tracked whitespace diff | `git diff --check` | Exit 0; this command alone does not inspect untracked files |
| Public provenance | `python scripts/fetch-public.py` | Six bounded gh requests including public visibility check; all exit 0; five requested source files fetched |
| Parent projection | `node scripts/sync-probes.mjs` | Supported parent snapshot validated and sanitized; exit 0; never written back to input |
| Hash integrity | `python scripts/hash-evidence.py --verify` | Exact current payload paths and bytes checked; see verification command output supplied with delivery |

TAP, stderr and command metadata are in `unit-tests.tap`, `unit-tests.stderr.log`, `unit-test-command.json`. HTTP, static and source fetch logs are separate JSON records. A passing import test proves rejection/shape/trust handling, not biological truth. The frozen file has 177 unique versioned RefSeq accessions; this does not independently verify group membership or taxonomy.

## Browser and native Site

CUA selected the exposed Chrome extension browser. `tab.goto('http://127.0.0.1:8765')` was rejected because browser permission was declined. No workaround, alternate browser surface, raw CDP or indirect rendering was attempted. Browser assertions: **0**. No desktop/mobile viewport was applied, no console logs or interactions were collected, and **no screenshots exist**. Planned viewports were 1440×1050 and 390×844. `browser-checks.json` records the block. Node/HTTP/source checks are not browser tests.

Native ChatGPT Sites create/save/deploy/status tools **are exposed**. The save contract requires an already pushed source commit. The final task instruction reserves pushes and publication to the parent after review. Therefore native delivery is **BLOCKED by the publication boundary**, not absent capability. No create, save or deploy mutation was called; no real preview, version, production URL or deployment receipt exists. GitHub Pages is also unpublished and is not a substitute for native Sites.

## Probe and session provenance

Initial local tool checks found Node 24.19.0, Python 3.14.6 and gh 2.96.0; `codex` and `rg` were absent from PATH. Shell and node_repl Playwright resolution failed; local browser control was available through CUA until navigation was denied. No prior thread was resumed by this implementation; a new local persisted CLI session could not be independently established.

The parent-owned `public-probes.json` arrived during work. The first synchronization rejected its then-unsupported schema/BOM. A bounded adapter now accepts its exact schema, drops session identifiers and preserves reported timestamps, public hashes and failure states in `docs/data/local-probes.json`, with `verified: false`. The parent snapshot reports a new persisted Codex session RUNNING after an earlier failed launcher attempt. This is not independent proof of identity with the present tool session. Parent WD, WSL1, GitHub nonce, BioNeMo skill-read and smarts.bio authentication observations remain attributed snapshots, not full scientific execution readiness. The source file SHA-256 is in the probe manifest and the input file was never overwritten.

Public prior journals were fetched only through gh at pinned main/PR27/PR28 source commits. Raw journals are excluded in `.source-cache/`; only original summaries, exact source hashes, commit links and the small accession list enter the delivery. No private manuscripts or full account registry were imported. MIT license text is unchanged (working-copy line endings normalized to LF to make payload hashes portable); third-party licensing boundaries remain separate.

## NOT_TESTED

- Desktop/mobile rendering, screenshots, interactive controls, file chooser, actual download behavior, browser history/focus, screen readers and browser console.
- Native Sites creation, preview/version save, authentication/access audience and deployed URL; GitHub Pages deployment.
- Independent WD/WSL/GitHub/Codex reprobes and proof of persisted-session identity; Copilot execution.
- Fresh NCBI taxonomy/group/quality audit, sequence package downloads, live GToTree/HMMER/MAFFT/trimAl/IQ-TREE, support calculation and DefenseFinder runs.
- R-M curation, REBASE/literature evidence review, biochemical function, recognition motifs and experimental validation.
- Geneious/iTOL, BioNeMo GPU/NIM, smarts.bio successful login or execution, AlphaGenome model access/jobs.
- Third-party live licensing/access terms and portable JSON Schema validation by an external validator. Runtime validators were tested; schema downloads are contracts for independent consumers.

The unrelated untracked `copilot-probe.json` is left untouched and excluded from the implementation inventory. Parent review must inspect the working tree and evidence before committing, publishing or merging.
