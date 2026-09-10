# GitHub error-fix / integration report for demo run

## Current repository baseline

Repository: `timelabs-npo/genomeatlas`  
Base branch: `main`  
Base commit used for demo branch: `5cc89fb6379e9b1cdaf3cbd96c571e14d9075a8b`  
Base commit message observed through GitHub: `Deploy only rebuilt and tested allowlisted Pages artifacts; prevent stale data modules`

## Action performed

Created branch:

```text
demo/lab-rm-3genome-20260910
```

Added four text evidence files under:

```text
evidence/demo-runs/20260910/
```

Files:

1. `DEMO_PHYLOGENETIC_ANALYSIS_REPORT.md`
2. `DEMO_PUBLICATION_PROOF_TEMPLATE.md`
3. `DEMO_RUN_RECEIPT.json`
4. `DEMO_TEST_RESULTS.tsv`

Opened draft PR:

```text
https://github.com/timelabs-npo/genomeatlas/pull/28
```

PR head commit at creation:

```text
d6ef90ffa568f16a79d132acca1b431875cedae7
```

## Important status

The PR is **draft**, **open**, **not merged**, and GitHub reported `mergeable: false` at PR creation. This likely reflects GitHub's initial mergeability computation state or a real merge conflict; it must be rechecked before merging.

No main-branch mutation was performed.

## What this fixes

This adds a small, auditable, repository-visible demo evidence location rather than keeping the demo only inside the chat sandbox. It also avoids the previous failure mode where claims of demo or site status existed only as prose.

## What it does not fix

- It does not run live NCBI Datasets.
- It does not run live GToTree.
- It does not run live IQ-TREE.
- It does not run live DefenseFinder.
- It does not prove any biological R-M distribution.
- It does not publish a new GitHub release.
- It does not update the native ChatGPT Site.

## Required next GitHub actions

1. Re-check PR #28 mergeability after GitHub finishes computing it.
2. If mergeable, run repository CI or at least markdown/schema checks.
3. If not mergeable, rebase `demo/lab-rm-3genome-20260910` on current `main` without overwriting existing evidence.
4. Add the ZIP artifact to a GitHub Release only after the branch is accepted or attach it as a release asset with explicit synthetic-demo status.
5. Do not promote PR #28 from draft until a live 3-genome pilot or explicit owner approval accepts synthetic-only demo evidence as sufficient for the next stage.
