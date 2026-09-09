# genomeatlas

GenomeAtlas Site Helper Suite: evidence-backed LAB phylogenomics planning, honest probe receipts, request-only delegation packets, and release gates.

## Included source

- `docs/index.html` — accessible static interface
- `docs/app.js` — dependency-free client logic and Node-test exports
- `docs/data/registry.json` — evidence-bound tool registry
- `docs/data/chains.json` — LAB R-M helper flow and scope metadata
- `docs/data/receipts.json` — sanitized parent probe receipts
- `docs/data/gates.json` — release-gate declarations
- `schemas/probe.schema.json` — local import/export receipt schema
- `docs/CHEATBOOK.md` and `docs/NATIVE_SITES_HANDOFF.md` — reviewer guidance

## Scope boundaries

- Intended scientific scope: recorded177 genome panel, 10 groups, no Enterococcus
- No full host tree or full R-M result is bundled here
- Host-tree planning stays independent from R-M review planning
- Missing or failed evidence is not promoted to biological absence
- Predicted systems are not experimental restriction activity
- Native ChatGPT Sites are not deployed here

## Local use

Open `docs/index.html` directly or serve `docs/` from a static file server.
When `file://` prevents JSON fetches, the suite falls back to embedded copies of the same structured data.

## Tests

Run the Node built-in test runner from the repository root:

```bash
node --test tests/*.test.js
```

The suite also records a synthetic software-only test manifest under `tests/logs/` with exact command, stdout, stderr, exit status, versions, and relative-path checksums.
