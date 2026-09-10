# Demo additional proofs required for approval and publication

This file defines the evidence bundle that must accompany a real 3-genome pilot and later the full 177-genome run.

## Required proof categories

| Category | Minimum proof file | Acceptance condition |
|---|---|---|
| Input identity | `selected_accessions.txt`, `selected_panel.tsv`, hashes | Exact accession set, no Enterococcus, explicit outgroups |
| Download | `download_manifest.tsv`, `download_audit.json`, NCBI logs | Every expected genome has genome/protein/CDS/GFF/GBFF/sequence-report files |
| Marker extraction | `marker_protein_manifest.tsv`, `all_exact_marker_proteins.faa` | Every marker sequence traces back to one source protein ID |
| Alignment | concatenated FASTA/NEXUS, partition report | Equal sequence lengths, accepted missingness, Geneious opens amino-acid alignment |
| Tree | Newick, IQ-TREE report/log, support values | Exact tip count, model/support recorded, rooting justified |
| R-M annotation | DefenseFinder raw outputs, summary matrix | Failed jobs are not coded as absence; Type IIG maps to Type II |
| Manual curation | partial-locus review table | Orphans/contig-edge calls separated from complete systems |
| Literature/evidence | evidence table with DOI/PMID | E0/E1/E2/E3/E4 grades assigned from exact evidence |
| Figure | SVG/PDF/source data | Every ring cell maps to one row in the R-M matrix |
| Reproducibility | `completion_receipt.json`, `SHA256SUMS.txt` | All files exist, hashes match, status is not PASS with blockers |

## Publication blocker examples

- Fewer genomes processed than expected.
- Any accession missing from the downloaded package.
- Any failed external job recorded as `0` rather than `FAILED`.
- Any R-M presence state lacking gene/protein evidence.
- Any experimental claim not tied to an exact publication and strain/system.
- Any final figure generated manually without source data mapping.

## Demo-specific note

The current demo intentionally uses synthetic sequence payloads. It is acceptable as an implementation/environment proof only. It is not acceptable as biological evidence or as a manuscript result.
