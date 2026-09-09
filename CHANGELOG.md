# Changelog

## Unreleased

- add a zero-build `docs/` Site Helper Suite with a strict CSP and responsive local-first interface
- add evidence-bound registry, LAB flow data, and redacted parent observations
- add request/probe JSON and CSV export with receipt import validation and unverified-only confirmation flow
- add Node built-in tests plus synthetic software-only test logs
- correct ring labels, branched lineage metadata, and receipt hash/timestamp handling for historical assertions
- separate historical observation records from probe receipts, allow optional `sha256:` prefixes for measured digests, and add adversarial validation coverage
- correct the scientific lineage so R-M detection consumes proteomes plus genomic coordinates, tighten ISO timestamp parsing, expand CSV control-character escaping, and update Codex/Sites observations without fabricated timestamps
