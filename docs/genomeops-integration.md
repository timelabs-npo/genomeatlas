# GenomeOps integration

The React/Vite application is located at `apps/genomeops-atlas/`. GenomeAtlas remains at the repository root. Their existing build systems, source records, and licenses/notices are retained. No new application dependencies are introduced by the integration.

## Source history

- Parent repository: `timelabs-npo/genomeatlas`
- Parent base: `5cc89fb6379e9b1cdaf3cbd96c571e14d9075a8b`
- Imported repository: `serg-alexv/genomeops-atlas`
- Imported final commit: `50dc45fe790cb28f323d66382a4595ecd3a5234c`
- Imported directory: `apps/genomeops-atlas/`

The integration commit has two parents: the original parent base and the exact child commit above. The complete child tree is imported without rewriting its commits or squashing its history. `git rev-parse HEAD:apps/genomeops-atlas` equals `git rev-parse 50dc45fe790cb28f323d66382a4595ecd3a5234c^{tree}` at the integration commit. Existing child commits retain their original root paths when viewed historically.

## Local verification

From the repository root:

```sh
python3 scripts/build.py
python3 -B -m unittest discover -s tests -v
node --test tests/core.test.mjs tests/acceptance.test.js
python3 -B -m unittest discover -s probes/tests -v
```

For the React app, use Node 24 (the verified local runtime); the imported GitHub workflow uses Node 22:

```sh
cd apps/genomeops-atlas
npm ci
npm run check
```

Node 26 enables native Web Storage that conflicts with the current jsdom test setup. When testing on Node 26, run `NODE_OPTIONS=--no-experimental-webstorage npm run check`; the unqualified command on that runtime is not a passing test receipt.

The parent Pages workflow scopes Node discovery to parent tests. `genomeops-verify.yml` uses the app's locked installation and full check gate. Nested `.github/workflows` files remain historical source; GitHub only executes workflows at the repository root. The root includes correctly relocated, manually dispatched Stage 3 and Stage 4 pilot workflows; their scripts enforce the imported three-genome bound. No scientific workflow is triggered by this local integration. Stage 1 and Stage 2 full-panel workflows remain preserved as source and are not activated here.

## Publication and repository transition

This is a local integration candidate. It does not assert a remote merge, GitHub Actions success, Vercel deployment, native Site deployment, or biological validation. If the existing Vercel project is later connected to the parent repository, its Root Directory must be `apps/genomeops-atlas` so it uses the existing `vercel.json`, package lock, and Vite build.

The coordinator identified `timelabs-npo/ai-traces` (default branch `master`) as the existing destination; the requested `dedends` branch did not exist when inspected. A separate local `dedends` branch can retain the child history for that destination. The final remote retirement action remains unresolved: “move” does not specify whether the duplicate `serg-alexv/genomeops-atlas` repository should be archived, deleted, or retained as a redirect after import. No repository is deleted, transferred, archived, or renamed, and no branch is pushed by this integration. Resolve the source retirement operation before removing the duplicate remote.
