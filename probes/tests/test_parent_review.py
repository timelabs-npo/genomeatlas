import json,unittest
import test_validate_receipt as original
class ParentReviewTests(unittest.TestCase):
    def test_unhashable_scope_or_outcome_rejected_cleanly(self):
        h=original.ValidateReceiptCliTests()
        for key in ('scope','outcome'):
            for value in ([], {}):
                with self.subTest(key=key,value=value):
                    r=h.valid_receipt_dict();r[key]=value
                    p=h.run_cli(json.dumps(r))
                    self.assertEqual(p.returncode,1)
                    self.assertEqual(p.stderr,'')
                    self.assertFalse(json.loads(p.stdout)['structure_valid'])
    def test_oversize_receipt_rejected(self):
        h=original.ValidateReceiptCliTests();r=h.valid_receipt_dict();r['probe_id']='a'*1048577
        p=h.run_cli(json.dumps(r));self.assertEqual(p.returncode,1)
        self.assertFalse(json.loads(p.stdout)['structure_valid'])
