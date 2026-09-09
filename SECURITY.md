# Security and trust boundaries

This is a static, browser-local reference application. It contains no backend shell executor, token inputs, authentication flow, analytics, external scripts, dynamic code execution, uploads to a server or network job dispatcher. The local HTTP server serves files only from `docs/`, bound to loopback. Parent review controls publication.

Registry/probe imports are untrusted claims. `docs/core.mjs` limits JSON to 100,000 UTF-8 bytes, 100 records, bounded fields and known keys/states. It rejects markup, executable URL schemes, control characters, unexpected fields and duplicate record IDs. Rendering uses `textContent` and DOM element creation, never `innerHTML`. The CSP limits scripts, styles and fetches to the same origin and disables objects, base changes and form submissions. No untrusted URLs are made clickable. JSON remains in memory until cleared or the page closes.

Validated shape is not evidence verification. An imported positive state never merges into the bundled registry. Downloaded claim envelopes retain `origin: user-supplied` and `verified: false`. These envelopes are intentionally not accepted as direct registry/probe imports: use their `claims` document, which receives a fresh untrusted wrapper. No receipt can certify itself.

`public-probes.json` belongs to the parent and is gitignored. `node scripts/sync-probes.mjs` reads it without writing it and accepts either the documented probes v1 schema or the narrowly defined parent v1.0 schema. The adapter drops the session identifier, preserves public hashes and timestamps, rejects unexpected fields and biological result promotion, and publishes only a separate `parent-supplied-file`, `verified: false` projection. Absent files become unknown; malformed, oversized or unreadable inputs become blocked. The parent must sanitize free-text content before supplying it; syntax validation is not a general personal-data detector. Review the staged projection before publication.

A job request contains a user-supplied reviewer decision. Even `approved` stays `not-executed` and `certified: false`. Editing a prepared draft invalidates its prior export. Requests and downloaded JSON are inert data; a separate operator must review scope, inputs, permissions, cost and outputs. This site collects no tokens and grants no permissions.

Report defects through a private security advisory to the `timelabs-npo/genomeatlas` maintainers where available. Do not put secrets, host identifiers or account details in a public issue. No security audit or penetration test is claimed.
