# RFC 0001: GenomeAtlas Workbench architecture

- **Status:** Accepted
- **Date:** 2026-09-12
- **Owners:** timelabs-npo/genomeatlas maintainers
- **Scope:** `apps/genomeops-atlas` and the root publication/deployment contract

## Problem

Genetic-engineering work often begins with an underspecified question and a large, mixed-quality collection of files. The workbench must make the next useful action obvious without implying that a catalog entry, a prompt, or a browser calculation is a scientific conclusion.

## Design

The repository root is the integration and verification boundary. The React/Vite application lives in `apps/genomeops-atlas`; its static output is `apps/genomeops-atlas/dist`. The root Python contracts and pilot scripts remain independent source and verification layers. Vercel builds from the root and serves the nested application output.

The product is organized as a shared state shell plus evidence-oriented workspaces:

1. **Your inputs** owns the in-memory study context: selected frozen accessions (up to three for the pilot), sequence text, research context and selected catalog tools.
2. **Task workspaces** turn that context into a scoped brief, required files, a working table and explicit evidence expectations. Each task has its own preparation path; task buttons do not all open the same generic dialog.
3. **Workflow Dispatcher** inspects user-provided files and creates a schema-compatible request. It reports byte hashes and structural checks; it does not claim biological ownership, completeness or acceptance.
4. **Plasmid Sandbox** performs deterministic, local IUPAC motif matching on both strands, including overlaps and circular-origin matches. Its synthetic examples are labeled, and an aborted computation cannot be presented as a complete result.
5. **Evidence and pilot views** expose the checked three-genome artifact and its provenance. They are bounded demonstrations, not a substitute for the full study.

## State and data flow

```text
user inputs -> task preparation -> configured brief / export
      |              |
      v              v
dispatcher inspection       evidence expectations
      |              |
      +-------> receipts, hashes, and reviewable artifacts
```

State is page-local and intentionally ephemeral. Reloading clears the context; files are read in the browser and are not uploaded automatically. A derived inspection carries the input signature it used. If the shared inputs change, the UI marks the older inspection stale instead of silently reusing it.

## Extension points

New task workspaces should add a task definition, required-input contract, output template and acceptance gates together. New tools belong in the frozen catalog with an availability note and a provenance link. New computation views must state their input alphabet, algorithm, limits, failure state and export format. A visual change that alters an evidence or retention contract requires an RFC amendment.

## Verification and deployment

The supported local gate is `npm run check`, followed by `npm run build`. It covers root data/receipt contracts, pilot-script regressions, lint, Vitest and the production Vite build. Use Node 22 or 24; Node 24 was the verified runtime for the 2026-09-12 release. The production identity is recorded in `/build-receipt.json`, which binds the served static build to a Git commit and clean-tree build.

## Non-goals

This RFC does not turn the catalog into an execution service, upload private files, authenticate biological claims, select an account-specific ChatGPT model, or replace laboratory validation. Destination links open a prepared brief; the destination remains responsible for its own permissions and execution.
