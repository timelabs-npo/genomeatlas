# LAB R-M Figure 2 — DEMO RUN report (3-genome minimal test)

**Run ID:** `LAB-RM-DEMO-3GENOME-20260910`  
**Status:** `PASS`  
**Purpose:** confirm the implementation strategy and local file-processing environment before any long run.

## Scope and honesty boundary

This is a **minimal implementation demo**, not a biological result. It uses three real accession identities from the frozen 177-genome panel, but the genome/protein/R-M payloads are synthetic mini-records generated locally because the parent sandbox cannot perform a live NCBI genome download or run the external GToTree/IQ-TREE/DefenseFinder stack.

The demo validates: input manifests, accession accounting, proteome preparation, exact marker-sequence export, alignment/tree file contracts, Geneious NEXUS export, R-M matrix creation, iTOL ring-file generation, figure rendering, file hashes, and completion-receipt format.

The demo does **not** validate: real NCBI retrieval, true conserved-marker discovery, true maximum-likelihood inference, true DefenseFinder output, real R-M biology, or publication claims.

## Selected subset

| Group | Accession | Display label | Assembly level |
|---|---|---|---|
| Lactococcus | `GCF_023499275.1` | Lactococcus petauri B1726 | Complete Genome |
| Leuconostoc | `GCF_007954785.1` | Leuconostoc citreum CBA3621 | Complete Genome |
| Weissella | `GCF_036327715.1` | Weissella paramesenteroides MbWp-142 | Complete Genome |

Outgroups included only for rooting-test file contracts: `GCF_000009045.1`, `GCF_000196035.1`.

## Pipeline steps executed

1. Created pseudo-NCBI package layout with genome FASTA, CDS FASTA, protein FASTA, GFF, GBFF and sequence-report files.
2. Ran `audit_ncbi_package.py` to verify file discovery and manifest generation.
3. Ran `prepare_phylo_proteomes.py` to create accession-named proteomes.
4. Created synthetic GToTree-compatible marker-hit folders for three conserved markers across 5 taxa.
5. Ran `export_marker_sequences.py` to map marker hits back to exact protein IDs and sequences.
6. Created a synthetic concatenated amino-acid alignment and Newick tree.
7. Ran `root_prune_and_label_tree.py` and `fasta_alignment_to_nexus.py`.
8. Created synthetic DefenseFinder-compatible outputs for Type I/II/III/IV state testing.
9. Ran `summarize_defensefinder.py`, `make_itol_datasets.py`, and `draw_circular_tree.py`.
10. Wrote file manifest, test table, and JSON receipt.

## Demo R-M states

| Accession | Type I | Type II | Type III | Type IV |
|---|---:|---:|---:|---:|
| `GCF_023499275.1` | C | C | 0 | 0 |
| `GCF_007954785.1` | 0 | C | C | 0 |
| `GCF_036327715.1` | 0 | 0 | 0 | C |

Legend: `C` = complete computational call in the synthetic DefenseFinder-compatible demo output; `0` = not detected in demo output. This legend is for the demo only.

## Test summary

- Total checks: **18**
- Passed: **18**
- Failed: **0**

See `DEMO_TEST_RESULTS.tsv` and `DEMO_RUN_RECEIPT.json`.

## What this proves

The local helper scripts can process a minimal accession-scoped dataset through the expected file contracts and produce the demo equivalents of the core final artifacts: manifest, marker sequence export, NEXUS, Newick, R-M matrix, iTOL rings, figure, hashes and receipt.

## What remains before real pilot approval

1. Run the same workflow with live NCBI Datasets on a 3-genome real subset.
2. Run actual GToTree marker extraction.
3. Run actual IQ-TREE or documented fallback tree inference.
4. Run actual DefenseFinder with versioned models.
5. Compare real outputs to the proof template and reject any FAILED/NA stage rather than treating it as absence.
