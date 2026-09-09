"""Offline repository invariants; no biological execution."""
import hashlib
import json
import re
import sys
from pathlib import Path
from build_data import bundle

ROOT = Path(__file__).resolve().parents[1]

PROBE_STATES = ["PASSED", "FAILED", "NOT_TESTED", "AUTH_REQUIRED", "DECLARED", "BLOCKED"]
TOOL_IDS = {"ncbi-datasets", "gtotree-hmmer", "mafft", "trimal", "iqtree", "defensefinder", "rebase", "pubmed-entrez", "geneious", "itol", "smarts-bio", "bionemo", "alphagenome", "desktop-commander", "github-gh", "copilot", "codex", "trae", "antigravity", "sites"}

def validate_registry(records):
    """Reject duplicate identities, missing contracts and unrecognized probe states."""
    errors, seen = [], set()
    required = {"id", "name", "layer", "stage", "advertised_capability", "actual_probe_outcome", "checked_at", "evidence_reference", "input_contract", "output_contract", "auth_cost_boundary", "next_action", "status"}
    for row in records:
        if not isinstance(row, dict):
            errors.append("Tool must be an object")
            continue
        if not required.issubset(row):
            errors.append("Missing registry fields")
        identity = row.get("id")
        if not isinstance(identity, str) or not identity:
            errors.append("Invalid tool ID")
        elif identity in seen:
            errors.append("Duplicate tool ID: " + identity)
        else:
            seen.add(identity)
        if row.get("status") not in PROBE_STATES:
            errors.append("Invalid probe state")
        if any(not isinstance(row.get(key), str) or not row[key].strip() for key in required - {"checked_at"}):
            errors.append("Empty or invalid registry contract")
    return errors

def validate_panel(raw, exported):
    """Check exact supplied bytes, versioned identifiers, uniqueness and order."""
    ids = raw.decode("utf-8-sig").splitlines()
    errors = []
    if len(ids) != 177 or len(set(ids)) != 177:
        errors.append("Expected exactly 177 unique accessions")
    if any(not re.fullmatch(r"GC[AF]_\d{9}\.\d+", value) for value in ids):
        errors.append("Invalid versioned accession")
    if hashlib.sha256(raw).hexdigest() != "56209c6042213da0ea96160d2a2d4e785d7574246b4b8d0371a290333c9e264a":
        errors.append("Supplied accession bytes changed")
    if ids != exported:
        errors.append("Exported panel content or order changed")
    return errors
def verify():
    data = json.loads((ROOT / "docs/data/atlas.json").read_text())
    raw = (ROOT / "inputs/selected_accessions.txt").read_bytes()
    assert not validate_registry(data["tools"]), validate_registry(data["tools"])
    assert {tool["id"] for tool in data["tools"]} == TOOL_IDS, "Required tool missing"
    assert not validate_panel(raw, data["panel"]["accessions"]), validate_panel(raw, data["panel"]["accessions"])
    assert data["states"]["probe"] == PROBE_STATES
    assert data["states"]["request"] == ["DRAFT", "REQUIRES_CONFIRMATION"]
    assert data["panel"]["taxonomy_status"] == data["panel"]["group_mapping_status"] == "NOT_TESTED"
    assert all(tool["status"] == "NOT_TESTED" for tool in data["tools"] if tool["layer"] == "Science")
    assert data["deployment"]["native_sites"] == data["deployment"]["github_pages"] == "NOT_DEPLOYED"
    assert data["deployment"]["native_url"] is None
    for record in data["tools"] + data["probes"]:
        evidence = (ROOT / "docs" / record["evidence_reference"]).resolve()
        assert evidence.is_relative_to(ROOT / "docs") and evidence.is_file(), "Invalid evidence reference"
    assert raw == (ROOT / "docs/data/selected_accessions.txt").read_bytes(), "Accession bytes changed"
    ids = raw.decode().splitlines()
    assert len(ids) == len(set(ids)) == 177
    assert all(re.fullmatch(r"GC[AF]_\d+\.\d+", x) for x in ids)
    assert ids == data["panel"]["accessions"]
    assert hashlib.sha256(raw).hexdigest() == data["panel"]["sha256"] == "56209c6042213da0ea96160d2a2d4e785d7574246b4b8d0371a290333c9e264a"
    assert len({t["id"] for t in data["tools"]}) == len(data["tools"])
    for tool in data["tools"]:
        assert tool["status"] in data["states"]["probe"]
        assert all(k in tool for k in ["id","name","layer","stage","advertised_capability","actual_probe_outcome","checked_at","evidence_reference","input_contract","output_contract","auth_cost_boundary","next_action"])
    assert (ROOT / "docs/data.js").read_text() == bundle()
    app = (ROOT / "docs/app.js").read_text()
    assert not re.search(r"innerHTML|outerHTML|insertAdjacentHTML|\beval\(|\bfetch\(|XMLHttpRequest|WebSocket", app)
    html = (ROOT / "docs/index.html").read_text(encoding="utf-8")
    assert "connect-src 'none'" in html and "form-action 'none'" in html
    for path in re.findall(r'(?:src|href)="([^"#]+)"', html):
        if not path.startswith("https://"):
            assert (ROOT / "docs" / path).is_file(), path
    for file in (ROOT / "docs").rglob("*"):
        if file.is_file():
            assert not re.search(r"C:\\\\?Users|/home/|Bearer\s+[A-Za-z0-9]|genomeatlas-fresh-9d60320c", file.read_text(encoding="utf-8")), file.name
    return 10

if __name__ == "__main__":
    try:
        count = verify()
        print(f"PASS: {count} invariant groups; 177 unique versioned accession records; byte identity preserved")
    except (AssertionError, ValueError) as error:
        print("FAIL:", error)
        sys.exit(1)
