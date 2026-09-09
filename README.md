# GenomeAtlas Site Helper Suite

An implemented, dependency-free static helper for `timelabs-npo/genomeatlas`. Seven views under `docs/`: Overview, Tool registry, Data-to-figure chains, Actual probes, Delegation/confirmation, Decisions/cheatbook and Downloads.

The scientific target is 177 frozen LAB RefSeq genomes across ten operational groups, without Enterococcus. The host-tree chain uses conserved single-copy proteins, separate marker alignments, a concatenated protein matrix and IQ-TREE support estimates. Independent R-M annotation uses ordered per-replicon genes with GFF, DefenseFinder and review before I / II (including IIG) / III / IV rings. Workflow diagrams show no inferred tree or biological result.

## Run and verify

Existing Node and Python are sufficient; nothing needs installation:

```powershell
node scripts/sync-probes.mjs
node scripts/test.mjs
python -m http.server 8765 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:8765` when browser permission permits. Serve the files through HTTP: ES modules and fetch are not promised to work with `file://`. Use Tab and Shift+Tab to navigate, Enter to activate links/buttons and Space for native buttons/disclosures. The skip link focuses main content; view changes preserve native hash/history behavior. Responsive CSS supports mobile layouts. Browser evidence and limitations are in `evidence/REPORT.md`; source or HTTP tests do not substitute for browser tests.

```powershell
node scripts/http-check.mjs
python scripts/hash-evidence.py
python scripts/hash-evidence.py --verify
```

`node scripts/test.mjs` saves TAP, stderr and the exact command/exit code under `evidence/`. The SHA-256 manifest uses only relative paths and excludes itself, the parent input and ignored runtime/cache files. It covers site source, tests, documentation and reports. Regenerate it after changes.

## Evidence and imports

`docs/data/registry.json` is an extensible schema-v1 registry. Each record has `id`, `name`, `purpose`, `notes`, `evidenceIds` and separate `states` for exposed, installed, authenticated, probed and executed. State values are `yes`, `no`, `unknown`, `blocked`, `not-tested`. A positive dimension requires an evidence reference and is bounded by the notes. No dimension implies another.

`docs/data/import-example.json` illustrates probe imports. Runtime validation lives in `docs/core.mjs`; portable JSON Schema contracts live under `docs/schemas/`. All browser imports remain user-supplied and cannot modify trusted/bundled state. File and pasted input share the same validator. The parent probe format is accepted only by the synchronization script. See [SECURITY.md](SECURITY.md).

The parent can write **only** its `public-probes.json` while this build runs. The synchronizer never modifies that file; its sanitized projection and source hash are staged under `docs/data/`. Refresh explicitly and inspect the diff. Parent observations, prior journals, local checks and imported claims are different evidence sources. Parent session/device claims have not been independently reprobed here.

The confirmation view prepares a downloadable request with inputs, expected outputs, test gate, permission/cost boundary, reviewer decision and receipt requirements. It does not run commands or certify results. The downloadable receipt JSON Schema defines what a subsequent independently reviewed run must report. There is no backend executor or token collection.

## Public provenance

`python scripts/fetch-public.py` makes small, read-only `gh api` requests to the public `serg-alexv/genomeops-atlas` repository at pinned commits. It fetches only main STATUS, the Stage 1 journal, PR27's review, PR28's receipt and the explicitly requested accession list. It caches journal bytes locally in `.source-cache/`, which is not committed. Public source identities, byte hashes and original summaries are retained in `docs/data/source-manifest.json` and `docs/data/journal-summaries.json`.

The downloaded list actually validates as 177 unique versioned RefSeq IDs. That does not revalidate taxonomy, ten-group membership, sequence files, live trees, R-M calls or biochemical function. Prior test counts belong to their source journals, never to this implementation.

## Delivery boundaries

Work is confined to `feat/site-helper-suite-20260909`. GitHub Pages can serve `docs/` after parent review; no Pages settings or workflows have been changed and no push/merge is authorized now.

Native ChatGPT Sites is a **separate required target**. Create/save/deploy tools are exposed in this session. Their `save_site_version` contract requires a pushed source commit. The final user instruction holds pushes and publication for parent review, so native delivery is BLOCKED by that boundary, not by absent tools. No Site was created, no preview/version exists and no deployment receipt or URL is claimed. Parent can continue the native delivery after review with the actual exposed Sites workflow; GitHub Pages is not a ChatGPT Site.

The local `codex` command was not on PATH. The parent-provided snapshot later reports a new persisted Codex session actually running on WD, after an earlier failed launcher attempt. This is attributed evidence, not proof that this UI/tool session is that CLI session. No prior thread was resumed by this implementation. Session identifiers are omitted from the public projection.

## License

The existing MIT [LICENSE](LICENSE) is unchanged and confirmed for original code only. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for separate BioNeMo, AlphaGenome, source-data and other third-party boundaries.

## Parent refinement and current readiness

The source candidate now includes89 registry entries:18 curated chain tools and71 cached plugin manifests with344 skill records. Cached is not enabled/authenticated/runnable. Parent re-execution passed61 Node tests with a stable source snapshot. Additional10 Copilot inventory tests passed inside WD Ubuntu. Native Sites publication is the next bounded task; the prior source-push hold was released after review, but browser QA remains permission-blocked. See evidence/PARENT_ACCEPTANCE.md.
