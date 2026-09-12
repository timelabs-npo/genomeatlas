# RFC 0003: Repository consolidation and history retention

- **Status:** Accepted
- **Date:** 2026-09-12
- **Scope:** `serg-alexv/genomeops-atlas`, `timelabs-npo/genomeatlas` and `timelabs-npo/ai-traces`

## Decision

`timelabs-npo/genomeatlas` is the single public source and deployment repository for the unified workbench. The complete historical source of `serg-alexv/genomeops-atlas` is retained in the private `timelabs-npo/ai-traces` repository on branch `dedends` under `retired/genomeops-atlas/2026-09-12/`. The old public repository is retired and removed after retention verification.

This is a retention merge, not a commit-identity rewrite. “Rebase” in the product request is implemented as repository consolidation while preserving the original source SHAs. Rewriting the 35 source refs would make provenance and later restoration harder to prove.

## Recorded graph

- Parent base in the canonical repository: `5cc89fb6379e9b1cdaf3cbd96c571e14d9075a8b`.
- Imported GenomeOps implementation commit: `50dc45fe790cb28f323d66382a4595ecd3a5234c`.
- Canonical integration commit: `36a36b36bfab792a33f3f68e1510162ee8c01d4b`.
- Final verified canonical workbench commit before this documentation release: `f1c8a7276618a3fd2edfa57571788dea2be3e05c`.
- Retained source branch before final receipt: `ai-traces/dedends` at `f20f19218dc1bb9749728c2f4add2b1ee897f719`.
- Retained bundle: 35 refs, 342,140 bytes, SHA-256 `57aaf9dac2694674c468b2aa8d32cc465f45a8444a353a65606904e6aee8385a`.

The imported application tree is byte-identical to the tree of the imported commit at the integration point. The retention bundle was verified with `git bundle verify`; a mirror clone and `git fsck --full` passed before source retirement. The retention receipt and repository metadata are stored beside the bundle in `ai-traces`.

## Restore procedure

From a fresh clone of `timelabs-npo/ai-traces`:

```sh
git bundle verify retired/genomeops-atlas/2026-09-12/genomeops-atlas.bundle
git clone retired/genomeops-atlas/2026-09-12/genomeops-atlas.bundle genomeops-atlas-restored
git -C genomeops-atlas-restored fsck --full
git -C genomeops-atlas-restored show 50dc45fe790cb28f323d66382a4595ecd3a5234c
```

The bundle is the recovery authority for the retired source. The canonical repository is the authority for current product code and the Vercel publication. No private ChatGPT context, credentials or untracked local files were exported.

## Future changes

Product changes land in `timelabs-npo/genomeatlas` and must update the relevant RFC when an input, evidence state, output or retention guarantee changes. New source material from a retired repository belongs in `ai-traces` with a manifest, bundle/hash and restore test before any remote retirement operation. Do not force-push a rewritten canonical history to “clean up” the merge; add a documented commit instead.
