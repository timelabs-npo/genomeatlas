(function () {
  const TOOL_STATES = ["DECLARED", "DISCOVERED", "PROBED", "EXECUTED", "BLOCKED"];
  const RESULT_CLASSES = ["DETECTED", "NOT_DETECTED", "FAILED", "UNKNOWN"];
  const STORAGE_KEYS = {
    requests: "genomeatlas.requests.v1",
    probes: "genomeatlas.probes.v1"
  };
  const FALLBACK_DATA = {
  "registry": {
    "version": "1.0.0",
    "generatedAt": "2026-09-09T15:09:36.845478+00:00",
    "entries": [
      {
        "id": "rdc",
        "name": "Remote Desktop Commander",
        "category": "endpoint-access",
        "state": "PROBED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:34:03.065Z",
        "evidenceLocation": "evidence/rdc-pong.json",
        "inputContract": "Authorized endpoint command request with nonce payload.",
        "outputContract": "Completion record proving nonce execution on the authorized Windows endpoint.",
        "notes": "Authorized WD endpoint returned pong.",
        "layer": "connector-or-skill"
      },
      {
        "id": "github-connector",
        "name": "GitHub connector",
        "category": "repository-access",
        "state": "DECLARED",
        "stageIds": [
          "assemblies",
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#github-connector",
        "inputContract": "Read-only repository metadata request.",
        "outputContract": "Repository listing or file metadata for the current repository.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "connector-or-skill"
      },
      {
        "id": "github-cli",
        "name": "GitHub CLI",
        "category": "repository-access",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T15:09:36.817579+00:00",
        "evidenceLocation": "evidence/github-read.json",
        "inputContract": "Authenticated GitHub read command.",
        "outputContract": "Command success/failure plus repository-readable output.",
        "notes": "Authenticated repository-permission read through GitHub CLI.",
        "layer": "connector-or-skill"
      },
      {
        "id": "copilot",
        "name": "Copilot",
        "category": "implementation",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:56:18.140Z",
        "evidenceLocation": "evidence/copilot-parent-tests.json",
        "inputContract": "Issue or pull request implementation request.",
        "outputContract": "Repository changes and test artifacts on the active PR branch.",
        "notes": "Parent independently ran node --test on Copilot PR2 exact head: 8 passed. Two extra challenges failed before this repair.",
        "layer": "connector-or-skill"
      },
      {
        "id": "codex-cli-session",
        "name": "Codex CLI/session",
        "category": "implementation",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:44:57.101Z",
        "evidenceLocation": "evidence/codex-sites-probe.json",
        "inputContract": "Local Codex session bootstrap request.",
        "outputContract": "Established local coding session metadata.",
        "notes": "A real new WD Codex session ran native Sites read-only discovery and listing.",
        "layer": "connector-or-skill"
      },
      {
        "id": "wsl-ubuntu",
        "name": "WSL Ubuntu",
        "category": "runtime",
        "state": "EXECUTED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T15:09:35.685903+00:00",
        "evidenceLocation": "evidence/wsl-roundtrip.json",
        "inputContract": "Remote uname or shell command against Ubuntu in WSL.",
        "outputContract": "Kernel and distribution details.",
        "notes": "Actual Windows payload read in Ubuntu; Ubuntu /tmp response read back by Windows.",
        "layer": "connector-or-skill"
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
        "evidenceLocation": "data/registry.json#ncbi-datasets",
        "inputContract": "Selected versioned assembly accession panel with hash verification.",
        "outputContract": "Downloaded versioned assemblies and metadata manifests.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "external-tool"
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
        "evidenceLocation": "data/registry.json#gtotree",
        "inputContract": "Annotated proteomes or genome inputs plus marker set selection.",
        "outputContract": "Conserved marker family sets and alignment-ready bundles.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "external-tool"
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
        "evidenceLocation": "data/registry.json#hmmer",
        "inputContract": "Protein sequences and marker HMM profiles.",
        "outputContract": "Profile hits with thresholds and family assignments.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "external-tool"
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
        "evidenceLocation": "data/registry.json#alignment-trimming",
        "inputContract": "Per-family protein or nucleotide sequence sets.",
        "outputContract": "Separate alignments and trimmed outputs per family.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "external-tool"
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
        "evidenceLocation": "data/registry.json#iqtree",
        "inputContract": "Prepared alignment sets and model-selection parameters.",
        "outputContract": "Host tree inference artifacts and model summaries.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "external-tool"
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
        "evidenceLocation": "data/registry.json#defensefinder",
        "inputContract": "Genomic loci or proteomes for defense-system detection.",
        "outputContract": "Candidate defense and R-M locus calls.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "external-tool"
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
        "evidenceLocation": "data/registry.json#rebase",
        "inputContract": "Restriction-modification enzyme reference lookup.",
        "outputContract": "Reference annotations for R-M review.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "connector-or-skill"
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
        "evidenceLocation": "data/registry.json#pubmed-entrez",
        "inputContract": "Literature or accession queries.",
        "outputContract": "Linked records or citations for locus review.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "connector-or-skill"
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
        "evidenceLocation": "data/registry.json#geneious",
        "inputContract": "Local sequence review project inputs.",
        "outputContract": "Human review workspace artifacts.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "connector-or-skill"
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
        "evidenceLocation": "data/registry.json#itol",
        "inputContract": "Host tree plus verified ring annotation tables.",
        "outputContract": "Four-ring visualization assets.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "connector-or-skill"
      },
      {
        "id": "bionemo-nim",
        "name": "BioNeMo/NIM",
        "category": "ai-assistant",
        "state": "DISCOVERED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T15:09:36.838188+00:00",
        "evidenceLocation": "evidence/bionemo-skill-source.json",
        "inputContract": "Installed-skill listing or NIM skill resource lookup.",
        "outputContract": "Skill catalogue entries or skill-read result.",
        "notes": "NVIDIA BioNeMo official genomics-workflow-acceleration skill was read; runtime not executed.",
        "layer": "connector-or-skill"
      },
      {
        "id": "smarts-bio",
        "name": "smarts.bio",
        "category": "bioinformatics-service",
        "state": "BLOCKED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T15:09:36.834581+00:00",
        "evidenceLocation": "evidence/smarts-tool-404.json",
        "inputContract": "Catalogue browse or named tool execution request.",
        "outputContract": "Catalogue entries, tool execution receipt, or explicit no-execution reply.",
        "notes": "Authenticated workspace listing succeeded, but advertised GC tool returned 404.",
        "layer": "connector-or-skill"
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
        "evidenceLocation": "data/registry.json#genomic-intelligence",
        "inputContract": "External genomics-analysis task request.",
        "outputContract": "External result receipt requiring reviewer verification.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "connector-or-skill"
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
        "evidenceLocation": "data/registry.json#alphagenome",
        "inputContract": "Explicit coordinate system, input alphabet, and bounded retry policy for transient failures.",
        "outputContract": "Versioned engineering-reference outputs only.",
        "notes": "Catalogued route only; no successful runtime probe is claimed.",
        "layer": "connector-or-skill"
      },
      {
        "id": "native-chatgpt-sites",
        "name": "native ChatGPT Sites",
        "category": "deployment",
        "state": "BLOCKED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": "2026-09-09T14:52:52.802Z",
        "evidenceLocation": "evidence/native-sites-blocker.json",
        "inputContract": "Native Site deployment or receipt lookup.",
        "outputContract": "Deployment receipt.",
        "notes": "Native owner site exists at version 0; no deployment.",
        "layer": "connector-or-skill"
      },
      {
        "id": "biorender",
        "name": "BioRender",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#biorender",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "consensus",
        "name": "Consensus",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#consensus",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "elicit",
        "name": "Elicit",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#elicit",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "undermind",
        "name": "Undermind",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#undermind",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "hugging-face",
        "name": "Hugging Face",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#hugging-face",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "proto",
        "name": "Proto",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#proto",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "rowan",
        "name": "Rowan",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#rowan",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "tamarind-bio",
        "name": "Tamarind Bio",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#tamarind-bio",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "uniprot",
        "name": "UniProt",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#uniprot",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "rcsb-pdb",
        "name": "RCSB PDB",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#rcsb-pdb",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "alphafold-db",
        "name": "AlphaFold DB",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#alphafold-db",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "ncbi-entrez",
        "name": "NCBI Entrez",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#ncbi-entrez",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "academic-writing-toolkit",
        "name": "Academic Writing Toolkit",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#academic-writing-toolkit",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "adobe",
        "name": "Adobe",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#adobe",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "canva",
        "name": "Canva",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#canva",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "figma",
        "name": "Figma",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#figma",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "google-drive",
        "name": "Google Drive",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#google-drive",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "files",
        "name": "Files",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#files",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "trae",
        "name": "Trae",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#trae",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      },
      {
        "id": "antigravity",
        "name": "Antigravity",
        "category": "optional-catalog",
        "layer": "catalog-only",
        "state": "DECLARED",
        "stageIds": [
          "review"
        ],
        "probeTimestamp": null,
        "evidenceLocation": "data/registry.json#antigravity",
        "inputContract": "Explicitly selected public or owner-authorized project data only.",
        "outputContract": "Tool-specific result with real source and receipt; discover schema before execution.",
        "notes": "Catalogued optional route, not proof of installation, authentication or execution on this device."
      }
    ],
    "disclaimer": "Catalogued is not connected; connected is not executed; execution is not scientific validation."
  },
  "chains": {
    "version": "1.0.0",
    "title": "Scoped LAB phylogenomics flow",
    "rings": [
      "Type I",
      "Type II (including Type IIG)",
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
        "description": "Align homologues of each marker separately, trim unreliable positions, then concatenate in fixed order with recorded partitions. Preserve every source protein accession."
      },
      {
        "id": "host-tree",
        "title": "IQ-TREE host tree",
        "description": "Infer a maximum-likelihood host tree from the concatenated conserved-marker protein alignment with model, seed, support and rooting evidence. R-M genes do not define this topology."
      },
      {
        "id": "rm-detection",
        "title": "Independent R-M detection",
        "description": "Independently inspect ordered per-replicon proteins plus GFF/GenBank coordinates with locked DefenseFinder models. Failure/missing is not absence. Raw hits stay unreviewed."
      },
      {
        "id": "review",
        "title": "Locus review",
        "description": "Review loci manually with explicit evidence links and human approval gates."
      },
      {
        "id": "rings",
        "title": "Four rings",
        "description": "Join tree tips by exact assembly ID to four independent R-M type columns: I, II/IIG, III, IV. C is computational; U unreviewed; P requires manual curation. Experimental evidence is separate."
      }
    ]
  },
  "evidence": {
    "version": "1.0.1",
    "historical": true,
    "redacted": true,
    "observations": [
      {
        "id": "rdc-pong",
        "toolId": "rdc",
        "state": "PROBED",
        "timestamp": "2026-09-09T14:34:03.065Z",
        "evidenceLocation": "evidence/rdc-pong.json",
        "hashSha256": "sha256:31483bbef987e9a3fa96a398e00ac0f98d831848ba9ce8ea07ea47d36871bcce",
        "classification": "DETECTED",
        "exitCode": null,
        "summary": "Authorized WD endpoint returned pong."
      },
      {
        "id": "wsl-roundtrip",
        "toolId": "wsl-ubuntu",
        "state": "EXECUTED",
        "timestamp": "2026-09-09T15:09:35.685903+00:00",
        "evidenceLocation": "evidence/wsl-roundtrip.json",
        "hashSha256": "sha256:c34747bc6911ddeb217786b9608d015912906c5d9e9da65ddf46891c1ff5b9e5",
        "classification": "DETECTED",
        "exitCode": 0,
        "summary": "Actual Windows payload read in Ubuntu; Ubuntu /tmp response read back by Windows."
      },
      {
        "id": "github-read",
        "toolId": "github-cli",
        "state": "EXECUTED",
        "timestamp": "2026-09-09T15:09:36.817579+00:00",
        "evidenceLocation": "evidence/github-read.json",
        "hashSha256": "sha256:453854d7b50935df9575b161d91c051d2dd29a64036a26da431d3d18542f3928",
        "classification": "DETECTED",
        "exitCode": 0,
        "summary": "Authenticated repository-permission read through GitHub CLI."
      },
      {
        "id": "copilot-parent-tests",
        "toolId": "copilot",
        "state": "EXECUTED",
        "timestamp": "2026-09-09T14:56:18.140Z",
        "evidenceLocation": "evidence/copilot-parent-tests.json",
        "hashSha256": "sha256:93dc82e9a4bfb9a8de35db64fe28661ced7f56c563421403307db2bc5b9a1626",
        "classification": "DETECTED",
        "exitCode": 0,
        "summary": "Parent independently ran node --test on Copilot PR2 exact head: 8 passed. Two extra challenges failed before this repair."
      },
      {
        "id": "codex-sites-probe",
        "toolId": "codex-cli-session",
        "state": "EXECUTED",
        "timestamp": "2026-09-09T14:44:57.101Z",
        "evidenceLocation": "evidence/codex-sites-probe.json",
        "hashSha256": "sha256:021045c155e0ce8c4a03dc20b20c17df808c0e2408f441d5dfafeef3af1e2afb",
        "classification": "DETECTED",
        "exitCode": 0,
        "summary": "A real new WD Codex session ran native Sites read-only discovery and listing."
      },
      {
        "id": "native-sites-blocker",
        "toolId": "native-chatgpt-sites",
        "state": "BLOCKED",
        "timestamp": "2026-09-09T14:52:52.802Z",
        "evidenceLocation": "evidence/native-sites-blocker.json",
        "hashSha256": "sha256:ad16e4c2d1d8a06e53ae214c178e9b668656b1bd3bdbe8c223083fa4a4ecd318",
        "classification": "UNKNOWN",
        "exitCode": null,
        "summary": "Native owner site exists at version 0; no deployment."
      },
      {
        "id": "smarts-tool-404",
        "toolId": "smarts-bio",
        "state": "BLOCKED",
        "timestamp": "2026-09-09T15:09:36.834581+00:00",
        "evidenceLocation": "evidence/smarts-tool-404.json",
        "hashSha256": "sha256:3a409fc35b7921294fe0745040d3968f6981f91c17c35b063dc5610fa8de0789",
        "classification": "FAILED",
        "exitCode": null,
        "summary": "Authenticated workspace listing succeeded, but advertised GC tool returned 404."
      },
      {
        "id": "bionemo-skill-source",
        "toolId": "bionemo-nim",
        "state": "DISCOVERED",
        "timestamp": "2026-09-09T15:09:36.838188+00:00",
        "evidenceLocation": "evidence/bionemo-skill-source.json",
        "hashSha256": "sha256:895ca55b44656025592e07b44ffdb36e5000cc9aff3568c161936116077070fc",
        "classification": "UNKNOWN",
        "exitCode": null,
        "summary": "NVIDIA BioNeMo official genomics-workflow-acceleration skill was read; runtime not executed."
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
      if (!/^sha256:[a-fA-F0-9]{64}$/.test(String(receipt.evidence.sha256 || ""))) {
        errors.push("evidence.sha256 must be sha256: followed by exactly 64 hexadecimal characters; this checks format, not truth.");
      }
    }

    if (!isPlainObject(receipt.result)) {
      errors.push("result must be an object.");
    } else {
      if (!RESULT_CLASSES.includes(receipt.result.classification)) {
        errors.push("result.classification must be one of DETECTED, NOT_DETECTED, FAILED, UNKNOWN.");
      }
      if (!Object.hasOwn(receipt.result, "exitCode") || (receipt.result.exitCode !== null && !Number.isInteger(receipt.result.exitCode))) {
        errors.push("result.exitCode must be an integer or explicit null for non-process probes.");
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
    copy.importedAt = new Date().toISOString();
    return copy;
  }

  function importReceiptText(text) {
    if (typeof text !== "string" || text.length > 1000000) throw new Error("Receipt input too large or not text.");
    const parsed = JSON.parse(text);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    if (items.length > 200) throw new Error("Too many receipts.");
    const knownTools = new Set(FALLBACK_DATA.registry.entries.map(x => x.id));
    const normalized = [];
    items.forEach(function (item, index) {
      const verdict = validateReceipt(item);
      if (!verdict.valid) {
        throw new Error("Receipt " + (index + 1) + " failed validation: " + verdict.errors.join(" "));
      }
      if (!knownTools.has(item.toolId)) throw new Error("Unknown registry tool.");
      normalized.push(normalizeImportedReceipt(item));
    });
    return normalized;
  }

  function escapeCsvCell(value) {
    let text = value == null ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) {
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
        sha256: String(input.hashSha256 || "").trim()
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

  function observationToReceipt(observation, registryMap) {
    const tool = registryMap[observation.toolId] || {};
    return {
      kind: "probe-receipt",
      version: "1.0.0",
      toolId: observation.toolId,
      state: observation.state,
      probeTimestamp: observation.timestamp,
      summary: observation.summary,
      inputContract: tool.inputContract || "Historical observation input contract unavailable.",
      outputContract: tool.outputContract || "Historical observation output contract unavailable.",
      evidence: {
        location: observation.evidenceLocation,
        sha256: observation.hashSha256
      },
      result: {
        classification: observation.classification,
        exitCode: observation.exitCode
      },
      review: {
        verified: false,
        reviewer: null
      },
      source: "parent-observation"
    };
  }

  function stageTitleMap(stages) {
    return stages.reduce(function (map, stage) {
      map[stage.id] = stage.title;
      return map;
    }, {});
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

  function renderFlow(data, root) {
    const list = root.querySelector("[data-flow-list]");
    const rings = root.querySelector("[data-rings-list]");
    list.textContent = "";
    rings.textContent = "";
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
      item.append(step, title, description);
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
        entry.probeTimestamp || "Not yet probed",
        entry.evidenceLocation
      ].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderProbes(probes, root) {
    const body = root.querySelector("tbody");
    body.textContent = "";
    probes.forEach(function (probe) {
      const row = document.createElement("tr");
      [
        probe.toolId,
        probe.state,
        probe.result.classification,
        probe.result.exitCode,
        probe.evidence.location,
        probe.review.verified ? "VERIFIED" : (probe.importStatus || "UNVERIFIED"),
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
      [request.toolId, request.stageId, request.status, request.requestedAt, request.summary].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = String(value || "");
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function collectProbeRecords(data, localProbes) {
    const registryMap = data.registry.entries.reduce(function (map, entry) {
      map[entry.id] = entry;
      return map;
    }, {});
    return data.evidence.observations.map(function (observation) {
      return observationToReceipt(observation, registryMap);
    }).concat(localProbes);
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
    const summaryProbes = document.querySelector("[data-summary-probes]");
    const summaryRequests = document.querySelector("[data-summary-requests]");

    const registryMap = data.registry.entries.reduce(function (map, entry) {
      map[entry.id] = entry;
      return map;
    }, {});
    const storedProbes = safeStorageGet(STORAGE_KEYS.probes);
    let localProbes = (Array.isArray(storedProbes) ? storedProbes : []).filter(p => p && registryMap[p.toolId] && validateReceipt(p).valid).slice(0,200).map(normalizeImportedReceipt);
    const storedRequests = safeStorageGet(STORAGE_KEYS.requests);
    let requests = (Array.isArray(storedRequests) ? storedRequests : []).filter(r => r && registryMap[r.toolId]).slice(0,200).map(r => ({...r,status:"REQUESTED",verified:false,execution:null}));

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
      renderFlow(data, flowSection);
      renderRegistry(filtered, data, registrySection);
      renderProbes(probes, probesSection);
      renderRequests(requests, requestsSection);
      summaryTools.textContent = String(filtered.length);
      summaryProbes.textContent = String(probes.length);
      summaryRequests.textContent = String(requests.length);
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
        { label: "exitCode", getter: function (probe) { return probe.result.exitCode; } },
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
          const imported = importReceiptText(String(reader.result || ""));
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
        setMessage(message, "Created a local REQUESTED artifact only; no execution was started.", "success");
      } catch (error) {
        setMessage(message, error.message, "danger");
      }
    });

    refresh();
    setMessage(message, "Loaded historical observations plus local-only planning and export controls.", "neutral");
  }

  const exported = {
    TOOL_STATES: TOOL_STATES,
    RESULT_CLASSES: RESULT_CLASSES,
    FALLBACK_DATA: FALLBACK_DATA,
    validateReceipt: validateReceipt,
    normalizeImportedReceipt: normalizeImportedReceipt,
    importReceiptText: importReceiptText,
    escapeCsvCell: escapeCsvCell,
    recordsToCsv: recordsToCsv,
    filterRegistry: filterRegistry,
    createRequestArtifact: createRequestArtifact,
    createProbeReceipt: createProbeReceipt,
    observationToReceipt: observationToReceipt
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
