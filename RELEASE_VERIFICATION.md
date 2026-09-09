# GenomeAtlas Site Helper Suite — verified software release

Product: timelabs-npo/genomeatlas. Original application code: MIT.
Scientific scope remains LAB R-M Figure 2; no final biological analysis is claimed.

## Executed on the authorized Windows endpoint
- Clean checkout of Copilot candidate 5e8407739299a3cce133500379b6e4b07ae467ae: 19 Node tests, 13 passed and 6 failed.
- Repaired canonical JSON/embedded-data divergence and deterministic LF fixture handling; one overly literal prose assertion was relaxed without weakening its scientific condition.
- Repaired candidate: 19 Node tests passed, exit 0.
- Actual localhost Microsoft Edge via Playwright: 14 UI assertions passed, zero JavaScript page errors; desktop1440x1000 and mobile390x844 inspected.
- Windows -> Ubuntu -> Windows temporary-file nonce round trip passed with independent byte hashes. Ubuntu is WSL1; no WSL2 conversion or privilege changes were performed.
- Authenticated GitHub operations and repository clone are working. The release commit readback is recorded separately.

## External tools and limits
- NVIDIA BioNeMo Agent Toolkit is installed as a plugin capability. Its public source at 0e67a612e4045f007e38fa77adc8f3ebfc5616b6 contains62 tracked SKILL.md files; the genomics-workflow-acceleration guidance was read. Preserve CPU defaults and optional GPU switches. No NIM/GPU inference ran.
- An earlier proposed validate_catalog.py invocation failed with file-not-found; this is NOT a catalog-validator PASS.
- smarts.bio catalog discovery works, but invoking the exact advertised seqkit_gc identifier on ACGTACGT returned404. No smarts.bio GC calculation completed.
- A real local Codex session ran; this is not a cloud-session substitute. Historical execution observations remain separately labelled until attached receipts are independently accepted.
- Native ChatGPT Sites created a shell, but publication failed on an empty source snapshot and source-binding restrictions. This release is a separate portable/static companion, NOT a native ChatGPT Site.

## Safety properties
Receipt import validates structure only; imported receipts never become verified automatically. REQUESTED artifacts do not execute jobs. Failed/unknown results never become not-detected. Hashes in synthetic fixtures are calculated from explicit synthetic payloads. Private device/session identifiers, credentials and manuscript text are not included.

Tests: node --test tests/app.test.js; node tests/browser_release.mjs (Playwright optional).
Evidence: release_evidence/. Historical supplied assertions: docs/evidence/parent-observations.json.
