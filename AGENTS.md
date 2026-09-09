# Repository guidance

Read LICENSE and README before changes. Keep original code under MIT. Work on the requested branch; preserve unrelated user changes. Do not publish, push, change authentication or repository settings without explicit authorization.

The public artifact is `site/`. Keep it static, dependency-light, and portable to a subdirectory. No AI API, shell, MCP, remote execution, arbitrary imported URL fetching, analytics, or credentials in browser code. Use `textContent` for imported strings. Keep raw logs, account snapshots, and private research outside the repository.

`site/data/registry.json` is the source of tool, stage, provenance, and capability information. Distinguish parent-supplied observations from local observations. Installation, discovery, probing, execution, and scientific acceptance are separate dimensions. Never promote imported claims to accepted evidence.

Preserve the inherited scope: 177 selected LAB genomes, approximately 110 named species, no Enterococcus. No invented biological records or results. Site implementation does not authorize biological computation or downloads.

Validate schema and hash changes with unit tests, and UI changes with the real browser suite when available. Use synthetic test inputs and label them. Run `npm.cmd test`, `npm.cmd run test:browser`, and `npm.cmd run check` on Windows (`npm` elsewhere). Update the sanitized test report with actual commands, exit codes, and NOT_TESTED limits. Never fabricate successful tests or screenshots. Separate implementation evidence from independent review and publication authority.
