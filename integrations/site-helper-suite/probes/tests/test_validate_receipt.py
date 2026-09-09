from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "probes" / "validate_receipt.py"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
VALID_ARTIFACT = FIXTURES / "synthetic_artifact.txt"
VALID_RECEIPT = FIXTURES / "synthetic_receipt_valid.json"


class ValidateReceiptCliTests(unittest.TestCase):
    maxDiff = None

    def run_cli(
        self,
        receipt_text: str | None = None,
        *,
        artifact: Path | None = None,
        receipt_path: Path | None = None,
    ) -> subprocess.CompletedProcess[str]:
        with tempfile.TemporaryDirectory() as tmpdir:
            if receipt_path is None:
                receipt_path = Path(tmpdir) / "receipt.json"
                assert receipt_text is not None
                receipt_path.write_text(receipt_text, encoding="utf-8")
            command = [sys.executable, str(SCRIPT), str(receipt_path)]
            if artifact is not None:
                command.extend(["--artifact", str(artifact)])
            return subprocess.run(command, capture_output=True, text=True, check=False)

    def assert_validation_error(self, result: subprocess.CompletedProcess[str], message_fragment: str) -> None:
        self.assertEqual(result.returncode, 1, result)
        self.assertEqual(result.stderr, "")
        payload = json.loads(result.stdout)
        self.assertFalse(payload["structure_valid"])
        self.assertFalse(payload["artifact_hash_verified"])
        self.assertFalse(payload["execution_authenticated"])
        self.assertEqual(payload["scientific_acceptance"], "not-assessed")
        self.assertTrue(any(message_fragment in message for message in payload["errors"]), payload["errors"])

    def valid_receipt_dict(self) -> dict[str, object]:
        return json.loads(VALID_RECEIPT.read_text(encoding="utf-8"))

    def test_valid_receipt_and_artifact(self) -> None:
        result = self.run_cli(receipt_path=VALID_RECEIPT, artifact=VALID_ARTIFACT)
        self.assertEqual(result.returncode, 0, result)
        self.assertEqual(result.stderr, "")
        payload = json.loads(result.stdout)
        self.assertTrue(payload["structure_valid"])
        self.assertTrue(payload["artifact_hash_verified"])
        self.assertFalse(payload["execution_authenticated"])
        self.assertEqual(payload["scientific_acceptance"], "not-assessed")
        self.assertEqual(payload["errors"], [])

    def test_missing_fields(self) -> None:
        receipt = self.valid_receipt_dict()
        del receipt["run_id"]
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "missing fields: run_id")

    def test_malformed_json(self) -> None:
        result = self.run_cli("{not valid json")
        self.assert_validation_error(result, "Expecting property name enclosed in double quotes")

    def test_duplicate_keys(self) -> None:
        result = self.run_cli(
            """
            {
              "schema_version": 1,
              "probe_id": "synthetic-probe",
              "probe_id": "duplicate-probe",
              "run_id": "synthetic-run",
              "started_at": "2026-01-01T00:00:00Z",
              "ended_at": "2026-01-01T00:00:01Z",
              "source_commit": "0123456789abcdef0123456789abcdef01234567",
              "input_sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "output_sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              "exit_code": 0,
              "scope": "synthetic",
              "outcome": "pass"
            }
            """
        )
        self.assert_validation_error(result, "duplicate key: probe_id")

    def test_bad_and_empty_hashes(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["input_sha256"] = ""
        receipt["output_sha256"] = "not-a-hash"
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "input_sha256 must be 64 hexadecimal characters")
        payload = json.loads(result.stdout)
        self.assertTrue(any("output_sha256 must be 64 hexadecimal characters" in msg for msg in payload["errors"]))

    def test_invalid_commit(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["source_commit"] = "ABC123"
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "source_commit must be 40 lowercase hexadecimal characters")

    def test_boolean_exit_code_is_rejected(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["exit_code"] = True
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "exit_code must be an integer")

    def test_pass_with_nonzero_exit_code(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["exit_code"] = 7
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "pass outcome requires exit_code 0")

    def test_end_before_start(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["started_at"] = "2026-01-01T00:00:02Z"
        receipt["ended_at"] = "2026-01-01T00:00:01Z"
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "ended_at must not be earlier than started_at")

    def test_invalid_timezone(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["started_at"] = "2026-01-01T00:00:00+02:00"
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "started_at timestamp must use UTC Z suffix")

    def test_unknown_fields(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["verified"] = True
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "unknown fields: verified")

    def test_path_traversal_in_labels(self) -> None:
        receipt = self.valid_receipt_dict()
        receipt["labels"] = {"dataset": "../synthetic"}
        result = self.run_cli(json.dumps(receipt))
        self.assert_validation_error(result, "labels value for 'dataset' contains path traversal content")

    def test_artifact_tampering(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            artifact = Path(tmpdir) / "tampered.txt"
            artifact.write_text("synthetic artifact tampered\n", encoding="utf-8")
            result = self.run_cli(receipt_path=VALID_RECEIPT, artifact=artifact)
        self.assertEqual(result.returncode, 1, result)
        self.assertEqual(result.stderr, "")
        payload = json.loads(result.stdout)
        self.assertTrue(payload["structure_valid"])
        self.assertFalse(payload["artifact_hash_verified"])
        self.assertTrue(any("artifact hash does not match output_sha256" in msg for msg in payload["errors"]))


if __name__ == "__main__":
    unittest.main()
