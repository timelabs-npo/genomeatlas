#!/usr/bin/env python3
"""Dependency-free three-proteome demonstration, not a production phylogenomic pipeline.

Consumes the NCBI protein package already downloaded by the operator. Selects 12
annotation-named ribosomal proteins, aligns to the first taxon's sequence using
Needleman-Wunsch, removes noncanonical/gapped columns, and fits the unique
three-tip unrooted distance tree. Does not run GToTree, HMMER or DefenseFinder.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import itertools
import json
import platform
import random
import re
import shutil
from pathlib import Path
from write_pilot_manifest import finalize
from validate_pilot_accessions import validate

MARKERS = ('S3', 'S7', 'S10', 'S12', 'S13', 'S17', 'S18', 'L5', 'L14', 'L16', 'L18', 'L22')
AMINO = set('ACDEFGHIKLMNPQRSTVWY')


def fasta(path):
    records = []
    for line in path.read_text().splitlines():
        if line.startswith('>'):
            records.append([line[1:], ''])
        elif line.strip():
            if not records:
                raise ValueError(f'Invalid FASTA {path}')
            records[-1][1] += line.strip().upper()
    return records


def write_fasta(path, records):
    path.write_text(''.join(f'>{header}\n' + '\n'.join(seq[i:i+80] for i in range(0, len(seq), 80)) + '\n' for header, seq in records))


def align(a, b):
    """Global alignment: match +2, mismatch -1, linear gap -2; diagonal wins ties."""
    scores = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1): scores[i][0] = -2 * i
    for j in range(len(b) + 1): scores[0][j] = -2 * j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            scores[i][j] = max(scores[i-1][j-1] + (2 if a[i-1] == b[j-1] else -1), scores[i-1][j] - 2, scores[i][j-1] - 2)
    i, j, aa, bb = len(a), len(b), [], []
    while i or j:
        if i and j and scores[i][j] == scores[i-1][j-1] + (2 if a[i-1] == b[j-1] else -1):
            aa.append(a[i-1]); bb.append(b[j-1]); i -= 1; j -= 1
        elif i and scores[i][j] == scores[i-1][j] - 2:
            aa.append(a[i-1]); bb.append('-'); i -= 1
        else:
            aa.append('-'); bb.append(b[j-1]); j -= 1
    return ''.join(reversed(aa)), ''.join(reversed(bb))


def star_alignment(seqs):
    anchor = seqs[0]
    representations = []
    for seq in seqs:
        aa, bb = align(anchor, seq)
        insertions, residues, pos = [''] * (len(anchor) + 1), [], 0
        for x, y in zip(aa, bb):
            if x == '-': insertions[pos] += y
            else: residues.append(y); pos += 1
        representations.append((insertions, residues))
    widths = [max(ins[i].__len__() for ins, _ in representations) for i in range(len(anchor) + 1)]
    aligned = []
    for ins, residues in representations:
        aligned.append(''.join(ins[i].ljust(widths[i], '-') + (residues[i] if i < len(anchor) else '') for i in range(len(anchor) + 1)))
    assert all(a.replace('-', '') == s for a, s in zip(aligned, seqs))
    assert len({len(a) for a in aligned}) == 1
    return aligned


def write_tsv(path, fields, rows):
    with path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fields, delimiter='\t'); writer.writeheader(); writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--accessions', type=Path, required=True)
    parser.add_argument('--data', type=Path, required=True, help='Extracted ncbi_dataset/data directory')
    parser.add_argument('--metadata', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    accessions = validate(args.accessions)
    if len(accessions) != 3: raise ValueError('The local distance-tree demonstration requires exactly three genomes.')
    if args.out.exists() and any(args.out.iterdir()): raise ValueError('Output directory must be empty to avoid mixing runs.')
    args.out.mkdir(parents=True, exist_ok=True)
    for name in ('markers', 'alignments', 'trimmed'): (args.out/name).mkdir()
    shutil.copy2(args.accessions, args.out/'pilot_accessions.txt')
    shutil.copy2(args.metadata, args.out/'ncbi_metadata.json')
    metadata = {r['accession']: r for r in json.loads(args.metadata.read_text())['reports']}
    proteins, qc, selected, hits, partitions = {}, [], {}, [], []
    for accession in accessions:
        proteins[accession] = fasta(args.data/accession/'protein.faa')
        ids = [h.split()[0] for h, _ in proteins[accession]]
        if len(ids) != len(set(ids)): raise ValueError(f'Duplicate protein identifier in {accession}')
        record = metadata[accession]
        qc.append(dict(accession=accession, organism=record['organism']['organism_name'], strain=json.dumps(record['organism'].get('infraspecific_names', {})), assembly_level=record.get('assembly_info', {}).get('assembly_level'), current_accession=record.get('current_accession'), protein_records=len(ids), protein_fasta_sha256=hashlib.sha256((args.data/accession/'protein.faa').read_bytes()).hexdigest()))
    concat = [''] * 3
    for marker in MARKERS:
        selected[marker] = []
        for accession in accessions:
            matches = [(h, s) for h, s in proteins[accession] if re.search(r'\bribosomal protein '+marker+r'\s+\[', h)]
            if len(matches) != 1: raise ValueError(f'{accession}/{marker}: expected one annotation match, found {len(matches)}')
            header, seq = matches[0]
            if not seq or not set(seq) <= AMINO: raise ValueError(f'Noncanonical residues in {accession}/{marker}')
            selected[marker].append(seq)
            hits.append(dict(assembly_accession=accession, marker=marker, protein_accession=header.split()[0], length=len(seq), sequence_sha256=hashlib.sha256(seq.encode()).hexdigest(), original_header=header))
        write_fasta(args.out/'markers'/f'{marker}.faa', [(f'{a}|{marker}|'+next(h['protein_accession'] for h in hits if h['assembly_accession']==a and h['marker']==marker), s) for a,s in zip(accessions, selected[marker])])
        aligned = star_alignment(selected[marker])
        keep = [i for i, col in enumerate(zip(*aligned)) if all(c in AMINO for c in col)]
        trimmed = [''.join(s[i] for i in keep) for s in aligned]
        if not keep: raise ValueError(f'No alignment columns retained for {marker}')
        start = len(concat[0]) + 1
        concat = [a+b for a,b in zip(concat, trimmed)]
        partitions.append(dict(marker=marker, start=start, end=len(concat[0]), aligned_columns=len(aligned[0]), retained_columns=len(keep), dropped_columns=len(aligned[0])-len(keep)))
        write_fasta(args.out/'alignments'/f'{marker}.faa', zip(accessions, aligned))
        write_fasta(args.out/'trimmed'/f'{marker}.faa', zip(accessions, trimmed))
    n = len(concat[0])
    write_fasta(args.out/'concatenated.faa', zip(accessions, concat))
    write_tsv(args.out/'marker_accessions.tsv', list(hits[0]), hits)
    write_tsv(args.out/'input_qc.tsv', list(qc[0]), qc)
    write_tsv(args.out/'partitions.tsv', list(partitions[0]), partitions)
    (args.out/'partitions.nex').write_text('#nexus\nbegin sets;\n'+''.join(f"  charset {r['marker']} = {r['start']}-{r['end']};\n" for r in partitions)+'end;\n')
    pairs = list(itertools.combinations(range(3), 2))
    differences = [[int(a != b) for a,b in zip(concat[i], concat[j])] for i,j in pairs]
    distances = [sum(d)/n for d in differences]
    rng = random.Random(20260912)
    bootstrap = []
    for rep in range(1000):
        cols = [rng.randrange(n) for _ in range(n)]
        d = [sum(values[c] for c in cols)/n for values in differences]
        bootstrap.append(d)
    distance_rows=[]
    for k,(i,j) in enumerate(pairs):
        values=sorted(b[k] for b in bootstrap)
        distance_rows.append(dict(taxon_a=accessions[i], taxon_b=accessions[j], sites=n, differences=sum(differences[k]), p_distance=distances[k], bootstrap_percentile_2_5=values[24], bootstrap_percentile_97_5=values[974]))
    write_tsv(args.out/'distances.tsv',list(distance_rows[0]),distance_rows)
    write_tsv(args.out/'bootstrap_distances.tsv',['replicate']+[f'd{i}{j}' for i,j in pairs],[dict(zip(['replicate','d01','d02','d12'],[r+1]+d)) for r,d in enumerate(bootstrap)])
    d01,d02,d12=distances
    branches=[(d01+d02-d12)/2,(d01+d12-d02)/2,(d02+d12-d01)/2]
    if min(branches)<0: raise ValueError('Negative branch length: cannot represent distances as a nonnegative three-tip tree.')
    tree='('+','.join(f'{a}:{b:.9f}' for a,b in zip(accessions,branches))+');\n'
    (args.out/'unrooted_three_tip.nwk').write_text(tree)
    for k,(i,j) in enumerate(pairs): assert abs(branches[i]+branches[j]-distances[k])<1e-12
    metrics=dict(genomes=3, marker_count=12, proxy_fraction_of_119_markers=12/119, aligned_columns=sum(p['aligned_columns'] for p in partitions), retained_columns=n, variable_columns=sum(len(set(c))>1 for c in zip(*concat)), bootstrap_replicates=1000, bootstrap_seed=20260912, python=platform.python_version(), platform=platform.platform(), method='annotation-selected ribosomal proteins; center-star global alignment; complete deletion; uncorrected amino-acid p-distance; three-tip additive tree', publication_ready=False)
    (args.out/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
    report = ['# Three-genome phylogenetic demonstration', '', '**Executed locally using real NCBI protein sequences. Method demonstration only; publication readiness is not established.**', '', '## Scope and sources', '', 'The three accessions are the intersection of the parental frozen panel and the child frozen 150-genome table. The removed SRCM100442 accession was replaced with GCF_002970915.1. Twelve annotation-named ribosomal proteins provide a small proxy of approximately one tenth of the production 119-marker workload (12/119 = 10.1%). These are not claimed to be an HMM-selected subset of that exact marker set. Three genomes are 2% of the frozen 150-genome panel; the explicit maximum-three limit takes precedence over a 15-genome sample.', '', '| Assembly | Organism | Strain/isolate | Protein records |', '|---|---|---|---:|']
    for r in qc: report.append(f"| [{r['accession']}](https://www.ncbi.nlm.nih.gov/datasets/genome/{r['accession']}/) | {r['organism']} | {r['strain']} | {r['protein_records']} |")
    report += ['', 'The sibling source package contains the downloaded NCBI ZIP, extracted protein FASTA/GFF files, metadata and retrieval receipts. Assembly versions, protein accession versions, original headers and sequence hashes are retained. Protein WP identifiers may have MULTISPECIES headers; host identity is taken from the assembly metadata, not inferred from a protein header.', '', '## Executed methods', '', 'Selected exactly one protein annotated with each of: '+', '.join(MARKERS)+'. Ambiguous/missing matches, duplicate IDs and noncanonical residues fail the run. Orthology is provisional annotation-based, without profile or gene-context confirmation. Each sequence was globally aligned to the first accession using Needleman–Wunsch (match +2, mismatch −1, linear gap −2; diagonal, then deletion, then insertion tie preference). Pairwise alignments were merged on that shared reference; insertions are left-aligned and padded. Columns containing a gap or noncanonical residue in any taxon were removed. This simple alignment/scoring approach is suitable for an environment demonstration, not a replacement for the full HMMER/MUSCLE/trimAl workflow.', '', f"The {metrics['aligned_columns']} aligned columns yielded **{n} complete columns**, including **{metrics['variable_columns']} variable columns**. Original, aligned and trimmed marker FASTAs plus the concatenation, partitions and 36 accession records are exported. The aligned sequences were checked against original ungapped sequences; all resulting tree pair distances reproduce the calculated matrix to numerical precision.", '', 'Uncorrected amino-acid mismatch fractions were calculated on that common complete alignment. An unrooted three-tip tree was fitted algebraically with each terminal branch equal to half the sum of its two pair distances minus the remaining pair distance. Branch lengths are observed mismatch fractions, not estimated substitutions/site or divergence time.', '', '| Pair | p-distance | 95% site-bootstrap percentile interval |', '|---|---:|---:|']
    for r in distance_rows: report.append(f"| {r['taxon_a']} / {r['taxon_b']} | {r['p_distance']:.6f} | {r['bootstrap_percentile_2_5']:.6f}–{r['bootstrap_percentile_97_5']:.6f} |")
    report += ['', 'The 1,000 replicates resample concatenated columns with seed 20260912. Intervals describe site-sampling variation conditional on the selected markers and alignment; they do not capture marker selection, alignment/model uncertainty or dependence between sites. With three taxa there is only one unrooted topology and no nontrivial internal split; topology bootstrap support and a resolved rooted relationship cannot be inferred. No outgroup or clock was assumed.', '', '```newick', tree.strip(), '```', '', '## Additional proofs and publication gate', '', '| Evidence | State | Needed before scientific approval |', '|---|---|---|', '| Real sequence provenance | Present | Independent verification of source package and accession-to-host mapping |', '| Local integrity manifest | Present | Check SHA256SUMS.txt after transfer; hashes detect changed bytes but do not authenticate authorship or prove biology |', '| Runtime and command receipt | Present | Re-execute the saved command and compare output hashes |', '| Full conserved-marker orthology | NOT RUN | GToTree/HMMER version and marker database digest; single-copy occupancy; duplicate/paralog review |', '| Maximum-likelihood inference | NOT RUN | Curated marker alignment, model/partition assessment, suitable taxa/outgroup, branch support, sensitivity analysis and discordance checks |', '| Assembly quality | Metadata retained; not a new quality run | Confirm completeness ≥95%, contamination ≤5%, contigs ≤100 against the repository policy; independently verify suspicious assemblies |', '| R-M system calls | NOT RUN | DefenseFinder model/version digests, raw hits, locus completeness, genomic/plasmid/contig-edge context; profile false positives reviewed |', '| Recognition motifs/function | NOT ESTABLISHED | Strain-specific curated REBASE/publication anchor and experimental evidence; a methyltransferase or motif match alone does not prove active restriction |', '| Functional validation | NOT RUN | Strain-matched methylome, biochemical, genetic or transformation evidence and controls sufficient for the specific claim |', '| Independent agreement | NOT RUN | Real independent analyses and adjudication of discrepancies; model labels are not cryptographic evidence |', '| Remote CI at implementation head | NOT RUN | A successful GitHub run tied to the final implementation commit; historical main results do not satisfy this |', '', 'No R-M absence, plasmid safety, functional restriction, clinical utility, publication approval, or independent model consensus is claimed. The Linux GToTree and DefenseFinder environment remains unexecuted locally on this Mac. The completed demo proves that a small real sequence package can be audited, aligned, exported and checked using the current local environment.', '', '## Reproduction', '', 'Run the repository scripts/run_local_marker_demo.py with --accessions config/stage3_pilot_accessions.txt, --data pointing to the extracted ncbi_dataset/data folder, --metadata pointing to the retained ncbi_metadata.json, and --out pointing to a new empty directory. Exact absolute command arguments and exit status are in the shared sci-local-marker-demo.log / commands.jsonl receipts. Import concatenated.faa into Geneious as an amino-acid alignment; partitions.nex records marker ranges; unrooted_three_tip.nwk is an unrooted tree.', '']
    (args.out/'PHYLOGENETIC_DEMO_REPORT.md').write_text('\n'.join(report))
    finalize(args.out, 0)
    print(json.dumps(metrics,indent=2)); print('Newick:',tree.strip()); print('Report:',args.out/'PHYLOGENETIC_DEMO_REPORT.md')


if __name__=='__main__': main()
