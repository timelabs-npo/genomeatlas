"""Import preserved pilot outputs without changing their bytes; never executes biology."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1]).resolve()
target = repo / 'apps/genomeops-atlas/public/evidence'
target.mkdir(parents=True, exist_ok=True)
archive = (source / 'stage3-live-artifact.zip').read_bytes()
assert hashlib.sha256(archive).hexdigest() == 'c9e4a292c00aa644b3516c7705f02d2bbfb0e8f14f3071361044ffe4dfc0128d'
(target / 'stage3-live-artifact.zip').write_bytes(archive)
with zipfile.ZipFile(source / 'stage3-live-artifact.zip') as z:
    for name in ['PILOT_SUMMARY.md', 'SHA256SUMS.txt', 'execution_status.json', 'pilot_accessions.txt',
                 'marker_protein_accessions.tsv', 'marker_sequences.faa', 'gtotree_output/Aligned_SCGs.faa',
                 'gtotree_output/gtotree.tre', 'gtotree_output/run_files/Partitions.txt']:
        (target / Path(name).name).write_bytes(z.read(name))
for name in ['stage3-live-proof.json', 'STAGE3_LIVE_PROOF.md', 'independent-live-artifact-review.md']:
    (target / name).write_bytes((source / name).read_bytes())
files = [{ 'name': p.name, 'url': f'/evidence/{p.name}', 'bytes': p.stat().st_size,
           'sha256': hashlib.sha256(p.read_bytes()).hexdigest() } for p in sorted(target.iterdir()) if p.is_file()]
manifest = {'schema': 'genomeatlas.published-evidence/1',
            'sourceCommit': '50dc45fe790cb28f323d66382a4595ecd3a5234c',
            'runUrl': 'https://github.com/serg-alexv/genomeops-atlas/actions/runs/34650562319',
            'verifiedAt': '2026-09-11T21:46:00.420576+00:00', 'files': files}
(repo / 'apps/genomeops-atlas/src/data/publishedEvidence.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'packaged_files': len(files), 'total_bytes': sum(f['bytes'] for f in files), 'files': files}, indent=2))
