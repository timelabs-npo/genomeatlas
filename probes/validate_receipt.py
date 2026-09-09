#!/usr/bin/env python3
"""Validate bounded probe receipts."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ALLOWED_FIELDS = {
    "schema_version",
    "probe_id",
    "run_id",
    "started_at",
    "ended_at",
    "source_commit",
    "input_sha256",
    "output_sha256",
    "exit_code",
    "scope",
    "outcome",
    "labels",
}
REQUIRED_FIELDS = ALLOWED_FIELDS - {"labels"}
SCOPES = {"synthetic", "connectivity", "live-data"}
OUTCOMES = {"pass", "fail", "blocked", "not-run"}
UTC_TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$")
COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
HEX64_RE = re.compile(r"^[0-9a-fA-F]{64}$")
LABEL_KEY_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]*$")


class DuplicateKeyError(ValueError):
    """Raised when a JSON object contains duplicate keys."""


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    seen: set[str] = set()
    for key, value in pairs:
        if key in seen:
            raise DuplicateKeyError(f"duplicate key: {key}")
        seen.add(key)
        result[key] = value
    return result


def load_receipt(path: Path) -> dict[str, Any]:
    if path.stat().st_size > 65536:
        raise ValueError("receipt exceeds 64 KiB")
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle, object_pairs_hook=_reject_duplicate_keys)
    if not isinstance(data, dict):
        raise ValueError("receipt must be a JSON object")
    return data


def parse_utc_timestamp(value: str) -> datetime:
    if not UTC_TIMESTAMP_RE.fullmatch(value):
        raise ValueError("timestamp must use UTC Z suffix")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _is_int_but_not_bool(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _contains_path_traversal(value: str) -> bool:
    return (
        ".." in value
        or "/" in value
        or "\\" in value
        or value.startswith(".")
        or value.startswith("~")
        or "\x00" in value
    )


def validate_labels(labels: Any, errors: list[str]) -> None:
    if not isinstance(labels, dict):
        errors.append("labels must be an object")
        return
    for key, value in labels.items():
        if not isinstance(key, str) or not LABEL_KEY_RE.fullmatch(key):
            errors.append(f"labels key is invalid: {key!r}")
        elif _contains_path_traversal(key):
            errors.append(f"labels key contains path traversal content: {key!r}")
        if not isinstance(value, str) or value == "":
            errors.append(f"labels value for {key!r} must be a non-empty string")
        elif _contains_path_traversal(value):
            errors.append(f"labels value for {key!r} contains path traversal content")


def validate_receipt_structure(receipt: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    unknown_fields = sorted(set(receipt) - ALLOWED_FIELDS)
    missing_fields = sorted(REQUIRED_FIELDS - set(receipt))

    if unknown_fields:
        errors.append(f"unknown fields: {', '.join(unknown_fields)}")
    if missing_fields:
        errors.append(f"missing fields: {', '.join(missing_fields)}")
        return errors

    if receipt.get("schema_version") != 1 or not _is_int_but_not_bool(receipt.get("schema_version")):
        errors.append("schema_version must be integer 1")

    for field in ("probe_id", "run_id"):
        value = receipt.get(field)
        if not isinstance(value, str) or value.strip() == "":
            errors.append(f"{field} must be a non-empty string")

    started_at_value = receipt.get("started_at")
    ended_at_value = receipt.get("ended_at")
    started_at = ended_at = None
    if not isinstance(started_at_value, str):
        errors.append("started_at must be a string")
    else:
        try:
            started_at = parse_utc_timestamp(started_at_value)
        except ValueError as exc:
            errors.append(f"started_at {exc}")
    if not isinstance(ended_at_value, str):
        errors.append("ended_at must be a string")
    else:
        try:
            ended_at = parse_utc_timestamp(ended_at_value)
        except ValueError as exc:
            errors.append(f"ended_at {exc}")
    if started_at is not None and ended_at is not None and ended_at < started_at:
        errors.append("ended_at must not be earlier than started_at")

    source_commit = receipt.get("source_commit")
    if not isinstance(source_commit, str) or not COMMIT_RE.fullmatch(source_commit):
        errors.append("source_commit must be 40 lowercase hexadecimal characters")

    for field in ("input_sha256", "output_sha256"):
        value = receipt.get(field)
        if not isinstance(value, str) or not HEX64_RE.fullmatch(value):
            errors.append(f"{field} must be 64 hexadecimal characters")

    exit_code = receipt.get("exit_code")
    if not _is_int_but_not_bool(exit_code):
        errors.append("exit_code must be an integer")

    scope = receipt.get("scope")
    if not isinstance(scope, str) or scope not in SCOPES:
        errors.append(f"scope must be one of: {', '.join(sorted(SCOPES))}")

    outcome = receipt.get("outcome")
    if not isinstance(outcome, str) or outcome not in OUTCOMES:
        errors.append(f"outcome must be one of: {', '.join(sorted(OUTCOMES))}")

    if _is_int_but_not_bool(exit_code):
        if outcome == "pass" and exit_code != 0:
            errors.append("pass outcome requires exit_code 0")
        if outcome == "fail" and exit_code == 0:
            errors.append("fail outcome requires a non-zero exit_code")

    if "labels" in receipt:
        validate_labels(receipt["labels"], errors)

    return errors


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build_result(receipt: dict[str, Any] | None, artifact: Path | None) -> tuple[dict[str, Any], int]:
    errors: list[str] = []
    structure_valid = False
    artifact_hash_verified = False

    if receipt is None:
        errors.append("receipt could not be parsed")
    else:
        errors.extend(validate_receipt_structure(receipt))
        structure_valid = not errors
        if structure_valid and artifact is not None:
            actual_hash = sha256_file(artifact)
            expected_hash = str(receipt["output_sha256"]).lower()
            if actual_hash == expected_hash:
                artifact_hash_verified = True
            else:
                errors.append("artifact hash does not match output_sha256")

    result = {
        "structure_valid": structure_valid,
        "artifact_hash_verified": artifact_hash_verified,
        "execution_authenticated": False,
        "scientific_acceptance": "not-assessed",
        "errors": errors,
    }
    exit_code = 0 if structure_valid and (artifact is None or artifact_hash_verified) else 1
    return result, exit_code


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("receipt", type=Path, help="Path to a JSON probe receipt")
    parser.add_argument(
        "--artifact",
        type=Path,
        help="Optional local artifact to verify against output_sha256",
    )
    args = parser.parse_args(argv)

    try:
        receipt = load_receipt(args.receipt)
        result, exit_code = build_result(receipt, args.artifact)
    except (json.JSONDecodeError, DuplicateKeyError, ValueError) as exc:
        result, exit_code = build_result(None, args.artifact)
        result["errors"] = [str(exc)]
    except OSError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    json.dump(result, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
