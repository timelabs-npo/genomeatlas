from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import re
from typing import Any, Iterable, Mapping

SCHEMA = "genomeatlas-probe-v1"
SCOPES = frozenset({"transport", "metadata", "synthetic", "scientific"})
RESULTS = frozenset({"PASS", "FAIL", "BLOCKED", "NOT_RUN"})
VERIFICATION_STATUSES = frozenset({"UNVERIFIED", "VERIFIED"})

_HASH_RE = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)
_RFC3339_UTC_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$"
)
_CREDENTIAL_PATTERNS = (
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\bBearer\s+[A-Za-z0-9._\-+/=]{16,}\b", re.IGNORECASE),
    re.compile(r"\beyJ[A-Za-z0-9._\-+/=]{16,}\b"),
    re.compile(r"https?://[^/\s:@]+:[^@\s]+@"),
    re.compile(
        r"\b(?:api[_-]?key|token|password|secret)\b\s*[:=]\s*['\"]?[^\s'\",;]{8,}",
        re.IGNORECASE,
    ),
)
_STRING_FIELDS = ("accepted_by", "command", "stderr", "stdout", "findings")


@dataclass(frozen=True)
class ValidationResult:
    valid: bool
    errors: tuple[str, ...]
    normalized: dict[str, Any]


def validate_receipt(
    receipt: Mapping[str, Any],
    *,
    seen_probe_ids: Iterable[str] = (),
    independently_verified: bool = False,
) -> ValidationResult:
    errors: list[str] = []
    normalized: dict[str, Any] = {}
    seen_probe_ids = set(seen_probe_ids)

    if not isinstance(receipt, Mapping):
        return ValidationResult(False, ("receipt must be a mapping",), {})

    schema = receipt.get("schema")
    if schema != SCHEMA:
        errors.append(f"schema must be {SCHEMA!r}")
    else:
        normalized["schema"] = schema

    probe_id = receipt.get("probe_id")
    if not _is_non_empty_string(probe_id):
        errors.append("probe_id must be a non-empty string")
    else:
        normalized["probe_id"] = probe_id.strip()
        if probe_id.strip() in seen_probe_ids:
            errors.append(f"duplicate probe_id: {probe_id.strip()}")

    scope = receipt.get("scope")
    if scope not in SCOPES:
        errors.append(f"scope must be one of {sorted(SCOPES)}")
    else:
        normalized["scope"] = scope

    result = receipt.get("result")
    if result not in RESULTS:
        errors.append(f"result must be one of {sorted(RESULTS)}")
    else:
        normalized["result"] = result

    executed_at = receipt.get("executed_at")
    if result in {"BLOCKED", "NOT_RUN"}:
        if executed_at not in (None, ""):
            errors.append(f"{result} receipts cannot claim executed_at")
    elif not _is_rfc3339_utc(executed_at):
        errors.append("executed_at must be RFC3339 UTC ending in 'Z'")
    else:
        normalized["executed_at"] = executed_at

    command = receipt.get("command")
    exit_code = receipt.get("exit_code")
    stdout = receipt.get("stdout")
    stderr = receipt.get("stderr")

    if result == "PASS":
        if not _is_non_empty_string(command):
            errors.append("PASS receipts require a non-empty command")
        else:
            normalized["command"] = command.strip()
        if not _is_int(exit_code) or exit_code != 0:
            errors.append("PASS receipts require exit_code == 0")
        else:
            normalized["exit_code"] = exit_code
    elif result == "FAIL":
        if not _is_non_empty_string(command):
            errors.append("FAIL receipts require a non-empty command")
        else:
            normalized["command"] = command.strip()
        if not _is_int(exit_code):
            errors.append("FAIL receipts require an integer exit_code")
        else:
            normalized["exit_code"] = exit_code
    elif result in {"BLOCKED", "NOT_RUN"}:
        if command not in (None, ""):
            errors.append(f"{result} receipts cannot claim a completed command")
        if exit_code is not None:
            errors.append(f"{result} receipts cannot claim an exit_code")
        if stdout not in (None, ""):
            errors.append(f"{result} receipts cannot claim stdout")
        if stderr not in (None, ""):
            errors.append(f"{result} receipts cannot claim stderr")

    input_sha256 = receipt.get("input_sha256")
    if input_sha256 not in (None, ""):
        if not _is_hash(input_sha256):
            errors.append("input_sha256 must be a 64-character hex string when present")
        else:
            normalized["input_sha256"] = input_sha256.lower()

    output_sha256 = receipt.get("output_sha256")
    if result == "PASS":
        if not _is_hash(output_sha256):
            errors.append("PASS receipts require output_sha256 as a 64-character hex string")
        else:
            normalized["output_sha256"] = output_sha256.lower()
    elif output_sha256 not in (None, ""):
        if result in {"BLOCKED", "NOT_RUN"}:
            errors.append(f"{result} receipts cannot claim output_sha256")
        elif not _is_hash(output_sha256):
            errors.append("output_sha256 must be a 64-character hex string when present")
        else:
            normalized["output_sha256"] = output_sha256.lower()

    accepted_by = receipt.get("accepted_by")
    if accepted_by is not None and not _is_non_empty_string(accepted_by):
        errors.append("accepted_by must be null or a non-empty string")
    elif _is_non_empty_string(accepted_by):
        normalized["accepted_by"] = accepted_by.strip()

    if scope == "synthetic" and accepted_by is not None:
        errors.append("synthetic receipts cannot claim acceptance")

    imported = receipt.get("imported", False)
    if not isinstance(imported, bool):
        errors.append("imported must be boolean when present")
    else:
        normalized["imported"] = imported

    verification_status = receipt.get("verification_status")
    if verification_status is not None and verification_status not in VERIFICATION_STATUSES:
        errors.append(f"verification_status must be one of {sorted(VERIFICATION_STATUSES)}")
    elif verification_status is not None:
        normalized["verification_status"] = verification_status

    if imported and not independently_verified:
        if accepted_by is not None:
            errors.append("imported receipts cannot claim acceptance before independent verification")
        if verification_status not in (None, "UNVERIFIED"):
            errors.append("imported receipts must remain UNVERIFIED until independently checked")
        normalized["verification_status"] = "UNVERIFIED"

    for field_name in _STRING_FIELDS:
        value = receipt.get(field_name)
        if value not in (None, "") and not isinstance(value, str):
            errors.append(f"{field_name} must be a string when present")

    for path, value in _iter_string_values(receipt):
        if _looks_like_credential(value):
            errors.append(f"{path} contains credential-like content")

    return ValidationResult(not errors, tuple(errors), normalized)


