# GenomeAtlas — Site Helper Suite

An MIT-licensed timelabs-npo product for evidence-aware LAB phylogenomics delegation.

## Published native ChatGPT Site
https://genomeatlas-site-helper-suite.hx31337.chatgpt.site/

Native version 1 was deployed through Sites and independently tested from a clean Chrome visitor context on WD. This repository contains a later reviewed source snapshot; source parity with version 1 is not assumed. Read RELEASE_STATUS.json for the exact scope and hashes.

## Use
Open docs/index.html, or serve docs/ using a standard static server. No API key, backend or external assets are required.

Explore seven task chains, 20 relevant tools, the fixed 177-accession input list, input/output contracts, probe evidence, and a confirmation-request builder. JSON exports and strict untrusted receipt imports are supported. Request creation or importing a receipt never executes a job or grants verification.

## Evidence boundaries
The conserved-protein host tree and R-M annotation are independent chains. No genome sequences, inferred phylogeny or R-M results are invented. Missing/failed is not absence; raw components are U; curated P and exact-strain experimental evidence require review. BioNeMo catalog access is not GPU inference. smarts.bio catalog access is not successful tool execution.

## Tests
python scripts/build_data.py --check
python scripts/verify.py
python -m unittest discover -s tests -v
node --test tests/contracts.test.js tests/contracts.test.cjs

Parent rerun on stable WD source: 11 Python and 29 Node test definitions passed; 18 Node cases are also invoked by one Python test and are not additional definitions. Ten browser assertions passed on the local release, and ten on the published native Site. Detailed source checksums are in RELEASE_STATUS.json.

The data snapshot explicitly retains its pre-publication NOT_DEPLOYED state; the authoritative publication observation is in RELEASE_STATUS.json. Imported client data cannot alter it.

## Licensing
Original implementation: MIT. Third-party tools, skills, model weights and services retain their own licenses/terms; see THIRD_PARTY_NOTICES.md. No private manuscript, device identifiers, session tokens or source credentials belong in this repository.
