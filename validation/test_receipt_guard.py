import unittest

from validation.receipt_guard import is_valid_receipt, validate_receipt


def make_receipt(**overrides):
    receipt = {
        "schema": "genomeatlas-probe-v1",
        "probe_id": "probe-001",
        "executed_at": "2026-09-09T14:46:20.956Z",
        "scope": "transport",
        "result": "PASS",
        "command": "python -m unittest discover -s validation -p test_receipt_guard.py",
        "exit_code": 0,
        "stdout": "12 tests passed\n",
        "stderr": "",
        "input_sha256": "a" * 64,
        "output_sha256": "b" * 64,
        "accepted_by": None,
    }
    receipt.update(overrides)
    return receipt


class ReceiptGuardTests(unittest.TestCase):
    def test_pass_receipt_is_valid(self):
        result = validate_receipt(make_receipt())
        self.assertTrue(result.valid)
        self.assertEqual(result.normalized["output_sha256"], "b" * 64)

    def test_fail_receipt_is_valid_when_it_records_actual_execution(self):
        result = validate_receipt(
            make_receipt(
                result="FAIL",
                exit_code=1,
                output_sha256=None,
            )
        )
        self.assertTrue(result.valid)

    def test_blocked_and_not_run_cannot_claim_execution(self):
        for status in ("BLOCKED", "NOT_RUN"):
            with self.subTest(status=status):
                result = validate_receipt(
                    make_receipt(
                        result=status,
                        executed_at="2026-09-09T14:46:20Z",
                        command="echo ran",
                        exit_code=0,
                        stdout="unexpected",
                        output_sha256="c" * 64,
                    )
                )
                self.assertFalse(result.valid)
                self.assertTrue(
                    any("cannot claim" in error for error in result.errors),
                    result.errors,
                )

    def test_duplicate_probe_ids_are_rejected(self):
        result = validate_receipt(make_receipt(), seen_probe_ids={"probe-001"})
        self.assertFalse(result.valid)
        self.assertIn("duplicate probe_id: probe-001", result.errors)

    def test_malformed_dates_and_hashes_are_rejected(self):
        bad_timestamp = validate_receipt(make_receipt(executed_at="2026-09-09 14:46:20Z"))
        self.assertFalse(bad_timestamp.valid)
        self.assertTrue(
            any("executed_at must be RFC3339 UTC" in error for error in bad_timestamp.errors)
        )

        bad_hash = validate_receipt(make_receipt(output_sha256="xyz"))
        self.assertFalse(bad_hash.valid)
        self.assertTrue(
            any("output_sha256" in error for error in bad_hash.errors),
            bad_hash.errors,
        )

    def test_fake_pass_claims_are_rejected(self):
        for overrides in (
            {"command": ""},
            {"exit_code": 1},
            {"output_sha256": None},
        ):
            with self.subTest(overrides=overrides):
                result = validate_receipt(make_receipt(**overrides))
                self.assertFalse(result.valid)

    def test_imported_receipts_stay_unverified_until_independently_checked(self):
        valid = validate_receipt(make_receipt(imported=True, result="FAIL", exit_code=1, output_sha256=None))
        self.assertTrue(valid.valid)
        self.assertEqual(valid.normalized["verification_status"], "UNVERIFIED")

        invalid_verified = validate_receipt(
            make_receipt(
                imported=True,
                verification_status="VERIFIED",
                result="FAIL",
                exit_code=1,
                output_sha256=None,
            )
        )
        self.assertFalse(invalid_verified.valid)

        invalid_accepted = validate_receipt(
            make_receipt(
                imported=True,
                accepted_by="reviewer",
                result="FAIL",
                exit_code=1,
                output_sha256=None,
            )
        )
        self.assertFalse(invalid_accepted.valid)

    def test_synthetic_receipts_cannot_claim_acceptance(self):
        result = validate_receipt(
            make_receipt(scope="synthetic", accepted_by="lab-review", result="FAIL", exit_code=1, output_sha256=None)
        )
        self.assertFalse(result.valid)
        self.assertIn("synthetic receipts cannot claim acceptance", result.errors)

    def test_credential_like_values_are_rejected(self):
        result = validate_receipt(
            make_receipt(stdout="ghp_exampletoken12345678901234567890")
        )
        self.assertFalse(result.valid)
        self.assertTrue(
            any("credential-like content" in error for error in result.errors),
            result.errors,
        )

    def test_boolean_helper_matches_validation(self):
        self.assertTrue(is_valid_receipt(make_receipt()))
        self.assertFalse(is_valid_receipt(make_receipt(exit_code=7)))


if __name__ == "__main__":
    unittest.main()
