Reproducible commands were run from the repository root.

## Commands

### 1) Manual success check

Command:

```bash
python3 probes/validate_receipt.py probes/tests/fixtures/synthetic_receipt_valid.json --artifact probes/tests/fixtures/synthetic_artifact.txt
```

Stdout:

```json
{
  "artifact_hash_verified": true,
  "errors": [],
  "execution_authenticated": false,
  "scientific_acceptance": "not-assessed",
  "structure_valid": true
}
```

Stderr:

```text
```

Exit code:

```text
0
```

### 2) Targeted test run

Command:

```bash
python3 -m unittest discover -s probes/tests -v
```

Stdout:

```text
test_artifact_tampering (test_validate_receipt.ValidateReceiptCliTests.test_artifact_tampering) ... ok
test_bad_and_empty_hashes (test_validate_receipt.ValidateReceiptCliTests.test_bad_and_empty_hashes) ... ok
test_boolean_exit_code_is_rejected (test_validate_receipt.ValidateReceiptCliTests.test_boolean_exit_code_is_rejected) ... ok
test_duplicate_keys (test_validate_receipt.ValidateReceiptCliTests.test_duplicate_keys) ... ok
test_end_before_start (test_validate_receipt.ValidateReceiptCliTests.test_end_before_start) ... ok
test_invalid_commit (test_validate_receipt.ValidateReceiptCliTests.test_invalid_commit) ... ok
test_invalid_timezone (test_validate_receipt.ValidateReceiptCliTests.test_invalid_timezone) ... ok
test_malformed_json (test_validate_receipt.ValidateReceiptCliTests.test_malformed_json) ... ok
test_missing_fields (test_validate_receipt.ValidateReceiptCliTests.test_missing_fields) ... ok
test_pass_with_nonzero_exit_code (test_validate_receipt.ValidateReceiptCliTests.test_pass_with_nonzero_exit_code) ... ok
test_path_traversal_in_labels (test_validate_receipt.ValidateReceiptCliTests.test_path_traversal_in_labels) ... ok
test_unknown_fields (test_validate_receipt.ValidateReceiptCliTests.test_unknown_fields) ... ok
test_valid_receipt_and_artifact (test_validate_receipt.ValidateReceiptCliTests.test_valid_receipt_and_artifact) ... ok

----------------------------------------------------------------------
Ran 13 tests in 0.528s

OK
```

Stderr:

```text
```

Exit code:

```text
0
```

## NOT_TESTED

- No networked or live-data probe execution paths were added.
- No GitHub Actions workflow changes were made.
- No deployment or account-level behavior was changed.
