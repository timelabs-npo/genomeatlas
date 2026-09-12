# GenomeAtlas RFCs

This directory is the change record for the unified GenomeAtlas Workbench. RFCs describe interfaces and evidence rules that should remain stable while the UI and implementation evolve.

| RFC | Status | Subject |
| --- | --- | --- |
| [0001](0001-workbench-architecture.md) | Accepted | Workbench architecture and extension points |
| [0002](0002-scientific-evidence-contract.md) | Accepted | Scientific evidence, provenance and acceptance gates |
| [0003](0003-repository-consolidation.md) | Accepted | GenomeOps history retention and repository consolidation |

An RFC is normative when it describes an input, output, evidence state, or retention guarantee. UI copy and visual layout remain implementation details unless the RFC says otherwise. Amend an RFC in the same commit as the code that changes its contract, and run the full root check before publishing.