def is_valid_receipt(
    receipt: Mapping[str, Any],
    *,
    seen_probe_ids: Iterable[str] = (),
    independently_verified: bool = False,
) -> bool:
    return validate_receipt(
        receipt,
        seen_probe_ids=seen_probe_ids,
        independently_verified=independently_verified,
    ).valid


def _is_hash(value: Any) -> bool:
    return isinstance(value, str) and bool(_HASH_RE.fullmatch(value))


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _is_rfc3339_utc(value: Any) -> bool:
    if not isinstance(value, str) or not _RFC3339_UTC_RE.fullmatch(value):
        return False
    try:
        datetime.strptime(
            value, "%Y-%m-%dT%H:%M:%S.%fZ" if "." in value else "%Y-%m-%dT%H:%M:%SZ"
        )
    except ValueError:
        return False
    return True


def _looks_like_credential(value: str) -> bool:
    return any(pattern.search(value) for pattern in _CREDENTIAL_PATTERNS)


def _iter_string_values(value: Any, prefix: str = "receipt") -> Iterable[tuple[str, str]]:
    if isinstance(value, str):
        yield prefix, value
        return
    if isinstance(value, Mapping):
        for key, nested in value.items():
            child_prefix = f"{prefix}.{key}"
            yield from _iter_string_values(nested, child_prefix)
        return
    if isinstance(value, (list, tuple)):
        for index, nested in enumerate(value):
            child_prefix = f"{prefix}[{index}]"
            yield from _iter_string_values(nested, child_prefix)
