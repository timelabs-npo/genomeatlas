(function () {
  const TOOL_STATES = ["DECLARED", "DISCOVERED", "PROBED", "EXECUTED", "AUTH_REQUIRED", "BLOCKED_EXECUTION", "NOT_DEPLOYED"];
  const RESULT_CLASSES = ["DETECTED", "NOT_DETECTED", "FAILED", "UNKNOWN"];
  const HASH_STATUSES = ["measured", "not_measured"];
  const GATE_STATES = ["READY_FOR_REVIEW", "BLOCKED_UPSTREAM", "NOT_APPLICABLE"];
  const HEX64_PATTERN = /^[A-Fa-f0-9]{64}$/;
  const STORAGE_KEYS = {
    requests: "genomeatlas.requests.v1",
    probes: "genomeatlas.probes.v1"
  };
  const FALLBACK_DATA = {
  "registry": {
    "version": "1.0.0",
    "generatedAt": "2026-09-09T00:00:00Z",
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
        "evidenceLocation": "docs/data/receipts.json#receipt-windows-wsl-roundtrip",
        "inputContract": "Authorized Windows endpoint command request with a reviewer-provided nonce or probe packet.",
        "outputContract": "Sanitized proof that the Windows endpoint accepted the request and returned a bounded reply.",
        "notes": "Historical parent evidence only; no live endpoint control is exposed in this static suite."
      },
      {
        "id": "windows-wsl",
        "name": "Windows / WSL",
        "category": "runtime",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/receipts.json#receipt-windows-wsl-roundtrip",
        "inputContract": "Windows-to-Ubuntu-to-Windows roundtrip probe packet with bounded request and response digests.",
        "outputContract": "Sanitized receipt confirming the roundtrip and preserving request and response SHA-256 values.",
        "notes": "Captured as a historical sanitized receipt without private device identifiers or local paths."
      },
      {
        "id": "github-connector",
        "name": "GitHub",
        "category": "repository-access",
        "state": "PROBED",
        "stageIds": [
          "review",
          "release-gates"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/receipts.json#receipt-github-transport-branch",
        "inputContract": "Repository branch or file metadata request through the authenticated GitHub transport layer.",
        "outputContract": "Repository-visible branch metadata or connector reply evidence for the current repository.",
        "notes": "The public source branch transport probe is recorded as parent evidence only."
      },
      {
        "id": "github-cli",
        "name": "GitHub CLI",
        "category": "repository-access",
        "state": "EXECUTED",
        "stageIds": [
          "review",
          "release-gates"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/receipts.json#receipt-github-auth-write",
        "inputContract": "Authenticated WD to GitHub command targeting a bounded repository write or metadata exchange.",
        "outputContract": "Commit identifiers plus a sanitized WD reply digest for reviewer confirmation.",
        "notes": "Historical authenticated write evidence is recorded without exposing credentials or raw console history."
      },
      {
        "id": "github-copilot",
        "name": "GitHub Copilot",
        "category": "implementation",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:53:49Z",
        "evidenceLocation": "docs/data/receipts.json#receipt-copilot-pr",
        "inputContract": "Issue or pull-request implementation request constrained to this repository branch.",
        "outputContract": "Repository changes and local test artifacts on the active pull request branch.",
        "notes": "Execution is real but still subject to independent review; the suite does not claim merge or deployment."
      },
      {
        "id": "codex-cli",
        "name": "Codex CLI 0.153.4",
        "category": "implementation",
        "state": "BLOCKED_EXECUTION",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/receipts.json#receipt-codex-cli-policy-block",
        "inputContract": "Authenticated WD Codex session plus repository command request.",
        "outputContract": "Session metadata or an explicit policy block stating that repository access was rejected.",
        "notes": "A new model session ran, but repository access was denied by policy and produced zero file reads or test execution."
      },
      {
        "id": "smarts-bio",
        "name": "smarts.bio",
        "category": "bioinformatics-service",
        "state": "AUTH_REQUIRED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/receipts.json#receipt-smarts-bio-login",
        "inputContract": "Tool listing or execution request through the smarts.bio interface.",
        "outputContract": "Either a user-login requirement or a bounded execution receipt after authentication.",
        "notes": "The current public probe stopped at the login gate, so no tool run is claimed."
      },
      {
        "id": "bionemo-agent-toolkit",
        "name": "BioNeMo Agent Toolkit",
        "category": "ai-assistant",
        "state": "DISCOVERED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/receipts.json#receipt-bionemo-docs-inspection",
        "inputContract": "Official toolkit documentation review or installed-skill discovery request.",
        "outputContract": "Documentation findings or skill catalogue evidence, not a live NIM/model/GPU execution.",
        "notes": "Docs were inspected only; no NIM endpoint, model inference, or GPU job was executed."
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
        "inputContract": "Recorded177 assembly panel requests with explicit versioning, hashes, and the no-Enterococcus scope rule.",
        "outputContract": "Downloaded assembly bundles and metadata manifests for later review.",
        "notes": "This suite declares the contract only and does not download any genomes."
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
        "inputContract": "Proteomes or genome annotations plus conserved single-copy marker settings.",
        "outputContract": "Per-family marker selections that stay independent from R-M annotations.",
        "notes": "Declared only; no tree or marker output is fabricated here."
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
        "outputContract": "Profile hits supporting conserved single-copy marker family selection.",
        "notes": "Declared only; no hidden execution is claimed."
      },
      {
        "id": "mafft",
        "name": "MAFFT",
        "category": "alignment",
        "state": "DECLARED",
        "stageIds": [
          "alignments"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#mafft",
        "inputContract": "Per-family protein sequence sets produced from the conserved marker stage.",
        "outputContract": "Separate alignment files for each marker family.",
        "notes": "Alignments stay separate and are never collapsed into a fabricated one-step result."
      },
      {
        "id": "trimal",
        "name": "trimAl",
        "category": "alignment",
        "state": "DECLARED",
        "stageIds": [
          "trimming"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#trimal",
        "inputContract": "Per-family alignments with explicit trimming settings.",
        "outputContract": "Trimmed alignments that remain versioned before concatenation.",
        "notes": "Declared only; no trimmed data are included in this public repository."
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
        "inputContract": "Concatenated conserved single-copy marker alignments with explicit model-selection parameters.",
        "outputContract": "Host-tree inference artifacts kept separate from R-M annotations.",
        "notes": "No full host tree exists in this repository."
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
        "inputContract": "Ordered per-replicon protein and coordinate input for defense-system detection.",
        "outputContract": "Candidate loci that require human REBASE and primary-paper review.",
        "notes": "Predicted systems are not experimental restriction-activity proof."
      },
      {
        "id": "rebase",
        "name": "REBASE",
        "category": "rm-review",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/registry.json#rebase",
        "inputContract": "Candidate R-M loci or enzymes identified during ordered per-replicon review.",
        "outputContract": "Reference annotations for the manual locus-review packet.",
        "notes": "Declared only; no reviewed locus packet is bundled here."
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
        "inputContract": "Local sequence-review workspace inputs for human inspection.",
        "outputContract": "Private reviewer workspace artifacts, not public automation output.",
        "notes": "Optional and unprobed in this repository."
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
        "inputContract": "Verified host tree plus reviewed Type I, II/IIG, III, and IV ring annotations.",
        "outputContract": "Four-ring visualization assets for publication or review.",
        "notes": "Declared only; no ring output is fabricated."
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
        "inputContract": "External genomics-analysis request with explicit reviewer approval.",
        "outputContract": "External evidence packet requiring manual verification before reuse.",
        "notes": "Optional and intentionally unprobed here."
      },
      {
        "id": "native-chatgpt-sites",
        "name": "native ChatGPT Sites",
        "category": "deployment",
        "state": "NOT_DEPLOYED",
        "stageIds": [
          "release-gates"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "docs/data/receipts.json#receipt-native-sites-manifest",
        "inputContract": "Native ChatGPT Site manifest or deployment receipt lookup.",
        "outputContract": "An actual native deployment receipt, if one ever exists.",
        "notes": "No native deployment receipt exists, and GitHub Pages source must not be relabeled as a native ChatGPT Site."
      }
    ]
  },
  "chains": {
    "version": "1.0.0",
    "title": "LAB R-M Figure 2 helper flow",
    "scope": {
      "panelLabel": "recorded177 genome panel",
      "panelCount": 177,
      "groupCount": 10,
      "excludedTaxa": [
        "Enterococcus"
      ],
      "caveats": [
        "No full host tree exists in this repository.",
        "No full R-M result exists in this repository.",
        "Missing or failed evidence is never promoted to biological absence.",
        "Raw components remain unreviewed until a human checks them; they are not auto-partial.",
        "Predicted systems are not experimental restriction activity."
      ]
    },
    "rings": [
      "Type I",
      "Type II (including IIG)",
      "Type III",
      "Type IV"
    ],
    "stages": [
      {
        "id": "assemblies",
        "title": "Recorded input panel",
        "description": "Track the intended recorded177 genome panel in 10 groups with no Enterococcus additions or substitutions."
      },
      {
        "id": "proteomes",
        "title": "Annotated proteomes",
        "description": "Carry forward only annotated proteomes derived from the selected assemblies."
      },
      {
        "id": "markers",
        "title": "Conserved single-copy markers",
        "description": "Derive host-tree inputs from conserved single-copy marker proteins independently of R-M annotations."
      },
      {
        "id": "alignments",
        "title": "Per-family alignments",
        "description": "Create separate alignments for each conserved marker family and keep them isolated through review."
      },
      {
        "id": "trimming",
        "title": "Per-family trimming",
        "description": "Trim each alignment separately so that no fabricated combined result appears before validation."
      },
      {
        "id": "concatenation",
        "title": "Concatenation packet",
        "description": "Concatenate only verified per-family outputs for the host-tree branch."
      },
      {
        "id": "host-tree",
        "title": "IQ-TREE host tree",
        "description": "Infer the host tree from concatenated conserved-marker alignments, not from R-M calls."
      },
      {
        "id": "replicons",
        "title": "Ordered per-replicon packet",
        "description": "Prepare ordered per-replicon protein and coordinate input separately for the R-M branch."
      },
      {
        "id": "rm-detection",
        "title": "DefenseFinder R-M candidates",
        "description": "Run DefenseFinder on the ordered per-replicon packet and keep predictions separate from host-tree inference."
      },
      {
        "id": "review",
        "title": "Locus / REBASE / primary-paper review",
        "description": "Review candidate loci with REBASE and primary-paper checks; missing or failed components are not equivalent to absence."
      },
      {
        "id": "release-gates",
        "title": "Release gates",
        "description": "Check that scope, receipts, and reviewer approvals are explicit before any public release step is described."
      },
      {
        "id": "rings",
        "title": "Four R-M rings",
        "description": "Export Type I, Type II (including IIG), Type III, and Type IV rings only after verified upstream review."
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
        "from": "proteomes",
        "to": "replicons"
      },
      {
        "from": "markers",
        "to": "alignments"
      },
      {
        "from": "alignments",
        "to": "trimming"
      },
      {
        "from": "trimming",
        "to": "concatenation"
      },
      {
        "from": "concatenation",
        "to": "host-tree"
      },
      {
        "from": "replicons",
        "to": "rm-detection"
      },
      {
        "from": "host-tree",
        "to": "review"
      },
      {
        "from": "rm-detection",
        "to": "review"
      },
      {
        "from": "review",
        "to": "release-gates"
      },
      {
        "from": "release-gates",
        "to": "rings"
      }
    ]
  },
  "receipts": {
    "version": "1.0.0",
    "redacted": true,
    "receipts": [
      {
        "id": "receipt-windows-wsl-roundtrip",
        "toolId": "windows-wsl",
        "state": "EXECUTED",
        "classification": "DETECTED",
        "timestamp": null,
        "exitCode": null,
        "summary": "Windows to Ubuntu to Windows roundtrip matched the authorized parent probe digests.",
        "evidenceLocation": "docs/data/receipts.json#receipt-windows-wsl-roundtrip",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "sanitized parent receipt",
        "hashStatus": "measured",
        "hashSha256": "fe5608db0f8722d22f41f897936171871d7a737a3111346bff2ea40ee0ae7288",
        "receiptLinks": {
          "requestSha256": "9a709a74da6b06622c6d0d27c805ded1172546f7002b5435e5978faff3368aac",
          "responseSha256": "fe5608db0f8722d22f41f897936171871d7a737a3111346bff2ea40ee0ae7288"
        },
        "notes": "Sanitized cross-device receipt only; no private endpoint identifiers, local paths, or raw command history are included."
      },
      {
        "id": "receipt-github-auth-write",
        "toolId": "github-cli",
        "state": "EXECUTED",
        "classification": "DETECTED",
        "timestamp": null,
        "exitCode": null,
        "summary": "Authenticated WD to GitHub exchange preserved a write commit, a connector reply commit, and a WD reply SHA-256 digest.",
        "evidenceLocation": "docs/data/receipts.json#receipt-github-auth-write",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "sanitized parent receipt",
        "hashStatus": "measured",
        "hashSha256": "bafb44d0665c623fe8335b2be9b7fa0c18a3ec5107b326adcc241cd493f1cddd",
        "receiptLinks": {
          "writeCommit": "1c6d3490a745cef4dd41151e539ed06a43e06bd0",
          "connectorReplyCommit": "e7fb6936daac2648a613ad39b600ba5c04134b6f",
          "wdReplySha256": "bafb44d0665c623fe8335b2be9b7fa0c18a3ec5107b326adcc241cd493f1cddd"
        },
        "notes": "The suite records only sanitized identifiers needed for independent reviewer confirmation."
      },
      {
        "id": "receipt-github-transport-branch",
        "toolId": "github-connector",
        "state": "PROBED",
        "classification": "DETECTED",
        "timestamp": null,
        "exitCode": null,
        "summary": "Public source branch transport probe observed branch probe/transport-7d92.",
        "evidenceLocation": "docs/data/receipts.json#receipt-github-transport-branch",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "sanitized parent receipt",
        "hashStatus": "not_measured",
        "hashSha256": null,
        "receiptLinks": {
          "branch": "probe/transport-7d92"
        },
        "notes": "This is a transport observation only; it is not a merge, deployment, or release proof."
      },
      {
        "id": "receipt-copilot-pr",
        "toolId": "github-copilot",
        "state": "EXECUTED",
        "classification": "DETECTED",
        "timestamp": "2026-09-09T14:53:49Z",
        "exitCode": null,
        "summary": "GitHub Copilot is actively implementing this branch and still requires reviewer approval before merge or release.",
        "evidenceLocation": "docs/data/receipts.json#receipt-copilot-pr",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "GitHub Actions run metadata",
        "hashStatus": "not_measured",
        "hashSha256": null,
        "receiptLinks": {
          "workflowRun": "34366641708"
        },
        "notes": "Run metadata is bounded evidence only; it does not claim production deployment."
      },
      {
        "id": "receipt-codex-cli-policy-block",
        "toolId": "codex-cli",
        "state": "BLOCKED_EXECUTION",
        "classification": "UNKNOWN",
        "timestamp": null,
        "exitCode": null,
        "summary": "Codex CLI 0.153.4 authenticated on WD and started a new model session, but the command tool rejected repository access by policy.",
        "evidenceLocation": "docs/data/receipts.json#receipt-codex-cli-policy-block",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "sanitized parent receipt",
        "hashStatus": "not_measured",
        "hashSha256": null,
        "receiptLinks": {
          "version": "0.153.4",
          "policy": "repository access denied"
        },
        "notes": "Zero repository files were read and zero tests were executed from that session."
      },
      {
        "id": "receipt-smarts-bio-login",
        "toolId": "smarts-bio",
        "state": "AUTH_REQUIRED",
        "classification": "UNKNOWN",
        "timestamp": null,
        "exitCode": null,
        "summary": "smarts_list_tools required a user login before any further probe or execution could continue.",
        "evidenceLocation": "docs/data/receipts.json#receipt-smarts-bio-login",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "sanitized parent receipt",
        "hashStatus": "not_measured",
        "hashSha256": null,
        "receiptLinks": {
          "nextStep": "user login required"
        },
        "notes": "The suite records the gate honestly and does not fabricate a successful tool run."
      },
      {
        "id": "receipt-bionemo-docs-inspection",
        "toolId": "bionemo-agent-toolkit",
        "state": "DISCOVERED",
        "classification": "UNKNOWN",
        "timestamp": null,
        "exitCode": null,
        "summary": "BioNeMo official toolkit documentation was inspected, but no NIM endpoint, model inference, or GPU execution receipt exists.",
        "evidenceLocation": "docs/data/receipts.json#receipt-bionemo-docs-inspection",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "sanitized parent receipt",
        "hashStatus": "not_measured",
        "hashSha256": null,
        "receiptLinks": {
          "evidenceType": "documentation inspection"
        },
        "notes": "Manifest lookup failure and no live execution are preserved as explicit limitations."
      },
      {
        "id": "receipt-native-sites-manifest",
        "toolId": "native-chatgpt-sites",
        "state": "NOT_DEPLOYED",
        "classification": "UNKNOWN",
        "timestamp": null,
        "exitCode": null,
        "summary": "Native ChatGPT Sites are not deployed here; manifest resolution failed and no native deployment receipt exists.",
        "evidenceLocation": "docs/data/receipts.json#receipt-native-sites-manifest",
        "historicalStatus": "UNVERIFIED",
        "sourceProvenance": "sanitized parent receipt",
        "hashStatus": "not_measured",
        "hashSha256": null,
        "receiptLinks": {
          "manifest": "not resolved"
        },
        "notes": "GitHub Pages source remains portable static source only and is never relabeled as a native ChatGPT Site."
      }
    ]
  },
  "gates": {
    "version": "1.0.0",
    "gates": [
      {
        "id": "scope-lock",
        "title": "Scope lock: recorded177 panel, 10 groups, no Enterococcus",
        "status": "READY_FOR_REVIEW",
        "dependsOn": [
          "assemblies"
        ],
        "reason": "The helper records scope and exclusions, but it does not bundle assembly payloads or fabricate counts beyond the authorized scope statement."
      },
      {
        "id": "receipt-linkage",
        "title": "Receipts linked to declared tools",
        "status": "READY_FOR_REVIEW",
        "dependsOn": [
          "review"
        ],
        "reason": "Sanitized parent receipts are linked to registry tool IDs and stay UNVERIFIED until an external reviewer checks them."
      },
      {
        "id": "host-tree-artifacts",
        "title": "Attach conserved-marker concatenation and host-tree artifacts",
        "status": "BLOCKED_UPSTREAM",
        "dependsOn": [
          "concatenation",
          "host-tree"
        ],
        "reason": "No host tree or concatenated marker artifact exists in this static repository, so the gate remains blocked."
      },
      {
        "id": "rm-review-packet",
        "title": "Attach per-replicon DefenseFinder / REBASE / primary-paper review packet",
        "status": "BLOCKED_UPSTREAM",
        "dependsOn": [
          "rm-detection",
          "review"
        ],
        "reason": "No reviewed loci or experimental restriction-activity packet exists here; predictions alone cannot clear the gate."
      },
      {
        "id": "native-site-proof",
        "title": "Provide a native ChatGPT Site deployment receipt",
        "status": "NOT_APPLICABLE",
        "dependsOn": [
          "release-gates"
        ],
        "reason": "No native deployment receipt exists, and the portable static source must not be presented as a native ChatGPT Site."
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

  function isIsoTimestamp(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function validateReceipt(receipt, registryMap) {
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
    if (registryMap && !registryMap[receipt.toolId]) {
      errors.push("toolId must reference a known registry entry.");
    }
    if (!TOOL_STATES.includes(receipt.state)) {
      errors.push("state must be one of " + TOOL_STATES.join(", ") + ".");
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
        if (!HEX64_PATTERN.test(String(receipt.evidence.sha256 || ""))) {
          errors.push("evidence.sha256 must be exactly 64 hexadecimal digits when measured.");
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
        errors.push("result.classification must be one of " + RESULT_CLASSES.join(", ") + ".");
      }
      if (!Number.isInteger(receipt.result.exitCode)) {
        errors.push("result.exitCode must be an integer.");
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
    copy.importStatus = "UNVERIFIED_IMPORT";
    copy.importedAt = new Date().toISOString();
    return copy;
  }

  function importReceiptText(text, registryMap) {
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const normalized = [];
    items.forEach(function (item, index) {
      const verdict = validateReceipt(item, registryMap);
      if (!verdict.valid) {
        throw new Error("Receipt " + (index + 1) + " failed validation: " + verdict.errors.join(" "));
      }
      normalized.push(normalizeImportedReceipt(item));
    });
    return normalized;
  }

  function validateHistoricalReceipt(record, registryMap) {
    const errors = [];
    if (!isPlainObject(record)) {
      return { valid: false, errors: ["Historical receipt must be an object."] };
    }
    ["id", "toolId", "state", "classification", "summary", "evidenceLocation", "historicalStatus", "sourceProvenance"].forEach(function (field) {
      if (!isNonEmptyString(record[field], 500)) {
        errors.push(field + " must be a non-empty string up to 500 characters.");
      }
      if (hasUnsafeHtml(record[field])) {
        errors.push(field + " contains unsafe HTML-like content.");
      }
    });
    if (record.toolId && registryMap && !registryMap[record.toolId]) {
      errors.push("Historical receipt toolId must reference a known registry entry.");
    }
    if (!TOOL_STATES.includes(record.state)) {
      errors.push("Historical receipt state must be one of " + TOOL_STATES.join(", ") + ".");
    }
    if (!RESULT_CLASSES.includes(record.classification)) {
      errors.push("Historical receipt classification must be one of " + RESULT_CLASSES.join(", ") + ".");
    }
    if (!(record.timestamp === null || isIsoTimestamp(record.timestamp))) {
      errors.push("Historical receipt timestamp must be null or a valid ISO datetime string.");
    }
    if (!(record.exitCode === null || Number.isInteger(record.exitCode))) {
      errors.push("Historical receipt exitCode must be null or an integer.");
    }
    if (!HASH_STATUSES.includes(record.hashStatus)) {
      errors.push("Historical receipt hashStatus must be measured or not_measured.");
    }
    if (record.hashStatus === "measured") {
      if (!HEX64_PATTERN.test(String(record.hashSha256 || ""))) {
        errors.push("Historical receipt hashSha256 must be exactly 64 hexadecimal digits when measured.");
      }
    } else if (record.hashStatus === "not_measured" && record.hashSha256 !== null) {
      errors.push("Historical receipt hashSha256 must be null when hashStatus is not_measured.");
    }
    if (!isPlainObject(record.receiptLinks) || Object.keys(record.receiptLinks).length === 0) {
      errors.push("Historical receipt must include at least one receiptLinks entry.");
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function validateWorkspaceData(data) {
    const errors = [];
    if (!isPlainObject(data) || !isPlainObject(data.registry) || !Array.isArray(data.registry.entries)) {
      return { valid: false, errors: ["registry.entries must be present."] };
    }
    const registryMap = data.registry.entries.reduce(function (map, entry) {
      map[entry.id] = entry;
      return map;
    }, {});

    data.registry.entries.forEach(function (entry, index) {
      if (!isNonEmptyString(entry.id, 100) || !/^[a-z0-9-]+$/.test(entry.id)) {
        errors.push("registry entry " + (index + 1) + " has an invalid id.");
      }
      if (!isNonEmptyString(entry.name, 200)) {
        errors.push("registry entry " + (entry.id || index + 1) + " must have a name.");
      }
      if (!TOOL_STATES.includes(entry.state)) {
        errors.push("registry entry " + (entry.id || index + 1) + " has an unknown state.");
      }
      ["inputContract", "outputContract", "evidenceLocation", "notes"].forEach(function (field) {
        if (!isNonEmptyString(entry[field], 500)) {
          errors.push("registry entry " + (entry.id || index + 1) + " has an invalid " + field + ".");
        }
        if (hasUnsafeHtml(entry[field])) {
          errors.push("registry entry " + (entry.id || index + 1) + " has unsafe HTML in " + field + ".");
        }
      });
    });

    if (!isPlainObject(data.chains) || !Array.isArray(data.chains.stages) || !Array.isArray(data.chains.edges) || !Array.isArray(data.chains.rings)) {
      errors.push("chains data must include stages, edges, and rings arrays.");
    }
    if (!isPlainObject(data.receipts) || !Array.isArray(data.receipts.receipts)) {
      errors.push("receipts.receipts must be present.");
    } else {
      data.receipts.receipts.forEach(function (record, index) {
        const verdict = validateHistoricalReceipt(record, registryMap);
        if (!verdict.valid) {
          errors.push("historical receipt " + (index + 1) + " invalid: " + verdict.errors.join(" "));
        }
      });
    }
    if (!isPlainObject(data.gates) || !Array.isArray(data.gates.gates)) {
      errors.push("gates.gates must be present.");
    } else {
      data.gates.gates.forEach(function (gate, index) {
        if (!isNonEmptyString(gate.id, 100) || !isNonEmptyString(gate.title, 300) || !isNonEmptyString(gate.reason, 500)) {
          errors.push("gate " + (index + 1) + " is missing required fields.");
        }
        if (!GATE_STATES.includes(gate.status)) {
          errors.push("gate " + (gate.id || index + 1) + " has an unknown status.");
        }
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function escapeCsvCell(value) {
    let text = value == null ? "" : String(value);
    if (/^[=+\-@]/.test(text)) {
      text = "'" + text;
    }
    if (/[",\n]/.test(text)) {
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
      const haystack = [entry.id, entry.name, entry.category, entry.notes, entry.inputContract, entry.outputContract, entry.evidenceLocation].join(" ").toLowerCase();
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
      toolId: String(input.toolId || "").trim(),
      stageId: String(input.stageId || "").trim(),
      summary: String(input.summary || "").trim(),
      justification: String(input.justification || "").trim(),
      requestedAt: new Date().toISOString(),
      status: "REQUESTED",
      approved: false,
      executed: false
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
    const verdict = validateReceipt(receipt, registryMap);
    if (!verdict.valid) {
      throw new Error(verdict.errors.join(" "));
    }
    return receipt;
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
    if (entry.state === "DECLARED") {
      return "Not yet probed";
    }
    if (entry.state === "AUTH_REQUIRED") {
      return "Login required before probe";
    }
    if (entry.state === "NOT_DEPLOYED") {
      return "No deployment receipt";
    }
    return "Historical receipt only";
  }

  function formatHashLabel(evidence) {
    if (!evidence) {
      return "not_measured";
    }
    return evidence.hashStatus === "measured" ? evidence.sha256 : "not_measured";
  }

  function receiptRecordToProbe(record, registryMap) {
    const tool = registryMap[record.toolId] || {};
    return {
      kind: "probe-receipt",
      version: "1.0.0",
      toolId: record.toolId,
      toolName: tool.name || record.toolId,
      state: record.state,
      probeTimestamp: record.timestamp,
      summary: record.summary,
      inputContract: tool.inputContract || "Historical receipt contract unavailable.",
      outputContract: tool.outputContract || "Historical receipt contract unavailable.",
      evidence: {
        location: record.evidenceLocation,
        hashStatus: record.hashStatus,
        sha256: record.hashSha256
      },
      result: {
        classification: record.classification,
        exitCode: record.exitCode
      },
      review: {
        verified: false,
        reviewer: null
      },
      importStatus: null,
      historicalStatus: record.historicalStatus,
      sourceProvenance: record.sourceProvenance,
      source: "sanitized-parent-receipt"
    };
  }

  function collectProbeRecords(data, localProbes) {
    const registryMap = data.registry.entries.reduce(function (map, entry) {
      map[entry.id] = entry;
      return map;
    }, {});
    return data.receipts.receipts.map(function (record) {
      return receiptRecordToProbe(record, registryMap);
    }).concat(localProbes);
  }

  function renderOverview(data, root) {
    root.querySelector("[data-scope-panel]").textContent = data.chains.scope.panelLabel + " (" + data.chains.scope.panelCount + ")";
    root.querySelector("[data-scope-groups]").textContent = String(data.chains.scope.groupCount);
    root.querySelector("[data-scope-excluded]").textContent = data.chains.scope.excludedTaxa.join(", ");
    const caveats = root.querySelector("[data-scope-caveats]");
    caveats.textContent = "";
    data.chains.scope.caveats.forEach(function (caveat) {
      const item = document.createElement("li");
      item.textContent = caveat;
      caveats.appendChild(item);
    });
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
      incoming.textContent = "Depends on: " + (lineage[stage.id].incoming.length ? lineage[stage.id].incoming.map(function (stageId) { return titles[stageId] || stageId; }).join(", ") : "authorized scope input");
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
      [entry.name, entry.state, entry.stageIds.map(function (stageId) { return stageTitles[stageId] || stageId; }).join(", "), formatRegistryTimestamp(entry), entry.evidenceLocation].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderProbes(probes, registryMap, root) {
    const body = root.querySelector("tbody");
    body.textContent = "";
    probes.forEach(function (probe) {
      const row = document.createElement("tr");
      [
        (registryMap[probe.toolId] && registryMap[probe.toolId].name) || probe.toolName || probe.toolId,
        probe.state,
        probe.result.classification,
        probe.result.exitCode == null ? "not recorded" : probe.result.exitCode,
        formatTimestampLabel(probe.probeTimestamp, "Not recorded"),
        formatHashLabel(probe.evidence),
        probe.evidence.location,
        probe.review.verified ? "VERIFIED" : (probe.importStatus || probe.historicalStatus || "UNVERIFIED"),
        probe.summary
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
      [request.toolId, request.stageId, request.status, String(request.approved), String(request.executed), request.requestedAt, request.summary].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value || "");
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderGates(gates, data, root) {
    const body = root.querySelector("tbody");
    body.textContent = "";
    const titles = stageTitleMap(data.chains.stages);
    gates.forEach(function (gate) {
      const row = document.createElement("tr");
      const gateCell = document.createElement("td");
      gateCell.textContent = gate.title;
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.dataset.status = gate.status;
      badge.textContent = gate.status;
      statusCell.appendChild(badge);
      const dependsCell = document.createElement("td");
      dependsCell.textContent = (gate.dependsOn || []).map(function (stageId) { return titles[stageId] || stageId; }).join(", ");
      const reasonCell = document.createElement("td");
      reasonCell.textContent = gate.reason;
      row.append(gateCell, statusCell, dependsCell, reasonCell);
      body.appendChild(row);
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
        fetch("./data/receipts.json"),
        fetch("./data/gates.json")
      ]);
      const payloads = await Promise.all(responses.map(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load " + response.url);
        }
        return response.json();
      }));
      const loaded = {
        registry: payloads[0],
        chains: payloads[1],
        receipts: payloads[2],
        gates: payloads[3]
      };
      const verdict = validateWorkspaceData(loaded);
      return verdict.valid ? loaded : clone(FALLBACK_DATA);
    } catch (_error) {
      return clone(FALLBACK_DATA);
    }
  }

  async function init() {
    const data = await loadData();
    const verdict = validateWorkspaceData(data);
    if (!verdict.valid) {
      throw new Error(verdict.errors.join(" "));
    }
    const appRoot = document.querySelector("[data-app]");
    const message = document.querySelector("[data-message]");
    const overviewSection = document.querySelector("[data-overview]");
    const registrySection = document.querySelector("[data-registry]");
    const probesSection = document.querySelector("[data-probes]");
    const requestsSection = document.querySelector("[data-requests]");
    const gatesSection = document.querySelector("[data-gates]");
    const flowSection = document.querySelector("[data-flow]");
    const registrySearch = document.querySelector("#registry-search");
    const registryState = document.querySelector("#registry-state");
    const registryStage = document.querySelector("#registry-stage");
    const importInput = document.querySelector("#receipt-import");
    const probeForm = document.querySelector("#probe-form");
    const requestForm = document.querySelector("#request-form");
    const summaryTools = document.querySelector("[data-summary-tools]");
    const summaryProbes = document.querySelector("[data-summary-probes]");
    const summaryRequests = document.querySelector("[data-summary-requests]");
    const summaryGates = document.querySelector("[data-summary-gates]");

    const registryMap = data.registry.entries.reduce(function (map, entry) {
      map[entry.id] = entry;
      return map;
    }, {});
    let localProbes = safeStorageGet(STORAGE_KEYS.probes);
    let requests = safeStorageGet(STORAGE_KEYS.requests);

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
      const probes = collectProbeRecords(data, localProbes);
      const blockedGateCount = data.gates.gates.filter(function (gate) { return gate.status === "BLOCKED_UPSTREAM"; }).length;
      renderOverview(data, overviewSection);
      renderFlow(data, flowSection);
      renderRegistry(filtered, data, registrySection);
      renderProbes(probes, registryMap, probesSection);
      renderRequests(requests, requestsSection);
      renderGates(data.gates.gates, data, gatesSection);
      summaryTools.textContent = String(filtered.length);
      summaryProbes.textContent = String(probes.length);
      summaryRequests.textContent = String(requests.length);
      summaryGates.textContent = String(blockedGateCount);
      appRoot.dataset.ready = "true";
    }

    function exportProbeJson() {
      downloadText("genomeatlas-probes.json", JSON.stringify(collectProbeRecords(data, localProbes), null, 2), "application/json");
    }

    function exportProbeCsv() {
      const probes = collectProbeRecords(data, localProbes);
      const csv = recordsToCsv(probes, [
        { key: "toolId", label: "toolId" },
        { key: "state", label: "state" },
        { label: "classification", getter: function (probe) { return probe.result.classification; } },
        { label: "exitCode", getter: function (probe) { return probe.result.exitCode == null ? "not recorded" : probe.result.exitCode; } },
        { label: "probeTimestamp", getter: function (probe) { return formatTimestampLabel(probe.probeTimestamp, "Not recorded"); } },
        { label: "hashStatus", getter: function (probe) { return probe.evidence.hashStatus; } },
        { label: "sha256", getter: function (probe) { return probe.evidence.sha256; } },
        { label: "evidenceLocation", getter: function (probe) { return probe.evidence.location; } },
        { label: "verified", getter: function (probe) { return probe.review.verified; } },
        { key: "summary", label: "summary" }
      ]);
      downloadText("genomeatlas-probes.csv", csv, "text/csv");
    }

    function exportRequestJson() {
      downloadText("genomeatlas-requests.json", JSON.stringify(requests, null, 2), "application/json");
    }

    function exportRequestCsv() {
      const csv = recordsToCsv(requests, [
        { key: "toolId", label: "toolId" },
        { key: "stageId", label: "stageId" },
        { key: "status", label: "status" },
        { key: "approved", label: "approved" },
        { key: "executed", label: "executed" },
        { key: "requestedAt", label: "requestedAt" },
        { key: "summary", label: "summary" },
        { key: "justification", label: "justification" }
      ]);
      downloadText("genomeatlas-requests.csv", csv, "text/csv");
    }

    registrySearch.addEventListener("input", refresh);
    registryState.addEventListener("change", refresh);
    registryStage.addEventListener("change", refresh);

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
          const imported = importReceiptText(String(reader.result || ""), registryMap);
          localProbes = localProbes.concat(imported);
          safeStorageSet(STORAGE_KEYS.probes, localProbes);
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
        localProbes = localProbes.concat(receipt);
        safeStorageSet(STORAGE_KEYS.probes, localProbes);
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
        setMessage(message, "Created a local request packet only; no execution was started.", "success");
      } catch (error) {
        setMessage(message, error.message, "danger");
      }
    });

    refresh();
    setMessage(message, "Loaded scope metadata, sanitized receipts, local request packets, and release gates.", "neutral");
  }

  const exported = {
    TOOL_STATES: TOOL_STATES,
    RESULT_CLASSES: RESULT_CLASSES,
    HASH_STATUSES: HASH_STATUSES,
    GATE_STATES: GATE_STATES,
    FALLBACK_DATA: FALLBACK_DATA,
    validateReceipt: validateReceipt,
    normalizeImportedReceipt: normalizeImportedReceipt,
    importReceiptText: importReceiptText,
    validateHistoricalReceipt: validateHistoricalReceipt,
    validateWorkspaceData: validateWorkspaceData,
    escapeCsvCell: escapeCsvCell,
    recordsToCsv: recordsToCsv,
    filterRegistry: filterRegistry,
    createRequestArtifact: createRequestArtifact,
    createProbeReceipt: createProbeReceipt,
    buildStageLineage: buildStageLineage,
    collectProbeRecords: collectProbeRecords,
    formatRegistryTimestamp: formatRegistryTimestamp
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
