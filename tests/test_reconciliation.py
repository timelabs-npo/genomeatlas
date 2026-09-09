"""Snapshot/readback checks; no browser or biological execution."""
import json, unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def read(name): return json.loads((R/name).read_text(encoding='utf-8-sig'))
class ReconciliationTests(unittest.TestCase):
    def test_registry_identity_and_count(self):
        rows=read('data/registry.json')['entries']; self.assertEqual(len(rows),134); self.assertEqual(len({r['id'] for r in rows}),134)
    def test_cache_is_not_execution(self):
        rows=[r for r in read('data/registry.json')['entries'] if r['layer']=='plugin-cache']; self.assertEqual(len(rows),71)
        for r in rows: self.assertFalse(r['probed']); self.assertEqual(r['status'],'CACHE_FILES_OBSERVED'); self.assertIn('NOT_VERIFIED',r['scope'])
    def test_cache_skill_count(self):
        p=read('data/plugin-cache.json')['plugins']; self.assertEqual(len(p),71); self.assertEqual(sum(len(r['skills']) for r in p),344)
    def test_smarts_auth_failure_not_erased(self):
        rows=read('data/registry.json')['entries']; r=next(r for r in rows if r['id']=='smarts.bio:_AI_for_biology'); self.assertEqual(r['status'],'AUTH_REQUIRED')
        self.assertTrue((R/'evidence/history/before-parent-integration-live_probes.json').exists())
    def test_native_provider_actual_reads_and_scope(self):
        d=read('data/native-site-readback.json'); self.assertEqual(d['status'],'PROVIDER_LIVE_URL_AND_SAVED_VERSION_CONFIRMED'); self.assertEqual(d['http_check']['http_status'],200); self.assertEqual(len(d['actions']),4)
        self.assertFalse(d['deployment_status_read']['attempted']); self.assertIsNone(d['deployment_status_read']['deployment_id']); self.assertEqual(d['preservation']['site_mutations'],[])
    def test_codex_session_not_invented_as_biology(self):
        d=read('data/current-probes.json'); r=next(x for x in d['probes'] if x['id']=='codex'); self.assertEqual(r['session_id'],'01a0869a-6af8-75e3-b8d1-0879e92c6723'); self.assertEqual(r['exit_code'],0)
        self.assertEqual(d['scientific_state']['host_tree'],'NOT_RUN'); self.assertEqual(d['scientific_state']['rm_calls'],'NOT_RUN')
    def test_copilot_exact_commit(self):
        d=read('data/copilot-reexecution.json'); self.assertEqual(d['head'],'7c27865b7113b0fe8b22a57a751ed82fdaae9c8a'); self.assertEqual(d['exit_code'],0); self.assertIn('synthetic',d['scope'])
    def test_current_native_observation_not_old_discovery(self):
        d=read('evidence/native-tools-current.json'); self.assertEqual(d['authentication'],'OWNER_READ_CONFIRMED'); self.assertIsNotNone(d['site_id']); self.assertIn('NOT_RETURNED',d['deployment'])
if __name__=='__main__': unittest.main()
