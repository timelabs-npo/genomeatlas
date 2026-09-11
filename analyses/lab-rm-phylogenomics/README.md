# LAB restriction–modification phylogenomics for review Figure 2

This analysis builds an organism-level phylogeny of selected lactic acid bacteria (LAB) and maps Type I–IV restriction–modification (R-M) system states as four external annotation rings.

## Scope

Enterococcus is excluded. The operational taxon groups are:

1. Lactococcus
2. Streptococcus thermophilus
3. Lactiplantibacillus
4. Lacticaseibacillus
5. Limosilactobacillus
6. Lactobacillus sensu stricto
7. Leuconostoc
8. Pediococcus
9. Oenococcus
10. Weissella

The initial target is 18 assemblies per group (180 total), adjusted only where the available high-quality RefSeq genome coverage makes that impossible.

## Evidence model

R-M information will be retained at four evidence levels:

- **0 — no convincing call:** no complete system or curated partial candidate detected;
- **P — partial candidate:** relevant components/profile hits, but not a complete computationally detected system;
- **C — complete computational prediction:** a complete Type I, II/IIG, III, or IV system detected from gene content and genomic organization;
- **V — externally validated:** supported by strain-specific biochemical, genetic, phage/transformation, or methylome evidence and a concrete publication/database record.

A methyltransferase alone is not automatically treated as a functional R-M system. A methylome motif demonstrates active modification, not necessarily active restriction.

## Planned stages

### Stage 1 — genome discovery and balanced selection

- Query current annotated RefSeq assemblies through NCBI Datasets.
- Prefer complete/chromosome assemblies and use scaffolds only where necessary.
- Exclude MAGs, atypical assemblies, multi-isolate assemblies, and unnamed `sp.` records from the visible panel.
- Select one best assembly per named species first, then add strains round-robin until the group quota is met.

### Stage 2 — download and sequence audit

- Download genome FASTA, protein FASTA, GFF3, GBFF, and NCBI metadata for every selected assembly.
- Freeze accession versions and compute checksums.
- Verify taxonomic names, replicons, annotation status, assembly quality, and strain labels.

### Stage 3 — host phylogenomics

- Identify a conserved single-copy bacterial marker set in each selected annotated proteome.
- Retain original NCBI protein accessions where possible.
- Align markers independently, trim, concatenate, and infer a maximum-likelihood host tree with branch support.
- Export individual marker FASTAs, marker-accession tables, individual alignments, a concatenated Geneious-ready protein alignment, partition metadata, and Newick trees.

### Stage 4 — R-M annotation and curation

- Run DefenseFinder on each selected proteome.
- Extract complete R-M system calls and raw R-M component/profile hits.
- Inspect GFF/GBFF genomic context to classify complete, partial, orphan, plasmid-borne, and contig-edge loci.
- Cross-check R-M-specific annotations and recognition motifs against REBASE.
- Curate published strain-specific evidence separately from computational prediction.

### Stage 5 — Figure 2 assets

- Color host branches/labels by taxonomic group.
- Generate four external ring datasets: Type I, Type II, Type III, Type IV.
- Export iTOL-compatible files, editable SVG/PDF figure drafts, and genus-level summaries.

## Reproducibility outputs

The final package is intended to contain:

- selected and excluded assembly tables;
- exact genome and protein accession tables;
- exact marker protein sequences for every organism;
- individual and concatenated alignments;
- a Geneious import guide and ready-made alignment file;
- host tree(s) in Newick format;
- full R-M locus inventory with evidence status and publications;
- four ring annotation files and taxonomic branch-color files;
- commands, software/database versions, checksums, and methods text.

## Current status

Stage 1 is implemented by the branch-specific job in `.github/workflows/verify.yml` and `scripts/discover_genomes.sh`. The live NCBI discovery run is being executed through the draft pull request; selection output remains provisional until real candidate coverage is reviewed.

## Bounded demonstration

The Stage 3 and Stage 4 pilot lists are limited to three versioned assemblies.
Both runners validate the limit before downloading data and require the configured
Linux x86_64 environment. GToTree 1.8.17 is invoked with `-d -k` to retain
debug marker FASTAs and individual alignments. Marker protein IDs are recovered
by exact sequence matching against archived input proteomes, with ambiguity
explicitly labeled. GToTree deletes raw HMM score tables even with `-d`, so those
scores are not claimed as exported evidence. Its optional renamed alignment is
not required when no label mapping was requested. The complete output directory
is preserved even if later checks fail; the final relative-path SHA-256 manifest
includes the summary, inventory and execution status. A completed command and a
file hash are not scientific approval.

`scripts/run_local_marker_demo.py` provides a dependency-free local demonstration
when the Linux bioinformatics tools are unavailable. It takes an extracted NCBI
protein package and its assembly metadata, requires exactly the three pilot
accessions, and selects 12 uniquely annotation-named ribosomal proteins. It
exports source protein identifiers, marker alignments, partitions, amino-acid
distances and the unique three-tip unrooted distance tree. The report describes
its simple reference-based alignment and all limitations. It does not perform
HMM-based orthology detection, maximum-likelihood inference or R-M calling.

```bash
python3 analyses/lab-rm-phylogenomics/scripts/run_local_marker_demo.py \
  --accessions analyses/lab-rm-phylogenomics/config/stage3_pilot_accessions.txt \
  --data /path/to/ncbi_dataset/data \
  --metadata /path/to/ncbi_metadata.json \
  --out /path/to/new-empty-demo-output
```

The small local demo must not be used to approve a publication or infer plasmid
safety. Full marker validation, assembly quality review, model/partition and
tree sensitivity checks, strain-specific R-M locus/motif curation, and suitable
experimental evidence remain separate requirements. Three taxa provide no
nontrivial unrooted split whose topology support could be tested.
