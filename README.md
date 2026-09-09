# genomeatlas

GenomeAtlas Site Helper Suite: evidence-backed LAB phylogenomics, tool registry, cross-device probes, and human approval gates.

## What this repository contains

This repository now ships a **zero-build static app** under `docs/` for:

- GitHub Pages publication
- portable source import into environments that accept plain HTML/CSS/JS
- local review from a filesystem copy or a simple static server

The app is not a native ChatGPT Site deployment. Native ChatGPT Sites were **not exposed** in the parent observations, so this repository should distinguish between:

- **Portable/GitHub Pages source**: the HTML/CSS/JS and JSON files in `docs/`
- **Native ChatGPT Site**: not available here, with no native deployment receipt to import or claim

## Local use

Open `docs/index.html` directly, or serve `docs/` with a static server. The app falls back to built-in seed data when local `file://` fetches are unavailable.

Key views:

1. scoped LAB phylogenomics flow
2. searchable/filterable evidence-bound tool registry
3. actual probes and receipt import/export
4. delegation and confirmation planner that writes only local `REQUESTED` artifacts

## Safety and evidence model

- strict Content Security Policy with external local `app.js` and `style.css`
- no inline event handlers
- no remote execution controls
- imported or manually recorded receipts remain **unverified** until external review
- parent historical assertions without source receipts retain null timestamps and `not_measured` hashes
- measured receipt hashes must be exactly 64 hexadecimal digits; otherwise use `null` with `not_measured`
- all user-supplied text is rendered with `textContent`
- CSV export escapes spreadsheet formula prefixes

## Data files

- `docs/data/registry.json` — registry entries and contracts
- `docs/data/chains.json` — LAB flow stages and ring descriptions
- `docs/evidence/parent-observations.json` — redacted historical observations only
- `schemas/probe.schema.json` — receipt schema documented for import/export validation

## Tests

Run the Node built-in test runner from the repository root:

```bash
node --test
```

Focused tests cover exact ring labels, branched lineage validation, schema validation, malicious receipt rejection, strict hash rules, CSV escaping, registry filtering, confirmation planning, and static asset integrity.

## AlphaGenome best-practice note

AlphaGenome is tracked here as an **engineering-reference only** integration. Any future use should keep coordinate systems explicit, input alphabets explicit, outputs versioned, and retries bounded to transient failures only. This repository does not copy Apache- or CC-licensed AlphaGenome assets into the MIT-licensed app, and it does not relabel AlphaGenome as a LAB classifier.
