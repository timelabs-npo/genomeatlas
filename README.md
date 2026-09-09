# GenomeAtlas — Site Helper Suite

An original MIT product by timelabs-npo for evidence-aware LAB R-M phylogenomics delegation and review. Static, zero-build HTML/CSS/JavaScript; no privileged job executor or background tracking.

## Use
Open `docs/index.html`, or serve `docs/` with a local static server. Search 41 tool routes, inspect input/output contracts and actual dated probes, export JSON/CSV, and create local REQUESTED-only delegation packets. Imports remain unverified and stay on your browser. `docs/CHEATBOOK.md` explains the chain.

## Tests
`node --test` runs unit and negative regressions without dependencies. `npm ci --ignore-scripts` installs pinned browser-test dependencies; `npm run test:browser` uses installed Microsoft Edge and a loopback-only temporary server. Browser contexts do not use your signed-in profile. Evidence is under `qa-local/` and `docs/evidence/`.

## Scientific scope
177 versioned assembly IDs are supplied as public input metadata, not genomes/results. No Enterococcus. The host tree uses many conserved protein marker families, separate alignments and concatenation; R-M annotation is independent. Four ring meanings are Type I, Type II/IIG, Type III, Type IV. Raw components are U (unreviewed), P requires locus curation, and missing/failed never means absent. No live host tree or R-M calls are included.

## Native ChatGPT Site status
Real new Codex sessions on the authorized Windows endpoint discovered and read the owner GenomeAtlas native Site. It remains version 0 with no deployment. Save-version requires a push to the configured Site source repository; that Codex session cannot execute shell under its policy and has no native source-edit/push tool. This static distribution and any GitHub Pages publication are NOT a native ChatGPT deployment. No sandbox bypass was attempted.

## Integration boundaries
smarts.bio workspace access succeeded but its advertised GC-content tool returned 404. BioNeMo guidance was consulted; model/NIM execution is untested. Original MIT code only; third-party references retain their own licenses in THIRD_PARTY_NOTICES.md. No manuscript, credentials, private endpoint IDs or raw agent logs are published.
