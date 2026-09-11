# GenomeAtlas Workbench

A unified research workspace for genetic engineers: choose a research task, inspect its tools and inputs, prepare a configured chat brief, and follow scientific claims back to real artifacts.

This is the canonical home of the fused GenomeAtlas and GenomeOps applications. The Vite/React application in `apps/genomeops-atlas` is the production entry point. Vercel is the chosen hosting platform; the deployment receipt binds the published build to its exact Git commit. `/build-receipt.json` reports that build identity.

## Research workspace

- Eight starter tasks connect to the existing frozen chains: panel, download, markers, tree, R-M, evidence, figure and release.
- Search all 134 inherited catalog entries. Historical observations remain historical; a catalog listing does not establish current authentication or runtime availability.
- Configure a brief with a working role, tone, character and destination: general ChatGPT, ChatGPT Work or Codex cloud. Copy the brief, open the destination and review it before starting. Mode, repository, files and model selection happen in the destination; browser links do not silently apply account settings.
- Export schema-compatible task requests, inspect the original workflow dispatcher, and explore illustrative restriction motifs locally.
- Download the real three-genome GToTree pilot, inspect its provenance and calculate the published file hashes in the browser. No fabricated biological result or model consensus is used as evidence.

The interface follows the supplied dark research-workbench reference. It is an independent web application, not a native ChatGPT feature.

## Run and verify

Use Node 22 or 24 and Python 3. Node 24 was used for local verification.

```sh
npm run install:app
npm run dev
npm run check
npm run build
```

`npm run check` runs the preserved GenomeAtlas data/receipt contracts, the six pilot script regressions, and the React lint/test/build checks. The root Vercel configuration installs the nested locked dependencies and serves `apps/genomeops-atlas/dist`.

The original static suite remains available as source and through `npm run build:legacy`. Its historic publication records are preserved; they are not receipts for this Vercel application. There is no automatic second Pages deployment from the old suite workflow.

## Evidence and scope

The preserved GToTree 1.8.17 pilot ran on commit `50dc45fe790cb28f323d66382a4595ecd3a5234c`: three versioned NCBI assemblies, 118 retained marker alignments, 350 exact source-protein mappings, and 1,240 matching SHA-256 manifest entries. The full original 1,241-file archive is in `apps/genomeops-atlas/public/evidence`. Its SHA-256 equals the original GitHub artifact digest.

That is evidence of a bounded execution and traceable inputs/outputs, not a completed 177-genome study. A three-tip unrooted tree has no nontrivial split to support. R-M detection, experimentally verified motifs, restriction activity and transformation outcomes are not established by this pilot. Hashes establish byte consistency relative to a manifest; they do not authenticate a signer or establish biological truth.

## Repository history

The original GenomeAtlas base is `5cc89fb6379e9b1cdaf3cbd96c571e14d9075a8b`. Integration commit `36a36b36bfab792a33f3f68e1510162ee8c01d4b` retains both parent histories and imports the exact GenomeOps source tree at `apps/genomeops-atlas`. The unified workbench builds on that integration.

GenomeOps retention belongs in the private `timelabs-npo/ai-traces` repository on `dedends`. Final migration receipts record the retained refs, archive digest and source retirement state after production verification. See [integration details](docs/genomeops-integration.md), [historical suite README](docs/history/site-helper-readme-before-fusion.md), [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
