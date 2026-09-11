# GenomeOps Atlas v0.2 verification

## Dispatcher and sandbox update — 2026-09-12

- `npm run check`: lint, 32 tests in 9 files, TypeScript and Vite production build pass under Node 24.19.0. Node 26.8.2 also passes with `NODE_OPTIONS=--no-experimental-webstorage`; its default native storage conflicts with Vitest/jsdom.
- Existing application dependencies and lockfile are unchanged.
- Rendered checks used installed Chrome with the bundled Playwright against the local development server and the production build at `http://127.0.0.1:4176`, at 1600 × 1000 and 390 × 844. The Browser plugin was not available.
- Catalog selection, three-accession schema-shaped JSON, copying the exact current request, desktop/mobile navigation, deep-link reload, empty input, invalid bases, motif counts and strain changes pass.
- No Vite error overlay, blank page or relevant console errors. The pre-existing missing `/favicon.ico` request is a separate 404, not an application runtime error.
- Corrected an existing mobile specificity conflict: the advanced project rail retained its desktop top offset after switching to relative positioning, overlapping the page title. Mobile checks include rail/title geometry at scroll zero, input focus and no horizontal document overflow. Screenshots and exact command receipts are saved with the external implementation deliverables.
- Contract tests verify all five frozen parent source hashes, real chain/tool IDs, panel membership, and agreement between the dispatcher and scientific pilot accessions.
- The receipt is tested as a reusable component; it is not connected to a fabricated execution record. No cryptographic signature or biological claim is validated by its presentation.
- Full scientific execution and publication acceptance are separate gates; see `analyses/lab-rm-phylogenomics/README.md`.

## Earlier pilot verification

Checked on 2026-08-18.

## Automated gate

- `npm run lint` — passed.
- `npm run test` — 4 files and 11 tests passed.
- `npm run build` — passed with TypeScript compilation and a Vite production build.

## Everyday workflow verification

Tested in the Codex in-app browser against the production build:

- desktop layout at 1536 × 1000;
- mobile layout at 390 × 844 with no horizontal document overflow;
- English and Russian switch the complete routine, including the active A/B result and timer state;
- ordinary comparison text routes to the comparison workflow without prompt syntax;
- A and B can be selected independently and B starts as the explained recommendation;
- the 10-minute timer starts, pauses, resumes, records checklist progress, and completes;
- a completed route appears in **My aims** and can be reopened from local browser storage;
- the advanced workspace opens behind an explicit boundary and returns to the guide;
- advanced source records are accurately identified as English-only;
- no browser console warnings or errors were reported.

## Advanced workspace regression

- evidence-node selection still updates the decision brief;
- deterministic prompt and task-routing tests still pass;
- genome-analysis routing still excludes Codex-Spark from the scientific chain;
- the AI Workforce registry, tool advisor, prompt recipes, and local research-memory views remain available.

## Visual contract comparison

The rendered implementation was checked against new ImageGen desktop and mobile concepts.

- Copy and navigation: one plain-language question, **My aims**, and EN/RU are the primary controls.
- Layout: the single-column composer leads into one compact response and A/B test; expert modules no longer compete above the fold.
- Typography and palette: high-contrast navy type, white space, soft gray response panels, and one lime action color follow the concept.
- Spacing and containers: the composer, quick starts, response grid, and centered test action use the concept's bounded rhythm.
- Responsive behavior: quick starts become two columns and answer/A-B sections stack on mobile without overflow.
- Motion: transitions are short and functional; reduced-motion preferences disable non-essential animation.

Material visual mismatches found during QA—an early heading wrap, oversized composer spacing, delayed response placement, and test-action alignment—were corrected before this gate.

## Production boundary

The stable release target is `https://genomeops-atlas.vercel.app/`. Each publication is checked for a ready deployment, HTTP 200 at the stable URL, expected security headers, a clean runtime-error check, and one live bilingual interaction path.

The pilot verifies its deterministic UI, local persistence, responsive layout, advanced-workspace boundary, and repository checks. It does not verify biological claims, external tool results, private-data isolation in third-party models, or future GitHub-backed synchronization.
