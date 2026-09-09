# GenomeAtlas probe status

Parent execution on WD, 2026-09-09. Original software MIT; this report makes no biological acceptance claim.

- Remote Desktop Commander returned a live pong from WD.
- Ubuntu shell runs in WSL1. No WSL2 validation or system conversion performed.
- GitHub CLI authenticated to timelabs-npo with admin role; genomeatlas is public and MIT-licensed.
- Fresh Windows -> Ubuntu /tmp -> Windows byte exchange passed; all payload hashes matched. See public_evidence/windows-wsl-roundtrip.json.
- Receipt validator: parent reran 26 tests on WD, all passed. The validator checks structure and status consistency, not artifact contents or scientific validity.
- smarts.bio: authenticated catalog/workspace discovery succeeded. Advertised bioinformatics.gcContent execution returns404, including with explicit workspace. No successful biological tool execution.
- NVIDIA BioNeMo Agent Toolkit is installed. Official genomics-workflow-acceleration guidance inspected. nvidia-smi and pbrun were not found on WD. No GPU/NIM/Parabricks run. Optional acceleration must remain off until readiness and comparisons are verified.
- Trae/Antigravity were not connected or executed in this run.

Scope: frozen177 LAB panel; no Enterococcus. Conserved-marker host topology is independent of R-M detection. Missing/failed is not absent; raw components U are not reviewed partial P; computational completeness is not demonstrated restriction activity.

Native Site creation, saved version, live deployment, visitor access, code publication, and scientific acceptance are separate receipts. Do not publish raw Codex JSONL logs: they may contain short-lived tool credentials.

Reference: https://github.com/NVIDIA-BioNeMo/bionemo-agent-toolkit/blob/main/library-skills/genomics-workflow-acceleration/SKILL.md