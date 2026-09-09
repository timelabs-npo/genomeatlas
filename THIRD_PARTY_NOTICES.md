# Third-party notices and source references

The original GenomeAtlas code is MIT licensed; the upstream [LICENSE](LICENSE)
and its copyright notice are preserved. No third-party code, skills, fonts,
JavaScript runtime packages or documentation have been vendored into this site.
Links do not relicense upstream material or grant service access.

## NVIDIA BioNeMo Agent Toolkit

- [Official repository](https://github.com/NVIDIA-BioNeMo/bionemo-agent-toolkit)
- [Genomics workflow acceleration v1.1.0 documentation](https://github.com/NVIDIA-BioNeMo/bionemo-agent-toolkit/blob/main/library-skills/genomics-workflow-acceleration/SKILL.md)
- [License statement](https://github.com/NVIDIA-BioNeMo/bionemo-agent-toolkit/blob/main/LICENSE)
- [Upstream notices](https://github.com/NVIDIA-BioNeMo/bionemo-agent-toolkit/blob/main/NOTICE)

NVIDIA licenses source code under Apache-2.0 and skills/documentation under
CC-BY-4.0. Attribution: NVIDIA BioNeMo contributors. The site's short original
policy summary follows its optional, default-off GPU approach and requirement
to compare CPU/GPU outputs before claiming parity. No upstream files are copied.
The parent reported actually reading this installed skill; no inference ran here.

## Google DeepMind AlphaGenome

- [Official API repository](https://github.com/google-deepmind/alphagenome)
- [Coordinate definitions](https://github.com/google-deepmind/alphagenome/blob/main/src/alphagenome/data/genome.py)
- [API configuration](https://github.com/google-deepmind/alphagenome/blob/main/src/alphagenome/models/dna_client.py)
- [Apache-2.0 license](https://github.com/google-deepmind/alphagenome/blob/main/LICENSE)
- [Service terms](https://deepmind.google.com/science/alphagenome/terms)

Attribution: Google DeepMind / AlphaGenome contributors. The independent local
coordinate checker draws on coordinate-convention concepts, not their source
implementation. Configurations should retain reference identity, versions and
parameters as a local reproducibility policy. No AlphaGenome model, API call or
model output is included. AlphaGenome is excluded from LAB host phylogeny.
Code licensing does not replace the separate terms for model/API use.

## OpenAI Sites

[Official Sites documentation](https://learn.chatgpt.com/docs/sites) was read
for project/version/deployment distinctions. No documentation or source was
copied. Native tool exposure was observed independently in this session; it
does not establish authentication or deployment. No native project, session,
version or deployment identifiers are invented.

## Supplied scientific and catalog data

`data/*.json` and `data/selected_accessions.txt` are the user-supplied frozen
inputs, preserved without refresh. Catalog entries do not imply bundled
software, tool verification or third-party license grants. NCBI, IQ-TREE,
DefenseFinder, Geneious, REBASE, iTOL and other named tools/data sources retain
their own terms. No sequence files, literature text or biological results
were downloaded or redistributed in this implementation task.

Official references were consulted during this task; mutable `main` links are
not pinned execution versions. No parity, genome-analysis or model-execution
receipt is claimed.

## Additional native-site implementation

The original MIT static implementation under docs/ is retained alongside the main entry point. AlphaGenome examples and documentation remain CC-BY-4.0; its code remains Apache-2.0. No vendor sources or model weights are included. Copilot-derived receipt-validation text sources are attributed at probes/PROVENANCE.md; their synthetic tests do not authenticate execution. The actual native deployment is recorded in audit/native-deployment.json; historical pre-publication statements remain dated observations, not a claim of present non-deployment.
