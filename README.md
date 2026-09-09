# GenomeAtlas Site Helper Suite

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

Actual command results are recorded in `evidence/checks.json`. Parent browser receipts are separately attributed in `docs/evidence/parent-report.json`; ten parent Chrome assertions passed. Current local browser execution is recorded independently.

Scientific calls are NA, FAILED, U, C, P and 0. C requires job_status PASSED, call C, complete_cassette true, exact_genome_evidence true and a nonempty model_call_reference. It is computational support, not functional validation. P requires curated exact-strain evidence. 0 means NOT_DETECTED after a completed documented exact-strain assessment; legacy ABSENT is accepted as input only and normalizes to 0 with the same requirements. Missing, unknown and failed assessments never become 0. Templates contain no biological results.

Run `python scripts/run_checks.py --browser` for bounded checks, including the installed Chrome script. Run `python scripts/refresh_public_receipts.py` only when the six authorized parent receipts are present; it projects scoped statuses, counts and hashes and omits identities and raw logs. Run `python scripts/build_data.py` after changing public metadata.

Current native metadata calls report an existing version 1 and live URL, with public audience. Those observations do not publish this revised artifact. The local Git directory is read-only; fetch failed, so this attempt cannot commit or push. Configured native source binding and the Sites hosting/package helper are not available in the inspected local hosting metadata or installed skill catalog. No new version, deployment, audience change, biological run or model inference was performed.

The source baseline is `9b7c396f7f40efc9d7b943920affba47a366bb2b`; request builders must use the actual reviewed source revision. The accession SHA-256 remains `56209c6042213da0ea96160d2a2d4e785d7574246b4b8d0371a290333c9e264a`.

Public source allowlist: docs/, supporting tests and scripts, LICENSE, THIRD_PARTY_NOTICES.md, inputs/selected_accessions.txt, README.md and sanitized evidence. Exclude task prompts, raw logs, private receipts, .tmp/, .openai/ and model data. The parent must review the index before committing. No workflow changes or main merge are included.
