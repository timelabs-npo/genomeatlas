# Maintenance and reshaping guide

The public product boundary is `timelabs-npo/genomeatlas`, branch `main`. The application boundary is `apps/genomeops-atlas`; the root scripts and `tests/` are the verification boundary. Historical source retention belongs in private `timelabs-npo/ai-traces` on `dedends`.

## Change workflow

1. Start a topic branch from the current canonical `main`.
2. Change the smallest contract-owning component: task definitions and briefs in the task/workspace modules, shared context in the user-inputs state, deterministic inspection in the dispatcher, motif logic in the sandbox, and evidence metadata beside the artifact it describes.
3. Update the relevant RFC if an input, output, evidence state, limit, or repository guarantee changes.
4. Run `npm run check` and `npm run build` with Node 22 or 24. Inspect `/build-receipt.json` and confirm the commit and clean-tree fields.
5. Review the static output and publish from the repository root. Record deployment ID, served asset hashes and CI run URLs in the release receipt.

## Useful commands

```sh
npm run install:app
npm run check
npm run build
git diff --check
git status --short --branch
```

The supported check includes the preserved data/receipt contracts, six pilot-script regressions, lint, Vitest and the production build. Node 26 requires `NODE_OPTIONS=--no-experimental-webstorage` for the current jsdom setup and is not the verified release runtime.

## Scientific review checklist

Before calling a result scientific evidence, verify the exact accession manifest, source package, method/model version, output path, status and SHA-256 where applicable. Check that the claim is within the three-genome pilot boundary or explicitly marked as not assessed. Keep host-tree construction independent from R-M candidate mapping. Treat browser motif matches and file hashes as computational observations with declared limits.

See [RFC 0001](rfcs/0001-workbench-architecture.md), [RFC 0002](rfcs/0002-scientific-evidence-contract.md), [RFC 0003](rfcs/0003-repository-consolidation.md), [integration details](genomeops-integration.md), and the [historical handoff record](handoffs.md).
