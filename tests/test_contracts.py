import json
import subprocess
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from verify import verify
class Contracts(unittest.TestCase):
    def test_repository_invariants(self):
        self.assertEqual(verify(), 10)
    def test_node_contract_suite(self):
        run = subprocess.run(["node", "--test", "tests/contracts.test.js"], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
    def test_parent_reports_attributed(self):
        data = json.loads((ROOT / "docs/evidence/parent-report.json").read_text())
        self.assertTrue(all(p["origin"] == "PARENT_REPORT" for p in data["probes"]))
    def test_no_deployment(self):
        data = json.loads((ROOT / "docs/data/atlas.json").read_text())
        self.assertEqual(data["deployment"]["native_sites"], "NOT_DEPLOYED")
        self.assertIsNone(data["deployment"]["native_url"])
