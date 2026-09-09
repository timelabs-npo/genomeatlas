# GenomeAtlas Site Helper Suite

**Published native ChatGPT Site:** https://genomeatlas-site-helper-suite.hx31337.chatgpt.site

Original MIT product by timelabs-npo. Native version1 succeeded; see `audit/native-deployment.json` for exact source and remaining production-browser limits. The built-in probe ledger is a labeled pre-publication snapshot, not a live monitoring feed.

Parent verification on WD: 11 Python tests;18 distinct JavaScript contract tests (also invoked by one Python test);10 local Chromium UI checks; Copilot-derived receipt validator13 tests plus3 parent negative controls. Ubuntu independently passed10 invariants and13 validator tests. No live 177-genome tree or R-M analysis is claimed.

`probes/validate_receipt.py` was adopted from Copilot PR4 at exact commit388cc5e60bb16f1f4a6fb7e4b47239a1120b2999 with additional parent guards. It cannot authenticate claimed execution. The GitHub source and native Sites source are separately versioned; see receipts, not guessed equivalence.


Original MIT static research helper by timelabs-npo. Open `docs/index.html` directly via file://; all assets and data are local and deployment paths relative. No server, install or API key needed.

Explore the proposed host-tree and independent R-M workflow, filter the tool registry, inspect the attributed parent probe ledger, and search all 177 versioned accessions. Taxonomy/group membership are unverified; no sequences, inferred tree or R-M results are supplied. Whole genome packages supply sequence/provenance inputs; marker alignments supply conserved-protein tree inputs. Four proposed rings are I, II (including IIG), III and IV.

Complete endpoint/reviewer aliases, input hashes and budget to prepare/download a REVIEW_REQUEST. It always starts NOT_EXECUTED, has a null run receipt and requires external confirmation. Preparation, consent and download do not execute jobs. Request imports return to DRAFT. Receipt imports use a separate strict RUN_RECEIPT schema, are capped at 64 KiB and remain UNTRUSTED_IMPORT, verified=false. References render as inert text. No imported receipt changes the ledger. Failed/missing R-M is FAILED/NA, never absence; raw hits are U; curated P requires exact-strain evidence. A cassette is not functional proof.

Validation (Windows Python/Node):

```
python scripts/build_data.py --check
python scripts/verify.py
python -m unittest discover -s tests -v
node --test tests/contracts.test.js
node --check docs/contracts.js
node --check docs/app.js
node --check docs/data.js
python scripts/browser_smoke.py
```

Actual outcomes are in evidence/checks.json, SESSION_RESULT.json and COMPLETION_REPORT.md. Browser script uses an installed Edge in an isolated temporary workspace profile; no install. Exit 77 means NOT_TESTED. Parent device observations are not local test receipts. Native Sites capability discovery is separate from runtime and deployment; see NATIVE_SITES.md. No publication, commits, biological jobs, paid/GPU jobs or model downloads performed.

The primary execution also adds `tests/contracts.test.cjs` and
`tests/test_hardening.py` for negative request/manifest/registry regressions.
Run `python scripts/run_checks.py` to record all non-browser checks with per-command
UTC times, exit codes, stdout and stderr. Its exit code is nonzero if a check fails.
The combined Node command is `node --test tests/contracts.test.js tests/contracts.test.cjs`.
The original receipt tests remain intact; repeated execution through unittest is
recorded separately and is not counted as additional test definitions.

The installed Chrome smoke script is `node scripts/browser_smoke.mjs`, using only
Node built-ins and an isolated profile under ignored `.tmp/`. Both the Edge and
Chrome attempts failed before any browser assertions ran. Browser automation also
blocked the local file URL by policy. **Browser rendering/interactions remain
NOT_TESTED**; no screenshot, mobile-layout or accessibility audit is claimed.
See `evidence/browser-policy.json`. A syntax check is not a browser smoke pass.
Do not retry through weaker browser security or alternate URL workarounds.

The baseline source commit is `9b7c396f7f40efc9d7b943920affba47a366bb2b`;
these uncommitted changes are not in that commit. Replace the prefilled revision
when requesting review of a later artifact. Original accession bytes are preserved
with SHA-256 `56209c6042213da0ea96160d2a2d4e785d7574246b4b8d0371a290333c9e264a`.

Metadata is maintained in `docs/data/atlas.json`; regenerate its classic-script
bundle with `python scripts/build_data.py`. The bundle avoids runtime fetches and
keeps deployment paths relative. Imports are bounded, schema-validated and rendered
as text; the client blocks network connections and form submissions by CSP.
Registry and ledger outcomes are never modified by imported requests or receipts.

Concurrent workspace changes supplied newer smarts.bio/BioNeMo reports. They are
preserved as attributed reports, not locally replayed facts; the original task
handoff is retained in `evidence/original-handoff.json`. Native Sites tool names
were independently observed in this session's metadata, with no invocation or
publication. Parent review must reconcile report provenance before publication.
The one-time `scripts/finish_suite.py` is retained from the concurrent work for
traceability; do not rerun it as part of ordinary maintenance or validation.
