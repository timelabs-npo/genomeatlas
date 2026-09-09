import importlib.util,json,tempfile,unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/"validate_receipt.py"
S=importlib.util.spec_from_file_location("receipt_parent",P);M=importlib.util.module_from_spec(S);S.loader.exec_module(M)
class ParentRegression(unittest.TestCase):
 def base(self): return json.loads((Path(__file__).parent/"fixtures/synthetic_receipt_valid.json").read_text())
 def test_list_scope_is_rejected_not_crashed(self):
  r=self.base();r["scope"]=[];self.assertTrue(M.validate_receipt_structure(r))
 def test_object_outcome_is_rejected_not_crashed(self):
  r=self.base();r["outcome"]={};self.assertTrue(M.validate_receipt_structure(r))
 def test_oversize_receipt_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"input.json";p.write_text(" "*65537)
   with self.assertRaisesRegex(ValueError,"64 KiB"):M.load_receipt(p)
 def test_digest_is_not_execution_authentication(self):
  r=self.base();v,code=M.build_result(r,Path(__file__).parent/"fixtures/synthetic_artifact.txt")
  self.assertEqual(code,0);self.assertTrue(v["artifact_hash_verified"]);self.assertFalse(v["execution_authenticated"])
