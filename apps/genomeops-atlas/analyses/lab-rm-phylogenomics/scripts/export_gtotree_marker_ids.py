#!/usr/bin/env python3
"""Recover source protein IDs from GToTree's retained pre-alignment sequences.

GToTree 1.8.17 rewrites marker FASTA headers to assembly IDs and deletes its raw
HMM tables. Exact sequence matching recovers source candidates without inventing
lost HMM scores. Identical proteins remain explicitly ambiguous.
"""
import argparse
import csv
import hashlib
from collections import defaultdict
from pathlib import Path


def read_fasta(path):
    records = []
    for line in path.read_text().splitlines():
        if line.startswith('>'):
            records.append([line[1:], ''])
        elif line.strip():
            if not records:
                raise ValueError(f'Invalid FASTA: {path}')
            records[-1][1] += line.strip().upper()
    return records


def export(gtotree, proteomes, out):
    indices = {}
    for path in sorted(proteomes.glob('*.faa')):
        index = defaultdict(list)
        for header, sequence in read_fasta(path):
            index[sequence].append(header)
        indices[path.stem] = index
    markers = sorted(gtotree.glob('gtotree.tmp.*/*_hits_filtered.faa'))
    if not markers:
        raise ValueError('No retained pre-alignment marker FASTAs; run GToTree with -d.')
    rows, sequences = [], []
    for path in markers:
        marker = path.name.removesuffix('_hits_filtered.faa')
        for header, sequence in read_fasta(path):
            assembly = header.split()[0]
            candidates = indices.get(assembly, {}).get(sequence, [])
            if not candidates:
                raise ValueError(f'No exact source protein match for {assembly}/{marker}.')
            for candidate in candidates:
                rows.append(dict(assembly_accession=assembly, marker=marker,
                                 protein_accession=candidate.split()[0],
                                 mapping='unique_exact_sequence' if len(candidates) == 1 else 'ambiguous_identical_sequence',
                                 candidate_count=len(candidates),
                                 sequence_sha256=hashlib.sha256(sequence.encode()).hexdigest(),
                                 original_header=candidate))
            sequences.append(f'>{assembly}|{marker}\n{sequence}\n')
    if not rows:
        raise ValueError('Marker FASTAs contained no source-mapped sequences.')
    with (out / 'marker_protein_accessions.tsv').open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]), delimiter='\t')
        writer.writeheader(); writer.writerows(rows)
    (out / 'marker_sequences.faa').write_text(''.join(sequences))
    print(f'Recovered {len(rows)} source protein candidate mappings for {len(sequences)} marker sequences.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gtotree', type=Path, required=True)
    parser.add_argument('--proteomes', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    export(args.gtotree, args.proteomes, args.out)
