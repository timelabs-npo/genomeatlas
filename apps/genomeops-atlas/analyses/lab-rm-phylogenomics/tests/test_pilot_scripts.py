"""Offline regression checks for orchestration; fixtures are not scientific runs."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
spec = importlib.util.spec_from_file_location('pilot_validation', SCRIPTS/'validate_pilot_accessions.py')
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)
ACCESSIONS = ['GCF_000468955.1', 'GCF_903886475.1', 'GCF_002970915.1']


class PilotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root/'config').mkdir()
        (self.root/'scripts').mkdir()
        (self.root/'.tools').mkdir()
        (self.root/'bin').mkdir()
        self.config = self.root/'config/stage3_pilot_accessions.txt'
        self.config.write_text('\n'.join(ACCESSIONS)+'\n')
        for name in ('validate_pilot_accessions.py','write_pilot_manifest.py','export_gtotree_marker_ids.py'):
            shutil.copy2(SCRIPTS/name, self.root/'scripts'/name)
        self.env = dict(os.environ, PATH=str(self.root/'bin')+os.pathsep+os.environ['PATH'])

    def tearDown(self):
        self.tmp.cleanup()

    def executable(self, path, content):
        path.write_text(content)
        path.chmod(0o755)

    def test_refuses_oversized_duplicate_and_unversioned_input(self):
        for lines in (ACCESSIONS+['GCF_000014425.1'], [ACCESSIONS[0]]*2, ['GCF_000468955']):
            self.config.write_text('\n'.join(lines)+'\n')
            with self.assertRaises(ValueError): validation.validate(self.config)

    def test_limit_checked_before_mutation(self):
        self.config.write_text('\n'.join(ACCESSIONS+['GCF_000014425.1'])+'\n')
        sentinel = self.root/'results/stage3_pilot/do-not-remove'
        sentinel.parent.mkdir(parents=True); sentinel.write_text('existing result')
        result = subprocess.run(['bash',str(SCRIPTS/'run_stage3_pilot.sh'),str(self.root)],capture_output=True,text=True,env=self.env)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(sentinel.read_text(),'existing result')
        self.assertIn('between one and three',result.stderr)

    def prepare_stubs(self):
        """Model documented paths without optional relabeling or deleted HMM tables."""
        self.executable(self.root/'bin/uname', '#!/bin/sh\ncase "$1" in -s) echo Linux;; -m) echo x86_64;; esac\n')
        self.executable(self.root/'bin/gtt-hmms', '#!/bin/sh\necho "FIXTURE ONLY"\n')
        archive = self.root/'fixture.zip'
        with zipfile.ZipFile(archive,'w') as z:
            for a in ACCESSIONS: z.writestr(f'ncbi_dataset/data/{a}/protein.faa', '>fixture\nACDE\n')
        self.executable(self.root/'.tools/datasets', '#!/usr/bin/env python3\nimport sys,shutil\nfrom pathlib import Path\nif sys.argv[1]=="version":print("FIXTURE ONLY")\nelse:shutil.copy2(Path(__file__).parents[1]/"fixture.zip",sys.argv[sys.argv.index("--filename")+1])\n')
        self.executable(self.root/'bin/GToTree', '''#!/usr/bin/env python3
import sys,os
from pathlib import Path
if '--version' in sys.argv: print('FIXTURE ONLY');sys.exit(0)
assert '-k' in sys.argv and '-d' in sys.argv
if os.environ.get('EARLY_FAILURE'):
    p=Path(os.environ['TMPDIR'])/'gtotree.tmp.fixture/debug.log';p.parent.mkdir(parents=True);p.write_text('FIXTURE FAILURE');sys.exit(1)
out=Path(sys.argv[sys.argv.index('-o')+1]);out.mkdir(parents=True)
for name in ['Aligned_SCGs.faa','SCG_hit_counts.tsv','Genomes_summary_info.tsv','run_files/Partitions.txt','run_files/Partitions.nex','run_files/individual_alignments/example_aln.faa']:
    p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('FIXTURE ONLY\\n')
p=out/'gtotree.tmp.fixture/example_hits_filtered.faa';p.parent.mkdir(parents=True);p.write_text('>GCF_000468955.1\\nACDE\\n')
if not os.environ.get('OMIT_TREE'): (out/'gtotree.tre').write_text('(fixture);\\n')
''')

    def run_stub_pilot(self):
        return subprocess.run(['bash',str(SCRIPTS/'run_stage3_pilot.sh'),str(self.root)],capture_output=True,text=True,env=self.env)

    def check_manifest(self, result):
        for line in (result/'SHA256SUMS.txt').read_text().splitlines():
            digest,relative=line.split('  ',1)
            self.assertFalse(Path(relative).is_absolute())
            self.assertEqual(digest,hashlib.sha256((result/relative).read_bytes()).hexdigest())
        return (result/'SHA256SUMS.txt').read_text()

    def test_optional_alignment_absence_succeeds_and_summary_is_hashed(self):
        self.prepare_stubs(); completed=self.run_stub_pilot()
        self.assertEqual(completed.returncode,0,completed.stdout+completed.stderr)
        result=self.root/'results/stage3_pilot'
        self.assertFalse((result/'gtotree_output/Aligned_SCGs_mod_names.faa').exists())
        self.assertIn('`-A`',(result/'PILOT_SUMMARY.md').read_text())
        self.assertIn('`gtotree.tre`',(result/'PILOT_SUMMARY.md').read_text())
        self.assertNotIn('command not found',completed.stderr)
        self.assertIn('PILOT_SUMMARY.md',self.check_manifest(result))
        self.assertEqual(json.loads((result/'execution_status.json').read_text())['status'],'completed')

    def test_missing_tree_fails_but_preserves_debug_outputs(self):
        self.prepare_stubs();self.env['OMIT_TREE']='1';completed=self.run_stub_pilot()
        self.assertNotEqual(completed.returncode,0)
        result=self.root/'results/stage3_pilot'
        self.assertTrue((result/'gtotree_output/gtotree.tmp.fixture/example_hits_filtered.faa').is_file())
        self.assertEqual(json.loads((result/'execution_status.json').read_text())['status'],'failed')
        self.check_manifest(result)

    def test_normalizes_crlf_and_missing_final_newline(self):
        self.prepare_stubs()
        self.config.write_bytes(('\r\n'.join(ACCESSIONS)).encode())
        completed=self.run_stub_pilot()
        self.assertEqual(completed.returncode,0,completed.stdout+completed.stderr)
        result=self.root/'results/stage3_pilot'
        self.assertEqual((result/'pilot_accessions.txt').read_bytes(), ('\n'.join(ACCESSIONS)+'\n').encode())
        self.assertEqual(len(list((result/'input_proteomes').glob('*.faa'))),3)

    def test_early_failure_preserves_owned_temporary_debug(self):
        self.prepare_stubs();self.env['EARLY_FAILURE']='1';completed=self.run_stub_pilot()
        self.assertNotEqual(completed.returncode,0)
        result=self.root/'results/stage3_pilot'
        self.assertEqual((result/'incomplete_debug/gtotree.tmp.fixture/debug.log').read_text(),'FIXTURE FAILURE')
        self.check_manifest(result)


if __name__=='__main__':unittest.main()
