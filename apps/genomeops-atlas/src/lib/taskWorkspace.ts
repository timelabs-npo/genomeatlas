import { parseGenomeAccessions, type StarterTask } from './workbench'
import { type InspectedArtifact } from './workflowPreflight'

export interface WorkspaceRecipe {
  action: string
  purpose: string
  accepted: string
  steps: string[]
  requirements: Array<{ label: string; match: RegExp }>
  template: string
  headers: string[]
}

export const workspaceRecipes: Record<string, WorkspaceRecipe> = {
  panel: {
    action: 'Review accession selection', purpose: 'Check your exact selection before fetching or comparing genomes.', accepted: '.tsv,.json,.txt',
    steps: ['Choose one to three exact assemblies in Your inputs.', 'Inspect selection notes or metadata if you have them.', 'Export a review sheet with every decision still visible.'],
    requirements: [], template: 'selection-review.tsv', headers: ['assembly_accession', 'inclusion_decision', 'reason', 'taxonomy_source', 'review_state'],
  },
  download: {
    action: 'Prepare acquisition manifest', purpose: 'Create a file-by-file acquisition plan for the assemblies you actually selected.', accepted: '.tsv,.json,.txt,.fna,.faa,.fasta,.gff,.gff3,.gbff',
    steps: ['Validate the accession list.', 'Add existing packages or manifests to inspect their bytes.', 'Use the exported acquisition sheet to track files and source hashes.'],
    requirements: [{ label: 'Genome sequence file', match: /\.fna$|genom.*\.fa(sta)?$/i }, { label: 'Protein sequence file', match: /\.faa$|protein.*\.fa(sta)?$/i }, { label: 'GFF annotation', match: /\.gff3?$/i }, { label: 'GenBank annotation', match: /\.gbff$|\.gbk$/i }],
    template: 'acquisition-manifest.tsv', headers: ['assembly_accession', 'genome_fasta', 'protein_fasta', 'cds_fasta', 'gff', 'gbff', 'source_url', 'sha256_manifest', 'review_state'],
  },
  markers: {
    action: 'Inspect marker inputs', purpose: 'Keep each marker connected to the exact protein and assembly it came from.', accepted: '.fa,.faa,.fasta,.tsv,.json,.txt',
    steps: ['Supply the annotated proteomes and any marker inventory.', 'Inspect FASTA records and table structure locally.', 'Prepare an accession-to-marker provenance ledger for the execution task.'],
    requirements: [{ label: 'Protein FASTA', match: /\.faa$|protein|proteome/i }, { label: 'Marker provenance table', match: /marker.*\.(tsv|json)$|provenance/i }],
    template: 'marker-provenance.tsv', headers: ['assembly_accession', 'marker_id', 'protein_accession', 'sequence_sha256', 'model_version', 'review_state'],
  },
  tree: {
    action: 'Inspect tree inputs', purpose: 'Check the source bundle a host tree needs, with topology and support left to scientific review.', accepted: '.fa,.faa,.fasta,.aln,.nwk,.treefile,.tsv,.json,.txt',
    steps: ['Add the conserved-marker alignment and partition metadata.', 'Inspect record lengths, source identifiers and exact bytes.', 'Carry the source inventory into a tree-building or independent review task.'],
    requirements: [{ label: 'Conserved-marker alignment', match: /align|concat|\.aln$/i }, { label: 'Partition coordinates', match: /partition/i }, { label: 'Tree file, if already computed', match: /\.nwk$|\.treefile$|newick/i }],
    template: 'tree-source-ledger.tsv', headers: ['assembly_accession', 'alignment_file', 'partition_file', 'marker_provenance', 'tree_file', 'support_method', 'review_state'],
  },
  rm: {
    action: 'Inspect R-M evidence inputs', purpose: 'Separate raw hits, curated system calls and evidence that has not yet been reviewed.', accepted: '.fa,.faa,.fasta,.gff,.gff3,.gbff,.tsv,.json,.txt',
    steps: ['Add ordered proteins, coordinates and any raw system calls.', 'Inspect their structure and retain a hash for each artifact.', 'Start a matrix that never converts missing or failed results into absence.'],
    requirements: [{ label: 'Ordered proteins', match: /\.faa$|protein|proteome/i }, { label: 'Gene coordinates', match: /\.gff3?$|\.gbff$/i }, { label: 'Raw defense-system hits', match: /defense|raw.*hit|system.*\.(tsv|json)$/i }],
    template: 'rm-evidence-matrix.tsv', headers: ['assembly_accession', 'replicon', 'system_type', 'system_id', 'raw_hit_file', 'model_version', 'complete_or_component', 'review_state'],
  },
  evidence: {
    action: 'Inspect source ledger', purpose: 'Build a claims-to-sources trail for the exact strain rather than relying on a citation-shaped answer.', accepted: '.tsv,.csv,.json,.txt',
    steps: ['State the exact strain, system and claim in Your inputs.', 'Add your source ledger or retrieved source notes.', 'Prepare separate fields for methylation, restriction and sequence-only evidence.'],
    requirements: [{ label: 'Claims and sources ledger', match: /claim|source|evidence|citation|literature/i }],
    template: 'claim-ledger.tsv', headers: ['assembly_accession', 'exact_strain', 'claim', 'system', 'source_identifier', 'source_url', 'evidence_kind', 'review_state'],
  },
  figure: {
    action: 'Inspect figure sources', purpose: 'Assemble the accepted inputs for a scientific figure without inventing missing biology.', accepted: '.nwk,.treefile,.tsv,.csv,.json,.txt',
    steps: ['Supply a reviewed tree and the taxonomy/R-M matrix.', 'Record the source files before choosing the visual encoding.', 'Keep missing, failed and unreviewed states distinct in the figure legend.'],
    requirements: [{ label: 'Reviewed source tree', match: /\.nwk$|\.treefile$|newick/i }, { label: 'Taxonomy and R-M matrix', match: /matrix|taxonomy|annotation/i }, { label: 'Figure legend or encoding notes', match: /legend|encoding/i }],
    template: 'figure-source-trail.tsv', headers: ['assembly_accession', 'tree_source', 'taxonomy_source', 'rm_matrix_source', 'legend_source', 'source_sha256', 'review_state'],
  },
  release: {
    action: 'Inspect release artifacts', purpose: 'Review the files behind a release claim and keep execution distinct from scientific acceptance.', accepted: '.tsv,.json,.txt,.log',
    steps: ['Add command logs, build/test receipts and hash manifests.', 'Inspect the actual supplied bytes.', 'Export an audit request; missing execution and deployment evidence stays unverified.'],
    requirements: [{ label: 'Command or test logs', match: /\.log$|test|build/i }, { label: 'Checksum manifest', match: /manifest|sha256|checksum/i }, { label: 'Execution or deployment receipt', match: /receipt|deployment|release/i }],
    template: 'release-review.tsv', headers: ['assembly_accession', 'source_commit', 'command_log', 'exit_code_receipt', 'artifact_manifest', 'deployment_receipt', 'review_state'],
  },
}

