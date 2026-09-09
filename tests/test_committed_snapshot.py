"""The deployed generated module must match the repository JSON, not stale claims."""
import importlib.util
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('genomeatlas_build_snapshot',ROOT/'scripts/build.py')
build=importlib.util.module_from_spec(spec);spec.loader.exec_module(build)
def parse_module(raw):
    prefix='export default '
    lines=raw.splitlines()
    payload='\n'.join(line for line in lines if not line.startswith('//')).strip()
    if not payload.startswith(prefix) or not payload.endswith(';'):
        raise ValueError('Unexpected generated module format')
    return json.loads(payload[len(prefix):-1])
class CommittedSnapshotTests(unittest.TestCase):
    def test_committed_module_matches_all_source_contracts(self):
        actual=parse_module((ROOT/'assets/data.mjs').read_text(encoding='utf-8-sig'))
        self.assertEqual(actual,build.load_snapshot(),'Regenerate assets/data.mjs before publication')
    def test_changed_contract_is_not_accepted_as_same_snapshot(self):
        snapshot=build.load_snapshot()
        changed=json.loads(json.dumps(snapshot));changed['live']={'status':'invented-pass'}
        self.assertNotEqual(changed,snapshot)
    def test_generated_module_rejects_executable_suffix(self):
        with self.assertRaises((ValueError,json.JSONDecodeError)):
            parse_module('export default {}; arbitraryExecution();')
if __name__=='__main__':unittest.main()
