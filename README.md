# GenomeAtlas

**Site Helper Suite by timelabs-npo. Original code: MIT.**

An evidence-first research workspace for the LAB restriction-modification Figure 2 project. The production source is in `site-helper/`: eight inspectable data chains, 177 frozen assembly identifiers, a layered tool registry, safe receipt import/export, and request-only delegation.

## Run locally

```sh
cd site-helper
python scripts/build.py
python scripts/serve.py
```

## Test

```sh
cd site-helper
python scripts/build.py
python -m unittest discover -s tests -v
node --test tests/core.test.mjs
```

Registry discovery, authentication, execution, and scientific acceptance are separate states. Importing a receipt does not verify it. Confirming a task does not execute it. No genome tree, R-M repertoire or experimental validation is invented.

The input is a frozen 177-assembly accession list; taxonomy is explicitly not refreshed in this release. Host-tree inference uses conserved protein markers independently of R-M analysis; Enterococcus stays out of scope. GPU routes default off. BioNeMo is an optional skills/policy integration, not a replacement for GToTree/IQ-TREE/DefenseFinder. smarts.bio currently requires account authorization.

Code and schema tests have been independently rerun on WD. Native ChatGPT Sites creation/version/deployment and browser runtime acceptance are separate gates. This repository is not itself a native ChatGPT Site and does not claim a native deployment URL.

See `site-helper/IMPLEMENTATION.md`, `site-helper/THIRD_PARTY_NOTICES.md`, and `site-helper/evidence/` for details. Local accounts, tokens, private scientific drafts and device identifiers must not be committed.
