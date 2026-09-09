# GenomeAtlas — Site Helper Suite

A timelabs-npo product for evidence-aware LAB phylogenomics: tool discovery, explicit input/output contracts, cross-device probes, review requests and independently auditable receipts. Original project code is MIT; see [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Open

- **Native ChatGPT Site:** https://genomeatlas-site-helper-suite.hx31337.chatgpt.site
- **Source and downloadable software release:** https://github.com/timelabs-npo/genomeatlas/releases/tag/v0.1.0
- **Separate GitHub Pages surface:** https://timelabs-npo.github.io/genomeatlas/
- **Dated execution/publication reconciliation:** [actual service and test status](evidence/publication-status-20260909T1535.json)

## Publication boundary

The native service reported public Site version 1 and deployment `succeeded`, source `683401cf1f2255414a4df3e0f2e9d606686a8fdf`. A WD Codex browser session opened that production URL and exercised navigation, filtering and request validation. Production download completion, receipt-upload handling and a separate anonymous/mobile browser matrix are not all verified.

The GitHub release uses a separate source history (`e44827702a8153f682de64d92e92ef1a88bba4c8`). Reviewed Copilot receipt-validation code was subsequently incorporated through PR17. **The native saved version and current GitHub main are not asserted to be byte-identical or automatically synchronized.** A later native update was blocked because its required hosting skill/packaging helper was missing in that session. Older NOT_DEPLOYED observations remain historical records, not the current native service state.

## What the suite does

- Catalogues task-relevant tools with distinct advertised/discovered/probed/executed states.
- Explains the genome-to-marker-to-host-tree chain separately from R-M detection and locus/literature review.
- Preserves the supplied 177 versioned assembly identifiers; no taxonomy is inferred from accession strings.
- Produces bounded review-request JSON and inspects untrusted receipts without promoting them to verified results.
- Provides schemas, portable probe receipts, coordinate-convention checks, negative tests and exportable source.

A confirmation in the browser is an intent record, **not execution**. No arbitrary shell, paid/GPU job or scientific conclusion is triggered by a form submission.

## Local checks

Use Python and Node 20 or newer. Build before testing: tests inspect the generated `dist/` manifest and its byte identity.

```bash
python scripts/build.py
python -m unittest discover -s tests -v
node --test tests/core.test.mjs tests/acceptance.test.js
python -m unittest discover -s probes/tests -v
```

Run commands that correspond to files in the selected commit. The recorded release check run contains 22 Python and 13 core Node tests. A later fresh-clone parent attempt ran tests before building and was not accepted; its replacement compound execution was safety-blocked. The repository does not claim every later commit or endpoint is covered by those earlier results.

## Connected biology capabilities

NVIDIA BioNeMo Agent Toolkit is installed and its genomics-workflow-acceleration guidance was inspected. GPU/Parabricks runtime was not ready; acceleration stays off, with no model inference or model download. Do not substitute Parabricks or AlphaGenome predictions for the conserved-marker LAB host tree.

smarts.bio discovery responded, but the sequence catalog was empty and its agent confirmed no callable deterministic sequence-statistics function. The synthetic control was **BLOCKED**, not a successful GC-content result.

## Scientific boundary

The intended study excludes Enterococcus and uses conserved marker proteins for the host tree, followed by independent R-M Type I, II/IIG, III and IV annotation. Missing/failed evidence is not biological absence. Complete computational system architecture is not proof of restriction activity. This release is the helper suite, **not a completed 177-genome phylogenomic analysis**.

## Latest scoped WD registry integration

The additive integration on this branch retains the existing app and publication journals. Registry:134 records (63 existing catalog entries +71 observed plugin-cache manifests,344 skill-file records). Cached definitions do not imply enabled/authenticated MCPs or model execution. Current parent ChatGPT smarts.bio invocation remains authentication-blocked; historical discovery/404/empty-catalog observations belong to their recorded sessions and are retained. BioNeMo package0.1.0 and two skills were inspected without GPU/NIM execution.

Parent local session01a0869a-6af8-75e3-b8d1-0879e92c6723 actually executed development and native Site readback. Independent tests for this integration:30 Python and14 Node tests passed (one Node wrapper repeats Python; counts are not additive unique tests). Windows/Ubuntu/GitHub SHA-256 roundtrips and10 independent Copilot inventory tests passed separately. No new browser tests were performed after permission was declined.

See data/current-probes.json, data/plugin-cache.json, data/native-site-readback.json, data/copilot-reexecution.json and evidence/parent-reconciliation/. This new source is not asserted live until a new native save/deploy receipt binds it.
