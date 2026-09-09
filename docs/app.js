(function () {
  const TOOL_STATES = ["DECLARED", "DISCOVERED", "PROBED", "EXECUTED", "BLOCKED"];
  const RESULT_CLASSES = ["DETECTED", "NOT_DETECTED", "FAILED", "UNKNOWN"];
  const HASH_STATUSES = ["measured", "not_measured"];
  const MEASURED_SHA_PATTERN = /^(?:sha256:)?[A-Fa-f0-9]{64}$/;
  const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/;
  const MAX_RECEIPT_IMPORT_TEXT_LENGTH = 65536;
  const STORAGE_KEYS = {
    requests: "genomeatlas.requests.v1",
    probes: "genomeatlas.probeReceipts.v1"
  };
  const FALLBACK_DATA = {
  "registry": {
    "version": "1.0.0",
    "generatedAt": null,
    "entries": [
      {
        "id": "rdc",
        "name": "Remote Desktop Commander",
        "category": "endpoint-access",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-rdc-challenge-nonce",
        "inputContract": "Authorized endpoint challenge or command request.",
        "outputContract": "Challenge file read/write confirmation or command outcome from the authorized endpoint boundary.",
        "notes": "Challenge file write/read on Windows and WSL readback succeeded; a fuller WSL tmp acknowledgment script-write remained safety-blocked. Historical assertions remain unverified unless a retained receipt exists."
      },
      {
        "id": "github-connector",
        "name": "GitHub connector",
        "category": "repository-access",
        "state": "PROBED",
        "stageIds": [
          "assemblies",
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-github-connector-read",
        "inputContract": "Read-only repository metadata request.",
        "outputContract": "Repository listing, file metadata, or public source snapshots.",
        "notes": "Historical source browsing is separate from receipt-backed execution proof; the earlier repo-absence result is superseded by repository creation and must not be shown as current."
      },
      {
        "id": "github-cli",
        "name": "GitHub CLI",
        "category": "repository-access",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:21:19.3399192Z",
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-gh-auth",
        "inputContract": "Authenticated GitHub read command.",
        "outputContract": "Authenticated repository-readable output with exit status.",
        "notes": "The authenticated Windows GitHub probe predates repository creation at 14:21:35Z, so any earlier repo-absence result is superseded historical context only."
      },
      {
        "id": "github-actions",
        "name": "GitHub Actions",
        "category": "ci-verification",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:47:55Z",
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-ci-verify-2e5d87a",
        "inputContract": "Bounded workflow-dispatch verification request against an exact source commit.",
        "outputContract": "Workflow logs, archive receipts, and synthetic software-only test outputs.",
        "notes": "Run 34365988867 verified source retrieval and blob hashing for commit 2e5d87a without approving unrelated observation or hash-model defects."
      },
      {
        "id": "copilot",
        "name": "Copilot",
        "category": "implementation",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:26:52Z",
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-copilot-pr",
        "inputContract": "Issue or pull request implementation request.",
        "outputContract": "Repository changes and test artifacts on the active PR branch.",
        "notes": "Source provenance is GitHub Actions run metadata; this is Copilot PR work, not a WD-local Codex review completion."
      },
      {
        "id": "codex-cli-session",
        "name": "Codex CLI/session",
        "category": "implementation",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-codex-review-complete",
        "inputContract": "Local Codex CLI probe, login status read, and read-only thread bootstrap request.",
        "outputContract": "CLI version/login output plus read-only thread/session status.",
        "notes": "Authorized WD observations showed CLI version 0.153.4 and ChatGPT login success; a separate private WD thread performed native read calls, a separate Codex review completed with the wrong test path so zero tests run by Codex, and native publication/write attempts remained blocked. Private thread and device identifiers are intentionally omitted."
      },
      {
        "id": "wsl-ubuntu",
        "name": "WSL Ubuntu",
        "category": "runtime",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-wsl-inventory-tests",
        "inputContract": "WSL Ubuntu command execution or legacy repository software-only test request.",
        "outputContract": "Command output, kernel details, or software-only test results.",
        "notes": "Ubuntu reported WSL1 rather than WSL2, and a separate synthetic inventory regression run passed 10 tests on legacy commit 7c27865b7113b0fe8b22a57a751ed82fdaae9c8a."
      },
      {
        "id": "ncbi-datasets",
        "name": "NCBI Datasets",
        "category": "assemblies",
        "state": "DECLARED",
        "stageIds": [
          "assemblies"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#ncbi-datasets",
        "inputContract": "Selected versioned assembly accession panel with hash verification.",
        "outputContract": "Downloaded versioned assemblies and metadata manifests.",
        "notes": "Prior selected-input panels remain inputs until verified; no assemblies are fabricated here."
      },
      {
        "id": "gtotree",
        "name": "GToTree",
        "category": "marker-families",
        "state": "DECLARED",
        "stageIds": [
          "markers"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#gtotree",
        "inputContract": "Annotated proteomes or genome inputs plus marker set selection.",
        "outputContract": "Conserved marker family sets and alignment-ready bundles.",
        "notes": "No completed analysis is claimed."
      },
      {
        "id": "hmmer",
        "name": "HMMER",
        "category": "marker-families",
        "state": "DECLARED",
        "stageIds": [
          "markers"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#hmmer",
        "inputContract": "Protein sequences and marker HMM profiles.",
        "outputContract": "Profile hits with thresholds and family assignments.",
        "notes": "Evidence-bound declaration only."
      },
      {
        "id": "alignment-trimming",
        "name": "Alignment and trimming tools",
        "category": "alignment",
        "state": "DECLARED",
        "stageIds": [
          "alignments"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#alignment-trimming",
        "inputContract": "Per-family protein or nucleotide sequence sets.",
        "outputContract": "Separate alignments and trimmed outputs per family.",
        "notes": "Stage intentionally remains separate per marker family."
      },
      {
        "id": "iqtree",
        "name": "IQ-TREE",
        "category": "phylogeny",
        "state": "DECLARED",
        "stageIds": [
          "host-tree"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#iqtree",
        "inputContract": "Prepared alignment sets and model-selection parameters.",
        "outputContract": "Host tree inference artifacts and model summaries.",
        "notes": "No host tree is fabricated in this repository."
      },
      {
        "id": "defensefinder",
        "name": "DefenseFinder",
        "category": "rm-detection",
        "state": "DECLARED",
        "stageIds": [
          "rm-detection"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#defensefinder",
        "inputContract": "Genomic loci or proteomes for defense-system detection.",
        "outputContract": "Candidate defense and R-M locus calls.",
        "notes": "Independent R-M detection remains unexecuted here."
      },
      {
        "id": "rebase",
        "name": "REBASE",
        "category": "rm-detection",
        "state": "DECLARED",
        "stageIds": [
          "rm-detection"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#rebase",
        "inputContract": "Restriction-modification enzyme reference lookup.",
        "outputContract": "Reference annotations for R-M review.",
        "notes": "Reference-only until externally verified."
      },
      {
        "id": "pubmed-entrez",
        "name": "PubMed/Entrez",
        "category": "review",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#pubmed-entrez",
        "inputContract": "Literature or accession queries.",
        "outputContract": "Linked records or citations for locus review.",
        "notes": "No manuscript or private data retrieval is performed here."
      },
      {
        "id": "geneious",
        "name": "Geneious",
        "category": "review",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#geneious",
        "inputContract": "Local sequence review project inputs.",
        "outputContract": "Human review workspace artifacts.",
        "notes": "Optional unprobed integration."
      },
      {
        "id": "itol",
        "name": "iTOL",
        "category": "visualization",
        "state": "DECLARED",
        "stageIds": [
          "rings"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#itol",
        "inputContract": "Host tree plus verified ring annotation tables.",
        "outputContract": "Four-ring visualization assets.",
        "notes": "No ring outputs are fabricated."
      },
      {
        "id": "bionemo-nim",
        "name": "BioNeMo/NIM",
        "category": "ai-assistant",
        "state": "PROBED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-bionemo-source",
        "inputContract": "Toolkit source retrieval, installed-skill lookup, or NIM skill resource request.",
        "outputContract": "Source snapshots, skill catalogue entries, or NIM route status.",
        "notes": "Official catalog inspection read NVIDIA-BioNeMo/bionemo-agent-toolkit at commit 0e67a612e4045f007e38fa77adc8f3ebfc5616b6 with 62 SKILL.md files. NIM/GPU inference did not run, no suitable Parabricks replacement for marker phylogeny was established, and the CPU path remains preserved."
      },
      {
        "id": "smarts-bio",
        "name": "smarts.bio",
        "category": "bioinformatics-service",
        "state": "BLOCKED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-smarts-query-blocked",
        "inputContract": "Catalogue browse or named tool execution request.",
        "outputContract": "Catalogue entries, tool execution receipt, or explicit no-execution reply.",
        "notes": "Workspace listing succeeded on 2026-09-09, but advertised bioinformatics.gcContent returned 404 Tool not found and smarts_query explicitly confirmed execution BLOCKED. Catalog access is discovery only, not executed analysis."
      },
      {
        "id": "genomic-intelligence",
        "name": "Genomic Intelligence",
        "category": "analysis",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#genomic-intelligence",
        "inputContract": "External genomics-analysis task request.",
        "outputContract": "External result receipt requiring reviewer verification.",
        "notes": "Optional and unprobed; never silently authenticated."
      },
      {
        "id": "alphagenome",
        "name": "AlphaGenome",
        "category": "engineering-reference",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#alphagenome",
        "inputContract": "Explicit coordinate system, input alphabet, and bounded retry policy for transient failures.",
        "outputContract": "Versioned engineering-reference outputs only.",
        "notes": "Engineering-reference only; not a LAB classifier and no non-MIT assets are copied or relabeled."
      },
      {
        "id": "native-chatgpt-sites",
        "name": "native ChatGPT Sites",
        "category": "deployment",
        "state": "BLOCKED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/evidence/parent-observations.json#obs-native-sites-list",
        "inputContract": "Native Site deployment or receipt lookup.",
        "outputContract": "Deployment receipt.",
        "notes": "A WD Codex session successfully listed native ChatGPT Sites after correcting the limit parameter from 100 to the service maximum of 50, but no saved versions or deployment receipts exist and local source writes were denied by session policy. Keep native publication blocked and public-safe only.",
        "deploymentStatus": "BLOCKED"
      }
    ]
  },
  "chains": {
    "version": "1.0.0",
    "title": "Scoped LAB phylogenomics flow",
    "rings": [
      "Type I",
      "Type II (including IIG)",
      "Type III",
      "Type IV"
    ],
    "stages": [
      {
        "id": "assemblies",
        "title": "Selected versioned assemblies",
        "description": "Use a prior selected input panel only after hash verification. No fabricated assemblies, species panels, or added Enterococcus records."
      },
      {
        "id": "proteomes",
        "title": "Annotated proteomes",
        "description": "Carry forward only annotated proteomes derived from the selected assemblies."
      },
      {
        "id": "markers",
        "title": "Conserved marker families",
        "description": "Identify conserved marker families before downstream tree building."
      },
      {
        "id": "alignments",
        "title": "Separate alignments",
        "description": "Maintain separate alignments per marker family; do not collapse them into a fabricated single result."
      },
      {
        "id": "host-tree",
        "title": "IQ-TREE host tree",
        "description": "Infer the host tree from verified alignment outputs only after upstream evidence is verified."
      },
      {
        "id": "rm-detection",
        "title": "Independent R-M detection",
        "description": "Run DefenseFinder and related R-M review from original ordered per-replicon proteomes plus genomic coordinates, independent of host-marker alignments."
      },
      {
        "id": "review",
        "title": "Locus review",
        "description": "Review loci manually with explicit evidence links and human approval gates after R-M detection; host tree context may be added later but is not required."
      },
      {
        "id": "rings",
        "title": "Four rings",
        "description": "Publish the Type I, Type II (including IIG), Type III, and Type IV rings from reviewed R-M evidence, with host-tree context optionally layered directly into the rings."
      }
    ],
    "edges": [
      {
        "from": "assemblies",
        "to": "proteomes"
      },
      {
        "from": "proteomes",
        "to": "markers"
      },
      {
        "from": "markers",
        "to": "alignments"
      },
      {
        "from": "alignments",
        "to": "host-tree"
      },
      {
        "from": "proteomes",
        "to": "rm-detection"
      },
      {
        "from": "rm-detection",
        "to": "review"
      },
      {
        "from": "review",
        "to": "rings"
      },
      {
        "from": "host-tree",
        "to": "rings"
      }
    ]
  },
  "evidence": {
    "version": "1.0.0",
    "historical": true,
    "redacted": true,
    "observations": [
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-rdc-challenge-nonce",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "rdc",
        "state": "EXECUTED",
        "summary": "Windows challenge file write/read and WSL read of the same nonce succeeded on the authorized boundary.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Historical assertion only. No retained payload hash or precise UTC timestamp was provided."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-script-write-blocked",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "rdc",
        "state": "BLOCKED",
        "summary": "A fuller WSL tmp acknowledgment script-write was safety-blocked and must not be bypassed.",
        "classification": "FAILED",
        "exitCode": 1,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Historical assertion only. No retained payload hash or precise UTC timestamp was provided."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-github-connector-read",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "github-connector",
        "state": "PROBED",
        "summary": "GitHub connector could read this repository and initially saw the MIT license with only README and LICENSE present.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Historical assertion only. The earlier repo-absence result preceded repository creation and is superseded, never current."
      },
      {
        "kind": "observation-record",
        "recordType": "reference-snapshot",
        "id": "obs-gh-auth",
        "recordedAt": "2026-09-09T14:21:19.3399192Z",
        "probeTimestamp": "2026-09-09T14:21:19.3399192Z",
        "toolId": "github-cli",
        "state": "EXECUTED",
        "summary": "Authenticated Windows GitHub probe succeeded.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent reference snapshot",
        "evidenceLocation": "Windows GitHub probe metadata",
        "notes": "Repository creation followed at 2026-09-09T14:21:35Z, so any prior repo-absence result is superseded historical context only."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-codex-cli-version",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "codex-cli-session",
        "state": "EXECUTED",
        "summary": "On the authorized WD, `npx @openai/codex --version` returned `codex-cli 0.153.4` and exit 0.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Historical assertion only. The CLI is present; no precise UTC timestamp or retained payload hash was provided."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-codex-login",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "codex-cli-session",
        "state": "EXECUTED",
        "summary": "Codex login status reported logged in with ChatGPT.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Historical assertion only. Session identifiers remain private by default."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-codex-thread-oauth-error",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "codex-cli-session",
        "state": "BLOCKED",
        "summary": "A new local read-only Codex thread later hit an unrelated Cloudflare MCP OAuth-required transport error.",
        "classification": "FAILED",
        "exitCode": 1,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "WD task metadata",
        "evidenceLocation": "WD task metadata",
        "notes": "Parent reported process exit 1, but no retained exact UTC event metadata was provided."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-codex-review-complete",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "codex-cli-session",
        "state": "EXECUTED",
        "summary": "A separate authorized WD Codex review completed, but it targeted the wrong test path so zero tests run by Codex.",
        "classification": "UNKNOWN",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "This is distinct from the independent WSL Ubuntu run that passed 10 software-only tests."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-wsl-runtime",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "wsl-ubuntu",
        "state": "EXECUTED",
        "summary": "Git and Ubuntu uname succeeded in WSL Ubuntu, which reported a WSL1 kernel rather than WSL2.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Historical assertion only. No retained payload hash or precise UTC timestamp was provided."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-wsl-inventory-tests",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "wsl-ubuntu",
        "state": "EXECUTED",
        "summary": "WSL Ubuntu independently ran 10 inventory regression tests against legacy repo commit 7c27865b7113b0fe8b22a57a751ed82fdaae9c8a; all 10 passed in 10.376s.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "legacy repo software-only test summary",
        "notes": "Synthetic software-only scope, not genomic execution. Precise UTC timing was not retained."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-bionemo-source",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "bionemo-nim",
        "state": "PROBED",
        "summary": "BioNeMo catalog inspection read NVIDIA-BioNeMo/bionemo-agent-toolkit commit 0e67a612e4045f007e38fa77adc8f3ebfc5616b6 and counted 62 SKILL.md files.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "public GitHub source snapshot",
        "notes": "Apache-2.0 code and CC-BY-4.0 documentation remain third-party references only. NIM/GPU inference did not run, no suitable Parabricks replacement was established for marker phylogeny, and the CPU path remains preserved."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-bionemo-installed-route-unresolved",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "bionemo-nim",
        "state": "DISCOVERED",
        "summary": "The installed BioNeMo skill route remains unresolved.",
        "classification": "UNKNOWN",
        "exitCode": 404,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Use the toolkit only as optional structural or homolog-search guidance, never as a replacement for the frozen LAB conserved-marker alignment."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-smarts-bio-workspace-list",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "smarts-bio",
        "state": "DISCOVERED",
        "summary": "smarts.bio workspace listing succeeded on 2026-09-09, exposing catalog access only.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "This is discovery only and must not be represented as executed analysis."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-smarts-bio-tool-404",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "smarts-bio",
        "state": "PROBED",
        "summary": "Advertised smarts.bio bioinformatics.gcContent returned 404 Tool not found.",
        "classification": "UNKNOWN",
        "exitCode": 404,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "The advertised tool route did not execute a successful analysis."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-smarts-query-blocked",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "smarts-bio",
        "state": "BLOCKED",
        "summary": "smarts_query explicitly confirmed execution BLOCKED and no tool was executed.",
        "classification": "FAILED",
        "exitCode": 1,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "The manual 50% GC answer for synthetic ACGTACGT remains a non-execution response."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-native-sites-list",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "native-chatgpt-sites",
        "state": "PROBED",
        "summary": "Native ChatGPT Sites list_sites succeeded after correcting limit 100 to the service maximum of 50; no deployment occurred.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Only public-safe capability facts are retained here. No unrelated site or account inventory is exposed, and no saved versions or deployment receipts were retained."
      },
      {
        "kind": "observation-record",
        "recordType": "historical-assertion",
        "id": "obs-native-sites-write-blocked",
        "recordedAt": null,
        "probeTimestamp": null,
        "toolId": "native-chatgpt-sites",
        "state": "BLOCKED",
        "summary": "Native ChatGPT Sites local source writes and publication attempts were denied by session policy.",
        "classification": "FAILED",
        "exitCode": 1,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "parent observation ledger",
        "evidenceLocation": "parent observation ledger",
        "notes": "Discovery succeeded separately, but no saved versions or deployments were created."
      },
      {
        "kind": "observation-record",
        "recordType": "reference-snapshot",
        "id": "obs-ci-verify-2e5d87a",
        "recordedAt": "2026-09-09T14:48:03.6470110Z",
        "probeTimestamp": "2026-09-09T14:48:02.3731859Z",
        "toolId": "github-actions",
        "state": "EXECUTED",
        "summary": "GitHub Actions run 34365988867 retrieved the exact 2e5d87a source, ran 8 software-only Node tests, and published archive/hash receipts.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "GitHub Actions job log",
        "evidenceLocation": "https://github.com/timelabs-npo/genomeatlas/actions/runs/34365988867",
        "notes": "This confirms source retrieval and archived blob hashing for that workflow run only; it is not acceptance of unrelated hash-model or observation defects."
      },
      {
        "kind": "observation-record",
        "recordType": "reference-snapshot",
        "id": "obs-copilot-pr",
        "recordedAt": "2026-09-09T14:26:52Z",
        "probeTimestamp": "2026-09-09T14:26:52Z",
        "toolId": "copilot",
        "state": "EXECUTED",
        "summary": "Copilot is actively implementing this pull request.",
        "classification": "DETECTED",
        "exitCode": 0,
        "hashStatus": "not_measured",
        "hashSha256": null,
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "GitHub Actions run metadata",
        "evidenceLocation": "GitHub Actions run metadata",
        "notes": "This is not a WD-local Codex session."
      }
    ]
  }
};

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "entry";
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isNonEmptyString(value, maxLength) {
    return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
  }

  function hasUnsafeHtml(value) {
    return typeof value === "string" && (/<[^>]*>/.test(value) || /&(?:lt|gt|#x3c|#x3e);/i.test(value));
  }

  function daysInMonth(year, month) {
    return [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }

  function isIsoTimestamp(value) {
    if (typeof value !== "string") {
      return false;
    }
    const match = ISO_TIMESTAMP_PATTERN.exec(value);
    if (!match) {
      return false;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    if (month < 1 || month > 12) {
      return false;
    }
    if (day < 1 || day > daysInMonth(year, month)) {
      return false;
    }
    if (hour > 23 || minute > 59 || second > 59) {
      return false;
    }
    return true;
  }

  function hasClassificationExitConsistency(result) {
    if (!result || !Number.isInteger(result.exitCode)) {
      return true;
    }
    if (result.classification === "DETECTED" || result.classification === "NOT_DETECTED") {
      return result.exitCode === 0;
    }
    if (result.classification === "FAILED") {
      return result.exitCode !== 0;
    }
    return true;
  }

  function validateReceipt(receipt) {
    const errors = [];
    if (!isPlainObject(receipt)) {
      return { valid: false, errors: ["Receipt must be an object."] };
    }
    if (receipt.kind !== "probe-receipt") {
      errors.push("kind must equal probe-receipt.");
    }
    if (receipt.version !== "1.0.0") {
      errors.push("version must equal 1.0.0.");
    }
    if (!/^[a-z0-9-]+$/.test(String(receipt.toolId || ""))) {
      errors.push("toolId must contain only lowercase letters, numbers, and hyphens.");
    }
    if (!TOOL_STATES.includes(receipt.state)) {
      errors.push("state must be one of DECLARED, DISCOVERED, PROBED, EXECUTED, BLOCKED.");
    }
    if (!isIsoTimestamp(receipt.probeTimestamp)) {
      errors.push("probeTimestamp must be a valid ISO datetime string.");
    }
    ["summary", "inputContract", "outputContract"].forEach(function (field) {
      if (!isNonEmptyString(receipt[field], 500)) {
        errors.push(field + " must be a non-empty string up to 500 characters.");
      }
      if (hasUnsafeHtml(receipt[field])) {
        errors.push(field + " contains unsafe HTML-like content.");
      }
    });

    if (!isPlainObject(receipt.evidence)) {
      errors.push("evidence must be an object.");
    } else {
      if (!isNonEmptyString(receipt.evidence.location, 500)) {
        errors.push("evidence.location must be a non-empty string up to 500 characters.");
      }
      if (hasUnsafeHtml(receipt.evidence.location)) {
        errors.push("evidence.location contains unsafe HTML-like content.");
      }
      if (!HASH_STATUSES.includes(receipt.evidence.hashStatus)) {
        errors.push("evidence.hashStatus must be measured or not_measured.");
      }
      if (receipt.evidence.hashStatus === "measured") {
        if (!MEASURED_SHA_PATTERN.test(String(receipt.evidence.sha256 || ""))) {
          errors.push("evidence.sha256 must be 64 hexadecimal digits with an optional sha256: prefix when measured.");
        }
      } else if (receipt.evidence.hashStatus === "not_measured") {
        if (receipt.evidence.sha256 !== null) {
          errors.push("evidence.sha256 must be null when hashStatus is not_measured.");
        }
      } else if (receipt.evidence.sha256 !== null && receipt.evidence.sha256 !== undefined) {
        errors.push("evidence.sha256 cannot be used without a valid hashStatus.");
      }
    }

    if (!isPlainObject(receipt.result)) {
      errors.push("result must be an object.");
    } else {
      if (!RESULT_CLASSES.includes(receipt.result.classification)) {
        errors.push("result.classification must be one of DETECTED, NOT_DETECTED, FAILED, UNKNOWN.");
      }
      if (!Number.isInteger(receipt.result.exitCode)) {
        errors.push("result.exitCode must be an integer.");
      }
      if (!hasClassificationExitConsistency(receipt.result)) {
        errors.push("result.classification and result.exitCode are inconsistent.");
      }
    }

    if (!isPlainObject(receipt.review)) {
      errors.push("review must be an object.");
    } else {
      if (typeof receipt.review.verified !== "boolean") {
        errors.push("review.verified must be boolean.");
      }
      if (receipt.review.reviewer != null) {
        if (!isNonEmptyString(receipt.review.reviewer, 200)) {
          errors.push("review.reviewer must be null or a non-empty string up to 200 characters.");
        }
        if (hasUnsafeHtml(receipt.review.reviewer)) {
          errors.push("review.reviewer contains unsafe HTML-like content.");
        }
      }
    }

    return { valid: errors.length === 0, errors: errors };
  }

  function normalizeImportedReceipt(receipt) {
    const copy = clone(receipt);
    copy.review = { verified: false, reviewer: null };
    copy.importStatus = "UNVERIFIED_IMPORTED";
    copy.importedAt = isIsoTimestamp(copy.importedAt) ? copy.importedAt : new Date().toISOString();
    return copy;
  }

  function sanitizeStoredReceipts(receipts) {
    if (!Array.isArray(receipts)) {
      return [];
    }
    return receipts.reduce(function (items, receipt) {
      const verdict = validateReceipt(receipt);
      if (!verdict.valid) {
        return items;
      }
      const copy = clone(receipt);
      copy.review = { verified: false, reviewer: null };
      if (copy.source === "local-entry") {
        delete copy.importStatus;
      } else {
        copy.importStatus = "UNVERIFIED_IMPORTED";
        copy.importedAt = isIsoTimestamp(copy.importedAt) ? copy.importedAt : new Date().toISOString();
      }
      items.push(copy);
      return items;
    }, []);
  }

  function importReceiptText(text) {
    if (typeof text !== "string") {
      throw new Error("Receipt import must be a JSON string.");
    }
    if (text.length > MAX_RECEIPT_IMPORT_TEXT_LENGTH) {
      throw new Error("Receipt import exceeds the maximum import size.");
    }
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const normalized = [];
    items.forEach(function (item, index) {
      const verdict = validateReceipt(item);
      if (!verdict.valid) {
        throw new Error("Receipt " + (index + 1) + " failed validation: " + verdict.errors.join(" "));
      }
      normalized.push(normalizeImportedReceipt(item));
    });
    return normalized;
  }

  function escapeCsvCell(value) {
    let text = value == null ? "" : String(value);
    if (/^[\t\r\n ]*[=+\-@]/.test(text)) {
      text = "'" + text;
    }
    if (/[",\r\n]/.test(text)) {
      text = '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function recordsToCsv(records, columns) {
    const header = columns.map(function (column) {
      return escapeCsvCell(column.label);
    }).join(",");
    const lines = records.map(function (record) {
      return columns.map(function (column) {
        const value = typeof column.getter === "function" ? column.getter(record) : record[column.key];
        return escapeCsvCell(value);
      }).join(",");
    });
    return [header].concat(lines).join("\n");
  }

  function filterRegistry(entries, options) {
    const query = String((options && options.search) || "").trim().toLowerCase();
    const state = (options && options.state) || "ALL";
    const stage = (options && options.stage) || "ALL";
    return entries.filter(function (entry) {
      const haystack = [
        entry.id,
        entry.name,
        entry.category,
        entry.notes,
        entry.inputContract,
        entry.outputContract,
        entry.evidenceLocation
      ].join(" ").toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesState = state === "ALL" || entry.state === state;
      const matchesStage = stage === "ALL" || (Array.isArray(entry.stageIds) && entry.stageIds.includes(stage));
      return matchesQuery && matchesState && matchesStage;
    });
  }

  function createRequestArtifact(input) {
    if (!input || input.confirmed !== true) {
      throw new Error("Confirmation is required before a request artifact can be created.");
    }
    return {
      kind: "request-artifact",
      version: "1.0.0",
      id: "request-" + slugify(input.toolId) + "-" + Date.now(),
      toolId: input.toolId,
      stageId: input.stageId,
      summary: String(input.summary || "").trim(),
      justification: String(input.justification || "").trim(),
      requestedAt: new Date().toISOString(),
      status: "REQUESTED",
      verified: false,
      execution: null
    };
  }

  function createProbeReceipt(input, registryMap) {
    const tool = registryMap[input.toolId];
    if (!tool) {
      throw new Error("Unknown tool selected for local probe receipt.");
    }
    const hashStatus = input.hashStatus === "not_measured" ? "not_measured" : "measured";
    const receipt = {
      kind: "probe-receipt",
      version: "1.0.0",
      toolId: tool.id,
      state: input.state,
      probeTimestamp: new Date().toISOString(),
      summary: String(input.summary || "").trim(),
      inputContract: tool.inputContract,
      outputContract: tool.outputContract,
      evidence: {
        location: String(input.evidenceLocation || "").trim(),
        hashStatus: hashStatus,
        sha256: hashStatus === "not_measured" ? null : String(input.hashSha256 || "").trim()
      },
      result: {
        classification: input.classification,
        exitCode: Number(input.exitCode)
      },
      review: {
        verified: false,
        reviewer: null
      },
      source: "local-entry"
    };
    const verdict = validateReceipt(receipt);
    if (!verdict.valid) {
      throw new Error(verdict.errors.join(" "));
    }
    return receipt;
  }

  function normalizeObservationRecord(observation) {
    return {
      kind: observation.kind,
      recordType: observation.recordType,
      id: observation.id,
      recordedAt: observation.recordedAt || null,
      probeTimestamp: observation.probeTimestamp || null,
      toolId: observation.toolId,
      state: observation.state,
      summary: observation.summary,
      classification: observation.classification,
      exitCode: observation.exitCode,
      hashStatus: observation.hashStatus,
      hashSha256: observation.hashSha256,
      historicalStatus: observation.historicalStatus || "UNVERIFIED",
      sourceProvenance: observation.sourceProvenance || null,
      evidenceLocation: observation.evidenceLocation,
      notes: observation.notes || ""
    };
  }

  function safeStorageGet(key) {
    try {
      if (typeof localStorage === "undefined") {
        return [];
      }
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : [];
    } catch (_error) {
      return [];
    }
  }

  function safeStorageSet(key, value) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (_error) {
      // Ignore storage failures and keep the UI usable.
    }
  }

  function downloadText(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function stageTitleMap(stages) {
    return stages.reduce(function (map, stage) {
      map[stage.id] = stage.title;
      return map;
    }, {});
  }

  function buildStageLineage(chains) {
    const lineage = chains.stages.reduce(function (map, stage) {
      map[stage.id] = { incoming: [], outgoing: [] };
      return map;
    }, {});
    (chains.edges || []).forEach(function (edge) {
      if (lineage[edge.to]) {
        lineage[edge.to].incoming.push(edge.from);
      }
      if (lineage[edge.from]) {
        lineage[edge.from].outgoing.push(edge.to);
      }
    });
    return lineage;
  }

  function setMessage(element, text, tone) {
    element.textContent = text;
    element.dataset.tone = tone || "neutral";
  }

  function populateSelect(select, items, includeAllLabel) {
    select.textContent = "";
    if (includeAllLabel) {
      const allOption = document.createElement("option");
      allOption.value = "ALL";
      allOption.textContent = includeAllLabel;
      select.appendChild(allOption);
    }
    items.forEach(function (item) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });
  }

  function formatTimestampLabel(value, emptyLabel) {
    return value || emptyLabel;
  }

  function formatRegistryTimestamp(entry) {
    if (entry.probeTimestamp) {
      return entry.probeTimestamp;
    }
    return entry.state === "DECLARED" ? "Not yet probed" : "Historical assertion or timing unavailable";
  }

  function formatHashLabel(hashStatus, sha256) {
    return hashStatus === "measured" ? sha256 : "not_measured";
  }

  function renderFlow(data, root) {
    const list = root.querySelector("[data-flow-list]");
    const rings = root.querySelector("[data-rings-list]");
    list.textContent = "";
    rings.textContent = "";
    const titles = stageTitleMap(data.chains.stages);
    const lineage = buildStageLineage(data.chains);
    data.chains.stages.forEach(function (stage, index) {
      const item = document.createElement("li");
      item.className = "stage-card";
      const step = document.createElement("div");
      step.className = "eyebrow";
      step.textContent = "Step " + (index + 1);
      const title = document.createElement("h3");
      title.textContent = stage.title;
      const description = document.createElement("p");
      description.textContent = stage.description;
      const incoming = document.createElement("p");
      incoming.className = "stage-meta";
      incoming.textContent = "Depends on: " + (lineage[stage.id].incoming.length ? lineage[stage.id].incoming.map(function (stageId) { return titles[stageId] || stageId; }).join(", ") : "selected scope input");
      const outgoing = document.createElement("p");
      outgoing.className = "stage-meta";
      outgoing.textContent = "Feeds into: " + (lineage[stage.id].outgoing.length ? lineage[stage.id].outgoing.map(function (stageId) { return titles[stageId] || stageId; }).join(", ") : "final exported ring set");
      item.append(step, title, description, incoming, outgoing);
      list.appendChild(item);
    });
    data.chains.rings.forEach(function (ring, index) {
      const item = document.createElement("li");
      item.textContent = "Ring " + (index + 1) + ": " + ring;
      rings.appendChild(item);
    });
  }

  function renderRegistry(entries, data, root) {
    const body = root.querySelector("tbody");
    body.textContent = "";
    const stageTitles = stageTitleMap(data.chains.stages);
    entries.forEach(function (entry) {
      const row = document.createElement("tr");
      [
        entry.name,
        entry.state,
        entry.stageIds.map(function (stageId) { return stageTitles[stageId] || stageId; }).join(", "),
        formatRegistryTimestamp(entry),
        entry.evidenceLocation
      ].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderObservations(observations, root) {
    const body = root.querySelector("[data-observations-table] tbody");
    body.textContent = "";
    observations.forEach(function (observation) {
      const row = document.createElement("tr");
      [
        observation.toolId,
        observation.recordType,
        observation.state,
        observation.classification,
        observation.exitCode,
        formatTimestampLabel(observation.probeTimestamp, "unknown"),
        formatTimestampLabel(observation.recordedAt, "unknown"),
        formatHashLabel(observation.hashStatus, observation.hashSha256),
        observation.historicalStatus,
        observation.evidenceLocation,
        observation.summary
      ].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderReceipts(receipts, root) {
    const body = root.querySelector("[data-receipts-table] tbody");
    body.textContent = "";
    receipts.forEach(function (receipt) {
      const row = document.createElement("tr");
      [
        receipt.toolId,
        receipt.state,
        receipt.result.classification,
        receipt.result.exitCode,
        receipt.probeTimestamp,
        formatHashLabel(receipt.evidence.hashStatus, receipt.evidence.sha256),
        receipt.evidence.location,
        receipt.importStatus || "UNVERIFIED",
        receipt.summary
      ].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderRequests(requests, root) {
    const body = root.querySelector("tbody");
    body.textContent = "";
    requests.forEach(function (request) {
      const row = document.createElement("tr");
      [request.toolId, request.stageId, request.status, request.requestedAt, request.summary].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value || "");
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function collectObservationRecords(data) {
    return data.evidence.observations.map(function (observation) {
      return normalizeObservationRecord(observation);
    });
  }

  async function loadData() {
    if (typeof window === "undefined" || window.location.protocol === "file:") {
      return clone(FALLBACK_DATA);
    }
    try {
      const responses = await Promise.all([
        fetch("./data/registry.json"),
        fetch("./data/chains.json"),
        fetch("./evidence/parent-observations.json")
      ]);
      const payloads = await Promise.all(responses.map(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load " + response.url);
        }
        return response.json();
      }));
      return {
        registry: payloads[0],
        chains: payloads[1],
        evidence: payloads[2]
      };
    } catch (_error) {
      return clone(FALLBACK_DATA);
    }
  }

  async function init() {
    const data = await loadData();
    const appRoot = document.querySelector("[data-app]");
    const message = document.querySelector("[data-message]");
    const registrySection = document.querySelector("[data-registry]");
    const observationsSection = document.querySelector("[data-observations]");
    const probesSection = document.querySelector("[data-probes]");
    const requestsSection = document.querySelector("[data-requests]");
    const flowSection = document.querySelector("[data-flow]");
    const registrySearch = document.querySelector("#registry-search");
    const registryState = document.querySelector("#registry-state");
    const registryStage = document.querySelector("#registry-stage");
    const importInput = document.querySelector("#receipt-import");
    const probeForm = document.querySelector("#probe-form");
    const requestForm = document.querySelector("#request-form");
    const summaryTools = document.querySelector("[data-summary-tools]");
    const summaryObservations = document.querySelector("[data-summary-observations]");
    const summaryReceipts = document.querySelector("[data-summary-receipts]");
    const summaryRequests = document.querySelector("[data-summary-requests]");

    const registryMap = data.registry.entries.reduce(function (map, entry) {
      map[entry.id] = entry;
      return map;
    }, {});
    let localReceipts = safeStorageGet(STORAGE_KEYS.probes);
    let requests = safeStorageGet(STORAGE_KEYS.requests);
    localReceipts = sanitizeStoredReceipts(localReceipts);
    safeStorageSet(STORAGE_KEYS.probes, localReceipts);

    populateSelect(registryState, TOOL_STATES.map(function (state) {
      return { value: state, label: state };
    }), "All states");
    populateSelect(registryStage, data.chains.stages.map(function (stage) {
      return { value: stage.id, label: stage.title };
    }), "All stages");
    populateSelect(document.querySelector("#probe-tool"), data.registry.entries.map(function (entry) {
      return { value: entry.id, label: entry.name };
    }));
    populateSelect(document.querySelector("#probe-state"), TOOL_STATES.map(function (state) {
      return { value: state, label: state };
    }));
    populateSelect(document.querySelector("#probe-classification"), RESULT_CLASSES.map(function (state) {
      return { value: state, label: state };
    }));
    populateSelect(document.querySelector("#probe-hash-status"), HASH_STATUSES.map(function (state) {
      return { value: state, label: state };
    }));
    populateSelect(document.querySelector("#request-tool"), data.registry.entries.map(function (entry) {
      return { value: entry.id, label: entry.name };
    }));
    populateSelect(document.querySelector("#request-stage"), data.chains.stages.map(function (stage) {
      return { value: stage.id, label: stage.title };
    }));

    function refresh() {
      const filtered = filterRegistry(data.registry.entries, {
        search: registrySearch.value,
        state: registryState.value,
        stage: registryStage.value
      });
      const observations = collectObservationRecords(data);
      renderFlow(data, flowSection);
      renderRegistry(filtered, data, registrySection);
      renderObservations(observations, observationsSection);
      renderReceipts(localReceipts, probesSection);
      renderRequests(requests, requestsSection);
      summaryTools.textContent = String(filtered.length);
      summaryObservations.textContent = String(observations.length);
      summaryReceipts.textContent = String(localReceipts.length);
      summaryRequests.textContent = String(requests.length);
      appRoot.dataset.ready = "true";
    }

    function exportObservationsJson() {
      downloadText("genomeatlas-observations.json", JSON.stringify(collectObservationRecords(data), null, 2), "application/json");
    }

    function exportObservationsCsv() {
      const csv = recordsToCsv(collectObservationRecords(data), [
        { key: "toolId", label: "toolId" },
        { key: "recordType", label: "recordType" },
        { key: "state", label: "state" },
        { key: "classification", label: "classification" },
        { key: "exitCode", label: "exitCode" },
        { key: "probeTimestamp", label: "probeTimestamp" },
        { key: "recordedAt", label: "recordedAt" },
        { key: "hashStatus", label: "hashStatus" },
        { key: "hashSha256", label: "sha256" },
        { key: "historicalStatus", label: "historicalStatus" },
        { key: "evidenceLocation", label: "evidenceLocation" },
        { key: "summary", label: "summary" }
      ]);
      downloadText("genomeatlas-observations.csv", csv, "text/csv");
    }

    function exportProbeJson() {
      downloadText("genomeatlas-probe-receipts.json", JSON.stringify(localReceipts, null, 2), "application/json");
    }

    function exportProbeCsv() {
      const csv = recordsToCsv(localReceipts, [
        { key: "toolId", label: "toolId" },
        { key: "state", label: "state" },
        { label: "classification", getter: function (probe) { return probe.result.classification; } },
        { label: "exitCode", getter: function (probe) { return probe.result.exitCode; } },
        { key: "probeTimestamp", label: "probeTimestamp" },
        { label: "hashStatus", getter: function (probe) { return probe.evidence.hashStatus; } },
        { label: "sha256", getter: function (probe) { return probe.evidence.sha256; } },
        { label: "evidenceLocation", getter: function (probe) { return probe.evidence.location; } },
        { label: "verified", getter: function (probe) { return probe.review.verified; } },
        { key: "summary", label: "summary" }
      ]);
      downloadText("genomeatlas-probe-receipts.csv", csv, "text/csv");
    }

    function exportRequestJson() {
      downloadText("genomeatlas-requests.json", JSON.stringify(requests, null, 2), "application/json");
    }

    function exportRequestCsv() {
      const csv = recordsToCsv(requests, [
        { key: "toolId", label: "toolId" },
        { key: "stageId", label: "stageId" },
        { key: "status", label: "status" },
        { key: "requestedAt", label: "requestedAt" },
        { key: "summary", label: "summary" },
        { key: "justification", label: "justification" }
      ]);
      downloadText("genomeatlas-requests.csv", csv, "text/csv");
    }

    registrySearch.addEventListener("input", refresh);
    registryState.addEventListener("change", refresh);
    registryStage.addEventListener("change", refresh);

    document.querySelector("[data-export-observation-json]").addEventListener("click", exportObservationsJson);
    document.querySelector("[data-export-observation-csv]").addEventListener("click", exportObservationsCsv);
    document.querySelector("[data-export-probe-json]").addEventListener("click", exportProbeJson);
    document.querySelector("[data-export-probe-csv]").addEventListener("click", exportProbeCsv);
    document.querySelector("[data-export-request-json]").addEventListener("click", exportRequestJson);
    document.querySelector("[data-export-request-csv]").addEventListener("click", exportRequestCsv);

    document.querySelector("#import-button").addEventListener("click", function () {
      const file = importInput.files && importInput.files[0];
      if (!file) {
        setMessage(message, "Choose a JSON receipt file first.", "warning");
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const imported = importReceiptText(String(reader.result || ""));
          localReceipts = sanitizeStoredReceipts(localReceipts.concat(imported));
          safeStorageSet(STORAGE_KEYS.probes, localReceipts);
          refresh();
          setMessage(message, "Imported " + imported.length + " receipt(s) as unverified evidence.", "success");
          importInput.value = "";
        } catch (error) {
          setMessage(message, error.message, "danger");
        }
      };
      reader.readAsText(file);
    });

    probeForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(probeForm);
      try {
        const receipt = createProbeReceipt({
          toolId: formData.get("toolId"),
          state: formData.get("state"),
          classification: formData.get("classification"),
          summary: formData.get("summary"),
          evidenceLocation: formData.get("evidenceLocation"),
          exitCode: formData.get("exitCode"),
          hashStatus: formData.get("hashStatus"),
          hashSha256: formData.get("hashSha256")
        }, registryMap);
        localReceipts = sanitizeStoredReceipts(localReceipts.concat(receipt));
        safeStorageSet(STORAGE_KEYS.probes, localReceipts);
        refresh();
        probeForm.reset();
        setMessage(message, "Recorded a local probe receipt without marking it verified.", "success");
      } catch (error) {
        setMessage(message, error.message, "danger");
      }
    });

    requestForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(requestForm);
      try {
        const request = createRequestArtifact({
          toolId: formData.get("toolId"),
          stageId: formData.get("stageId"),
          summary: formData.get("summary"),
          justification: formData.get("justification"),
          confirmed: formData.get("confirmed") === "on"
        });
        requests = requests.concat(request);
        safeStorageSet(STORAGE_KEYS.requests, requests);
        refresh();
        requestForm.reset();
        setMessage(message, "Created a local REQUESTED artifact only; no execution was started.", "success");
      } catch (error) {
        setMessage(message, error.message, "danger");
      }
    });

    refresh();
    setMessage(message, "Loaded historical observations plus separate local-only receipt and planning controls.", "neutral");
  }

  const exported = {
    TOOL_STATES: TOOL_STATES,
    RESULT_CLASSES: RESULT_CLASSES,
    HASH_STATUSES: HASH_STATUSES,
    MAX_RECEIPT_IMPORT_TEXT_LENGTH: MAX_RECEIPT_IMPORT_TEXT_LENGTH,
    FALLBACK_DATA: FALLBACK_DATA,
    validateReceipt: validateReceipt,
    normalizeImportedReceipt: normalizeImportedReceipt,
    importReceiptText: importReceiptText,
    escapeCsvCell: escapeCsvCell,
    recordsToCsv: recordsToCsv,
    filterRegistry: filterRegistry,
    createRequestArtifact: createRequestArtifact,
    createProbeReceipt: createProbeReceipt,
    sanitizeStoredReceipts: sanitizeStoredReceipts,
    normalizeObservationRecord: normalizeObservationRecord,
    collectObservationRecords: collectObservationRecords,
    buildStageLineage: buildStageLineage,
    formatRegistryTimestamp: formatRegistryTimestamp,
    hasClassificationExitConsistency: hasClassificationExitConsistency,
    isIsoTimestamp: isIsoTimestamp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.GenomeAtlasApp = exported;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
