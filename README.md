# GenomeAtlas - Site Helper Suite

Original MIT product by timelabs-npo. Local-first helper for LAB R-M Figure 2: tool/data-flow registry, exact 177-accession input list, bounded request builder, and untrusted receipt inspection.

## Run locally

`python -m http.server 8765 --bind 127.0.0.1 --directory docs`

Open http://127.0.0.1:8765. Requests remain unexecuted; imported receipts are not authenticated proof.

## Tests

`python -m unittest discover -s tests -v`

`node --test tests/contracts.test.js tests/contracts.test.cjs tests/scientific.test.cjs`

`python -m unittest discover -s probes/tests -v`

## Evidence boundaries

Conserved-marker host topology is independent of R-M annotations. Computational completeness does not prove experimental activity. Missing/failed jobs are not absence, raw hits remain unreviewed. BioNeMo documentation has been inspected; GPU/NIM execution is not claimed. smarts.bio catalog/workspace access is separate from its blocked sequence-tool dispatch. No complete 177-genome analysis was performed for this helper release. Native Site publication is separate from this GitHub source release.

The receipt validator from Copilot PR4 was imported at commit 388cc5e60bb16f1f4a6fb7e4b47239a1120b2999 and rechecked by the parent. No third-party AlphaGenome or BioNeMo implementation is relicensed; their engineering guidance is referenced with original licensing boundaries.
