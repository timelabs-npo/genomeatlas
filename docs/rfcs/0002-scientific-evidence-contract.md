# RFC 0002: Scientific evidence contract

- **Status:** Accepted
- **Date:** 2026-09-12
- **Scope:** genomic pilots, R-M review, file inspection and plasmid motif exploration

## Purpose

The workbench is a traceability instrument. It must make it easy to distinguish a reproducible computation from a scientific conclusion. Every result shown as evidence therefore has a bounded input set, a method/version, a status and a path to the underlying artifact.

## Frozen inputs and pilot boundary

The inherited GenomeAtlas study defines a frozen panel of 177 accessions. The interactive workbench permits at most three selected accessions for the browser pilot so that the user can inspect the full path without mistaking a demonstration for the planned panel. The published pilot is limited to three versioned NCBI assemblies, 118 retained marker alignments, 350 source-protein mappings and 1,240 matching SHA-256 manifest entries. Those numbers describe the checked artifact at the published commit; they do not establish a complete 177-genome result.

The accession manifest is an exact-input contract. A task must preserve accession spelling and order, record the source package and assembly references, and expose the resulting files for inspection. Hash equality proves byte consistency with the manifest; it does not authenticate a signer or prove that a biological interpretation is true.

## Evidence states

All task and tool results must be representable by one of these states:

- `PASS`: the stated check ran and its acceptance rule passed.
- `PARTIAL`: a bounded subset or incomplete system was observed; no complete claim is implied.
- `FAIL`: the check ran and its acceptance rule failed.
- `BLOCKED`: execution could not start or continue because a required input/tool was unavailable.
- `NOT_TESTED`: the check is in scope but has not been run.
- `NOT_ASSESSED`: the available data cannot answer the question.

Unknown, failed and unreviewed R-M calls remain visible. A missing result must not be silently converted into a negative biological finding.

## Phylogeny and R-M separation

Host topology is constructed from the declared conserved marker set. Restriction-modification candidates are analyzed independently and mapped only after the host tree artifact has passed its own gates. R-M genes must not be used to manufacture host topology. A three-tip unrooted tree has no nontrivial split to support; support values therefore cannot be interpreted as evidence for a meaningful internal clade in that pilot.

## Plasmid sandbox contract

The sandbox accepts IUPAC DNA patterns and scans both the forward sequence and its reverse complement. It retains overlapping matches and matches crossing the origin of a circular sequence. The map, table and highlighted sequence are views of the same match set; exports are JSON or CSV derived from that set. Input limits, synthetic-example labels and aborted-run behavior are part of the contract. A motif match is a computational observation, not proof of plasmid presence, restriction activity, transformation success or laboratory safety.

## Acceptance gates

Each workflow must name its gates before execution. Typical gates include exact accession equality, required-file presence, provenance preservation, schema validity, hash agreement and required support fields. A gate can pass while the broader biological hypothesis remains unassessed. Reviewers should cite the artifact, commit, method version and status when reporting a result.

## Reproducibility record

The minimum receipt for a scientific artifact is: canonical Git commit, clean-tree status, exact inputs, tool/model version, command or browser operation, output paths, SHA-256 where applicable, status and known limits. The root `npm run check` gate verifies software contracts; it is evidence that the software checks passed, not evidence that an experiment succeeded.