export function buildTaskTemplate(task: StarterTask, accessionText: string) {
  const accessions = parseGenomeAccessions(accessionText)
  const recipe = workspaceRecipes[task.chainId]
  const rows = accessions.map(accession => recipe.headers.map((_, index) => index === 0 ? accession : index === recipe.headers.length - 1 ? 'NOT_REVIEWED' : '').join('\t'))
  return { filename: recipe.template, text: [recipe.headers.join('\t'), ...rows].join('\n') + '\n' }
}

export function taskInputReport(task: StarterTask, accessionText: string, artifacts: InspectedArtifact[]) {
  const accessions = parseGenomeAccessions(accessionText)
  const recipe = workspaceRecipes[task.chainId]
  return {
    schema: 'genomeatlas.task-preparation/1', taskId: task.id, chainId: task.chainId, createdAt: new Date().toISOString(),
    genomeAccessions: accessions,
    selection: { state: 'PASS', detail: 'One to three unique, versioned accessions matched the frozen panel.' },
    artifacts,
    prerequisites: recipe.requirements.map(requirement => {
      const candidates = artifacts.filter(file => requirement.match.test(file.name))
      return { requirement: requirement.label, state: candidates.length ? 'CANDIDATE_SUPPLIED' : 'NOT_SUPPLIED', candidateFiles: candidates.map(file => file.name) }
    }),
    fileStructure: artifacts.length ? artifacts.some(file => file.errors.length) ? 'FAIL' : 'PASS' : 'NOT_TESTED',
    inputCompleteness: 'NOT_VERIFIED', execution: 'NOT_RUN', scientificAcceptance: 'NOT_ASSESSED',
    limitations: ['Filename matches identify candidates, not verified workflow inputs.', 'Structural parsing and hashes do not establish biological correctness.', 'Files stay in this browser and must be attached separately in the execution workspace.'],
  }
}
