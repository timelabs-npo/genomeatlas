# Frozen GenomeAtlas contracts

These files are byte-for-byte copies from `timelabs-npo/genomeatlas` at commit
`5cc89fb6379e9b1cdaf3cbd96c571e14d9075a8b`. `provenance.json` records their original
paths and SHA-256 hashes. Registry status values are historical observations from
that source snapshot, not current service availability or scientific validation.

The dispatcher maps its three catalog cards to the existing `tree`, `rm`, and
`evidence` chain IDs. It uses the parent template's `review-queue` destination
alias and the three accessions in the repository's Stage 3 pilot configuration.
The request schema describes intent only and cannot authorize execution.

When updating these snapshots, copy all contracts from one reviewed parent
commit, update the provenance, and run the dispatcher tests. Do not substitute
invented registry entries or silently upgrade probe states.
