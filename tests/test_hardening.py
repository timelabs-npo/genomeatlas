"""Negative regression checks against the actual delivery validators."""
import copy
import json
import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from verify import validate_panel, validate_registry


class Hardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / "docs/data/atlas.json").read_text(encoding="utf-8"))
        cls.raw = (ROOT / "inputs/selected_accessions.txt").read_bytes()

    def test_duplicate_tool_id_rejected(self):
        tools = copy.deepcopy(self.data["tools"])
        tools.append(copy.deepcopy(tools[0]))
        self.assertTrue(any("Duplicate tool ID" in e for e in validate_registry(tools)))

    def test_missing_contract_rejected(self):
        tool = copy.deepcopy(self.data["tools"][0])
        del tool["input_contract"]
        self.assertTrue(validate_registry([tool]))

    def test_bad_state_and_empty_contract_rejected(self):
        tool = copy.deepcopy(self.data["tools"][0])
        tool["status"] = "AVAILABLE_AND_EXECUTED"
        self.assertTrue(validate_registry([tool]))
        tool["status"] = "NOT_TESTED"
        tool["output_contract"] = ""
        self.assertTrue(validate_registry([tool]))

    def test_exact_accession_bytes_pass(self):
        self.assertEqual(validate_panel(self.raw, self.data["panel"]["accessions"]), [])

    def test_changed_accession_version_rejected(self):
        changed = self.raw.replace(b"GCF_023499275.1", b"GCF_023499275.2")
        self.assertTrue(validate_panel(changed, self.data["panel"]["accessions"]))

    def test_changed_accession_order_rejected(self):
        self.assertTrue(validate_panel(self.raw, list(reversed(self.data["panel"]["accessions"]))))

    def test_short_or_duplicate_panel_rejected(self):
        rows = self.data["panel"]["accessions"].copy()
        self.assertTrue(validate_panel(b"GCF_023499275.1\n", rows[:1]))
        rows[-1] = rows[0]
        self.assertTrue(validate_panel("\n".join(rows).encode(), rows))
