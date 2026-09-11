#!/usr/bin/env python3
"""Enforce the requested small, versioned, non-duplicated pilot before execution."""
import argparse
import re
import sys
from pathlib import Path


def validate(path: Path) -> list[str]:
    accessions = path.read_text().splitlines()
    if not 1 <= len(accessions) <= 3:
        raise ValueError('Pilot must contain between one and three assembly accessions.')
    if any(not re.fullmatch(r'GCF_[0-9]{9}\.[1-9][0-9]*', a) for a in accessions):
        raise ValueError('Each line must contain one versioned RefSeq assembly accession.')
    if len(set(accessions)) != len(accessions):
        raise ValueError('Pilot assembly accessions must be unique.')
    return accessions


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', type=Path)
    parser.add_argument('--normalized', type=Path)
    args = parser.parse_args()
    try:
        values = validate(args.path)
        if args.normalized:
            args.normalized.write_text('\n'.join(values) + '\n')
    except (ValueError, OSError) as error:
        sys.exit(str(error))
    print(f'Validated bounded pilot: {len(values)} genomes.')
