# GenomeAtlas cross-device cheatbook

The public Helper Suite creates delegation and confirmation packets; it cannot grant tool access or execute a privileged job. Imported claims always stay unverified.

## Windows endpoint
Use Remote Desktop Commander list_devices, then ping and commands with the selected explicit device ID. Do not publish that ID, user paths, tokens or raw session logs. Probe wsl --list --verbose before assuming WSL2. The current observed Ubuntu kernel is WSL1; no upgrade was performed.

## Repository and tests
`git clone https://github.com/timelabs-npo/genomeatlas.git`
`cd genomeatlas`
`node --test`
Browser QA: install Playwright as a local dev dependency, then `node scripts/browser_check.cjs`. The test starts and closes a loopback-only server and isolated browser contexts; it does not use a logged-in profile.

## Proposed biology workflow
Use the frozen 177-accession input in data/selected_accessions.txt. Obtain annotated genome/protein/CDS/GFF/GBFF packages through NCBI Datasets. Host tree: conserved single-copy marker families, independent family alignments, trimmed concatenation, IQ-TREE model/support, exact original protein IDs and sequences. R-M: per-replicon ordered proteins and genomic context, DefenseFinder locked models, REBASE and exact-strain literature review, then Type I/II-including-IIG/III/IV ring matrix. Raw hits are U until manually curated; failure is not absence.

## Optional GPU/model route
NVIDIA BioNeMo genomics-workflow-acceleration guidance is referenced, not a successful NIM call. Acceleration defaults off, CPU steps remain authoritative until A/B evidence exists, and no Parabricks replacement is invented for GToTree/IQ-TREE/DefenseFinder. AlphaGenome contributes input/provenance/retry practices only; human regulatory predictions do not infer this bacterial tree.

## smarts.bio
Workspace lookup succeeded. The advertised GC tool returned 404; this adapter is BLOCKED for that operation, not authenticated-and-working for all tools. Never substitute mental arithmetic for an executed provider result.

## Native ChatGPT Site
A real WD Codex session listed the owner Site; another attempted build was blocked before source synchronization. Saving a native version requires that Site repository HEAD. No native deployment URL is claimed. Native publication and GitHub hosting are distinct.

## Receipt templates
Use schemas/probe.schema.json. Provide exact scope, timestamp, tool ID, command/RPC result, artifact location and a real 64-hex SHA-256. A valid format is not validation of the evidence. The owner must rehash payloads and independently rerun acceptance tests before scientific acceptance or main merge.
