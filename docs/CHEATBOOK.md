# GenomeAtlas Site Helper Suite cheatbook

## What the suite is

- Static, local-first helper source under `docs/`
- No external JavaScript dependency
- No backend executor, credential vault, shell bridge, or auto-merge path

## Honest state meanings

- `DECLARED`: planned contract only; no probe ran
- `DISCOVERED`: documentation or non-executing discovery only
- `PROBED`: bounded observation exists, but it is not a completed execution
- `EXECUTED`: an actual bounded receipt exists
- `AUTH_REQUIRED`: progress stopped at a user-login gate
- `BLOCKED_EXECUTION`: execution was explicitly blocked by policy or guardrails
- `NOT_DEPLOYED`: no deployment receipt exists

## Import/export rules

- Probe JSON imports must match `schemas/probe.schema.json`
- Imported receipts are forced to `review.verified: false`
- Imported receipts are tagged `UNVERIFIED_IMPORT`
- `hashStatus: measured` requires exactly 64 hexadecimal SHA-256 characters
- `hashStatus: not_measured` requires `sha256: null`
- Request artifacts always export with `approved: false` and `executed: false`

## Scientific scope reminders

- Intended scope: recorded177 genome panel, 10 groups, no Enterococcus
- Host tree derives from conserved single-copy marker proteins
- R-M review remains a separate ordered per-replicon branch
- Missing or failed evidence is not biological absence
- Predicted system presence is not experimental restriction activity

## Local validation

Run from the repository root:

```bash
node --test tests/*.test.js
```
