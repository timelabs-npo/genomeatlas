#!/usr/bin/env python3
"""Finalize portable, relative-path evidence after all result files are written."""
import hashlib
import json
import sys
from pathlib import Path


def finalize(root: Path, status: int) -> None:
    (root / 'execution_status.json').write_text(json.dumps({
        'exit_code': status,
        'status': 'completed' if status == 0 else 'failed',
        'scientific_approval': False,
    }, indent=2) + '\n')
    excluded = {'SHA256SUMS.txt', 'output_inventory.tsv', 'file_inventory.tsv'}
    files = sorted(p for p in root.rglob('*') if p.is_file() and str(p.relative_to(root)) not in excluded)
    inventory = 'path\tbytes\n' + ''.join(f'{p.relative_to(root)}\t{p.stat().st_size}\n' for p in files)
    (root / 'output_inventory.tsv').write_text(inventory)
    files.append(root / 'output_inventory.tsv')
    lines = []
    for path in sorted(files):
        digest = hashlib.sha256()
        with path.open('rb') as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b''):
                digest.update(block)
        lines.append(f'{digest.hexdigest()}  {path.relative_to(root)}\n')
    (root / 'SHA256SUMS.txt').write_text(''.join(lines))


if __name__ == '__main__':
    finalize(Path(sys.argv[1]), int(sys.argv[2]))
