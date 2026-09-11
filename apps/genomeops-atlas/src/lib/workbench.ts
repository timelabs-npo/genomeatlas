import registry from '../data/genomeatlas/registry.json'
import chains from '../data/genomeatlas/chains.json'
import template from '../data/genomeatlas/task-request.template.json'
import provenance from '../data/genomeatlas/provenance.json'
import requestSchema from '../data/genomeatlas/task-request.schema.json'
import frozenAccessions from '../data/genomeatlas/selected_accessions.txt?raw'
import { copyWorkflowPrompt, dispatcherDemoAccessions } from './workflowDispatcher'

export type ChainId = 'panel' | 'download' | 'markers' | 'tree' | 'rm' | 'evidence' | 'figure' | 'release'
export type DestinationId = 'chatgpt' | 'work' | 'codex'
export type RoleId = 'researcher' | 'reviewer' | 'librarian' | 'engineer'
export type ToneId = 'clear' | 'plain' | 'technical'
export type PersonaId = 'calm-guide' | 'curious-explorer' | 'methodical-librarian' | 'skeptical-peer'

export interface StarterTask {
  id: string
  title: string
  summary: string
  description: string
  category: string
  chainId: ChainId
  inputs: string[]
  outputs: string[]
  gates: string[]
  toolIds: string[]
  tags: string[]
}

export interface CatalogTool {
  id: string
  name: string
  label: string
  layer: string
  status: string
  scope: string
  probed: boolean
  historical: true
  relevant: boolean
  docsUrl?: string
}

export interface PromptOption<Id extends string = string> {
  id: Id
  label: string
  description: string
  instruction: string
}

export interface HandoffDestination {
  id: DestinationId
  label: string
  description: string
  url: string
  instruction: string
  launchLabel: string
  appliesSettings: false
}

const definitions: Array<Omit<StarterTask, 'inputs' | 'outputs' | 'gates'> & {
  extraInputs?: string[]
  extraOutputs?: string[]
  extraGates: string[]
}> = [
  {
    id: 'review-genome-panel', title: 'Choose the right genomes', chainId: 'panel', category: 'Prepare',
    summary: 'Check a small, exact assembly panel before analysis.',
    description: 'Audit the supplied versioned assembly selection against the frozen panel and acquisition metadata. Preserve exclusions and their reasons.',
    toolIds: ['NCBI_Datasets', 'life-sciences-databases'], tags: ['accessions', 'taxonomy', 'quality'],
    extraOutputs: ['Selection audit with inclusion and exclusion reasons'],
    extraGates: ['Use only the versioned assemblies in the request; do not silently replace versions.', 'Verify taxonomy from source metadata; exclude Enterococcus from this LAB panel.'],
  },
  {
    id: 'acquire-genome-data', title: 'Collect annotated genomes', chainId: 'download', category: 'Prepare',
    summary: 'Bring sequence files and their provenance together.',
    description: 'Acquire the exact requested public assembly packages and inventory the genome, protein, CDS and annotation files before downstream use.',
    toolIds: ['NCBI_Datasets'], tags: ['download', 'FASTA', 'GFF', 'GenBank'],
    extraOutputs: ['Accession-to-file inventory and input SHA-256 manifest'],
    extraGates: ['Verify exact requested versus downloaded accession sets and parse every required file.', 'Distinguish CDS files from complete genomic FASTA; never infer successful acquisition from a download URL alone.'],
  },
  {
    id: 'recover-conserved-markers', title: 'Recover conserved markers', chainId: 'markers', category: 'Phylogenomics',
    summary: 'Connect each marker sequence to its source protein.',
    description: 'Inspect conserved single-copy marker candidates, missingness and duplication. Keep exact source protein identities and ambiguous matches visible.',
    toolIds: ['GToTree', 'HMMER'], tags: ['orthology', 'proteins', 'HMM', 'markers'],
    extraOutputs: ['Marker-to-protein accession table with sequence hashes'],
    extraGates: ['Record marker-model versions and distinguish original HMM scores from identity recovered by exact sequence matching.', 'Do not use R-M proteins to infer the host tree; do not invent lost scores or protein identifiers.'],
  },
  {
    id: 'inspect-host-phylogeny', title: 'Build and check a host tree', chainId: 'tree', category: 'Phylogenomics',
    summary: 'Trace a tree back to its alignments and source genomes.',
    description: 'Run or audit a bounded conserved-marker host phylogeny, preserving alignments, partition coordinates, tool versions and the exact taxon set.',
    toolIds: ['GToTree', 'MAFFT', 'trimAl', 'IQ-TREE', 'Geneious'], tags: ['tree', 'alignment', 'partitions', 'support'],
    extraInputs: ['Reviewed marker provenance and exact input assembly list'],
    extraGates: ['Verify each partition against its individual alignment and document any inserted separator columns.', 'With three taxa, do not claim support for a nontrivial unrooted split; separate an environment pilot from publication evidence.'],
  },
  {
    id: 'screen-rm-candidates', title: 'Inspect R-M candidates', chainId: 'rm', category: 'Restriction systems',
    summary: 'Separate complete calls, components and unknown results.',
    description: 'Screen ordered proteomes for R-M candidates independently from the host tree and preserve replicon context, raw hits and model versions for review.',
    toolIds: ['DefenseFinder', 'HMMER', 'REBASE'], tags: ['R-M', 'defense', 'restriction', 'methylation'],
    extraOutputs: ['Separate complete-system calls, unreviewed component hits and failed/unrun records'],
    extraGates: ['A failed or unrun analysis is not biological absence.', 'Do not turn sequence predictions into verified recognition motifs, methylation, restriction function or transformation safety.'],
  },
  {
    id: 'audit-strain-evidence', title: 'Check exact-strain evidence', chainId: 'evidence', category: 'Evidence',
    summary: 'Follow a biological claim to the primary source.',
    description: 'Retrieve and audit primary evidence for the exact strain and R-M system. Separate sequence predictions, methylation measurements and restriction experiments.',
    toolIds: ['REBASE', 'life-sciences-literature', 'life-sciences-databases'], tags: ['literature', 'PubMed', 'strain', 'citations'],
    extraOutputs: ['Claim ledger with retrieved source identifiers, evidence type and unresolved gaps'],
    extraGates: ['Check every citation against a retrieved source; a title or search snippet is not a verified paper.', 'Evidence for a related species or strain must not be presented as evidence for the requested strain.'],
  },
  {
    id: 'prepare-evidence-figure', title: 'Prepare an evidence figure', chainId: 'figure', category: 'Communicate',
    summary: 'Show the accepted tree and R-M states without hiding gaps.',
    description: 'Prepare a draft figure from a reviewed tree, taxonomy and Type I–IV evidence matrix, retaining distinct missing, unreviewed and failed states.',
    toolIds: ['iTOL', 'Geneious', 'build-web-data-visualization'], tags: ['figure', 'SVG', 'PDF', 'matrix'],
    extraOutputs: ['Figure source, export and legend explaining every evidence state'],
    extraGates: ['Do not create an inferred tree shape when an accepted tree is missing.', 'Mark the figure as draft until all input and interpretation gates are satisfied.'],
  },
  {
    id: 'audit-release-receipt', title: 'Audit a release receipt', chainId: 'release', category: 'Evidence',
    summary: 'Check what actually ran and what still needs review.',
    description: 'Audit supplied commits, commands, exit codes, artifacts and deployment records. Report software execution separately from scientific acceptance.',
    toolIds: ['GitHub', 'Vercel', 'Codex_WD'], tags: ['receipt', 'hashes', 'CI', 'review'],
    extraInputs: ['Actual run URLs, commit SHAs and downloadable artifact manifests'],
    extraOutputs: ['Release audit with explicit PASS, PARTIAL, FAIL, BLOCKED and NOT_TESTED items'],
    extraGates: ['Hashes detect changed bytes; they do not establish authorship or biological truth.', 'Do not claim deployment from a link, publication from a passing build, or independent review from model agreement.'],
  },
]

/** Each starter is an entry point into an existing frozen chain, not a new pipeline. */
export const starterTasks: StarterTask[] = definitions.map(({ extraInputs = [], extraOutputs = [], extraGates, ...task }) => {
  const chain = chains.find((item) => item.id === task.chainId)
  if (!chain) throw new Error(`Unknown frozen chain: ${task.chainId}`)
  return { ...task, inputs: [chain.input, ...extraInputs], outputs: [chain.output, ...extraOutputs], gates: [chain.gate, ...extraGates] }
})

/** Include every frozen entry, including cache observations; never upgrade status. */
export const scientificToolIds: readonly string[] = ['NCBI_Datasets', 'GToTree', 'HMMER', 'MAFFT', 'trimAl', 'IQ-TREE', 'DefenseFinder', 'REBASE', 'Geneious', 'iTOL', 'life-sciences-databases', 'life-sciences-literature']
const toolDocumentation: Record<string, string> = {
  NCBI_Datasets: 'https://www.ncbi.nlm.nih.gov/datasets/docs/v2/',
  GToTree: 'https://github.com/AstrobioMike/GToTree',
  'IQ-TREE': 'https://iqtree.github.io/doc/',
  DefenseFinder: 'https://github.com/mdmparis/defense-finder',
}
const toolCapabilities: Record<string, string> = {
  NCBI_Datasets: 'Accession-scoped genome packages',
  GToTree: 'Conserved single-copy markers',
  'IQ-TREE': 'Model-based phylogenetic inference',
  DefenseFinder: 'Defense system candidates',
}
export const toolCatalog: CatalogTool[] = registry.entries.map((entry) => {
  const name = entry.layer === 'plugin-cache' ? entry.scope.split(';')[0] : entry.id.replaceAll('_', ' ')
  return { ...entry, name, label: toolCapabilities[entry.id] ?? entry.scope, historical: true, relevant: scientificToolIds.includes(entry.id), docsUrl: toolDocumentation[entry.id] }
})
export const toolLayers = [...new Set(toolCatalog.map((tool) => tool.layer))].sort()
export const toolStatuses = [...new Set(toolCatalog.map((tool) => tool.status))].sort()

export function searchTools(query = '', layer = 'all', status = 'all'): CatalogTool[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return toolCatalog.filter((tool) => {
    const text = `${tool.id} ${tool.name} ${tool.label} ${tool.layer} ${tool.status} ${tool.scope}`.toLocaleLowerCase()
    return (layer === 'all' || tool.layer === layer) && (status === 'all' || tool.status === status) && terms.every((term) => text.includes(term))
  })
}

export const roleOptions: PromptOption<RoleId>[] = [
  { id: 'researcher', label: 'Research scientist', description: 'Connect methods, observations and uncertainty.', instruction: 'Work as a research assistant: state the question, inspect the evidence and distinguish observations from inference. Do not claim professional credentials.' },
  { id: 'reviewer', label: 'Evidence reviewer', description: 'Test claims and look for missing evidence.', instruction: 'Review claims critically. Seek alternative explanations, exact source matches and unmet acceptance criteria.' },
  { id: 'librarian', label: 'Research librarian', description: 'Organize sources and track their provenance.', instruction: 'Prioritize retrieval, source identity, reproducible search records and an explicit claims-to-sources ledger.' },
  { id: 'engineer', label: 'Bioinformatics engineer', description: 'Make the requested analysis reproducible.', instruction: 'Inspect the existing repository first; preserve inputs, commands, versions, exit codes and artifacts. Make focused changes and run the repository checks.' },
]
export const toneOptions: PromptOption<ToneId>[] = [
  { id: 'clear', label: 'Clear and direct', description: 'Lead with the result and essential evidence.', instruction: 'Use concise, direct language, with the outcome first and concrete evidence next.' },
  { id: 'plain', label: 'Plain language', description: 'Explain unfamiliar terms as you go.', instruction: 'Explain for a biologist who is new to the software. Define technical terms without diluting uncertainty.' },
  { id: 'technical', label: 'Technical detail', description: 'Keep the parameters and verification visible.', instruction: 'Include parameters, identifiers, limitations and reproducibility details in a structured technical account.' },
]
export const personaOptions: PromptOption<PersonaId>[] = [
  { id: 'calm-guide', label: 'Calm guide', description: 'Patient, practical and steady.', instruction: 'Use a calm, patient manner and concrete next steps.' },
  { id: 'curious-explorer', label: 'Curious explorer', description: 'Ask what the evidence can and cannot tell us.', instruction: 'Be curious and explicit about open questions; explore alternatives without presenting speculation as evidence.' },
  { id: 'methodical-librarian', label: 'Methodical librarian', description: 'Keep sources and decisions easy to follow.', instruction: 'Organize information methodically and preserve the trail from each claim to its source.' },
  { id: 'skeptical-peer', label: 'Skeptical peer', description: 'Challenge conclusions respectfully.', instruction: 'Act as a respectful skeptical peer: challenge unsupported conclusions and explain what would change the assessment.' },
]

export const destinations: HandoffDestination[] = [
  { id: 'chatgpt', label: 'General ChatGPT', description: 'Discuss, clarify or review the task.', url: 'https://chatgpt.com/', instruction: 'Copy the brief, open ChatGPT, select Chat, then paste it and attach the required sources. Review before sending.', launchLabel: 'Open ChatGPT', appliesSettings: false },
  { id: 'work', label: 'ChatGPT Work', description: 'Carry a defined task through to a reviewable result.', url: 'https://chatgpt.com/', instruction: 'Copy the brief, open ChatGPT and switch to Work. Paste it, attach sources and review the task before starting. Work availability depends on your account.', launchLabel: 'Open ChatGPT for Work', appliesSettings: false },
  { id: 'codex', label: 'Codex cloud', description: 'Work in a connected repository environment.', url: 'https://chatgpt.com/codex', instruction: 'Copy the brief, open Codex cloud, select the connected repository environment and branch, then paste and review it before starting.', launchLabel: 'Open Codex cloud', appliesSettings: false },
]

export const handoffDocumentation = [
  { title: 'Use ChatGPT', url: 'https://learn.chatgpt.com/docs/use-chatgpt' },
  { title: 'Get started with ChatGPT Work', url: 'https://learn.chatgpt.com/docs/get-started-with-work' },
  { title: 'Codex cloud', url: 'https://learn.chatgpt.com/docs/cloud' },
]

export interface HandoffOptions {
  taskId: string
  destinationId?: DestinationId
  roleId?: RoleId
  toneId?: ToneId
  personaId?: PersonaId
  context?: string
  toolIds?: string[]
  accessions?: string[]
}
export const defaultHandoffOptions: Required<Omit<HandoffOptions, 'toolIds'>> = {
  taskId: starterTasks[0].id, destinationId: 'work', roleId: 'researcher', toneId: 'clear', personaId: 'calm-guide', context: '',
  accessions: [...dispatcherDemoAccessions],
}

const frozenAccessionSet = new Set(frozenAccessions.trim().split(/\s+/))

export function validateGenomeAccessions(accessions: readonly string[]): string[] {
  if (accessions.length < 1 || accessions.length > 3) throw new Error('Choose one to three versioned genome accessions.')
  if (new Set(accessions).size !== accessions.length) throw new Error('Genome accessions must be unique.')
  for (const accession of accessions) {
    if (!new RegExp(requestSchema.properties.genome_accessions.items.pattern).test(accession)) throw new Error(`Use an exact versioned RefSeq accession: ${accession}`)
    if (!frozenAccessionSet.has(accession)) throw new Error(`Accession is outside the frozen genome panel: ${accession}`)
  }
  return [...accessions]
}

/** Accept a pasted line/space/comma-separated list; validation remains strict. */
export function parseGenomeAccessions(text: string): string[] {
  return validateGenomeAccessions(text.trim().split(/[\s,]+/).filter(Boolean))
}

const requiredChoice = <T extends { id: string }>(choices: readonly T[], id: string, kind: string): T => {
  const choice = choices.find((item) => item.id === id)
  if (!choice) throw new Error(`Unknown ${kind}: ${id}`)
  return choice
}

export function composeHandoff(options: HandoffOptions, now = new Date(), requestId = `request-${crypto.randomUUID()}`) {
  const selected = { ...defaultHandoffOptions, ...options }
  if (!new RegExp(requestSchema.properties.request_id.pattern).test(requestId) || requestId.length > requestSchema.properties.request_id.maxLength) throw new Error('The request identifier does not match the frozen task schema.')
  const accessions = validateGenomeAccessions(selected.accessions)
  const task = requiredChoice(starterTasks, selected.taskId, 'task')
  const destination = requiredChoice(destinations, selected.destinationId, 'destination')
  const role = requiredChoice(roleOptions, selected.roleId, 'role')
  const tone = requiredChoice(toneOptions, selected.toneId, 'tone')
  const persona = requiredChoice(personaOptions, selected.personaId, 'persona')
  const selectedTools = [...new Set(options.toolIds ?? task.toolIds)].map((id) => requiredChoice(toolCatalog, id, 'tool'))
  const chain = requiredChoice(chains, task.chainId, 'chain')
  const acceptanceCriteria = [...template.acceptance_criteria]
  if (task.chainId === 'rm') acceptanceCriteria.push('raw-components-reviewed')
  if (task.chainId === 'evidence') acceptanceCriteria.push('exact-strain-evidence')
  if (task.chainId === 'release') acceptanceCriteria.push('real-deployment-receipt')
  const payload = {
    ...template, request_id: requestId, created_at_utc: now.toISOString(), chain_id: task.chainId,
    role: ['panel', 'evidence', 'release'].includes(task.chainId) ? 'VERIFY' : task.chainId === 'figure' ? 'DOC' : 'BUILD',
    genome_accessions: accessions, acceptance_criteria: acceptanceCriteria, config: { ...template.config },
  }
  const limitations = [
    'Opening a destination does not start a task, transfer files, select a model or apply a mode.',
    'Role, tone and character are instructions in the copied brief; they are not account settings or independent reviewers.',
    'Registry states are historical observations. Selected tools must be checked in the destination before use.',
  ]
  const prompt = [
    `TASK: ${task.title}`, task.description, '',
    `REQUESTED DESTINATION: ${destination.label}`,
    `WORKING ROLE: ${role.label}. ${role.instruction}`,
    `TONE: ${tone.label}. ${tone.instruction}`,
    `CHARACTER: ${persona.label}. ${persona.instruction}`,
    'These choices affect communication only. They do not grant access, establish expertise or add independent reviewers.', '',
    'USER CONTEXT (provided text, not verified scientific evidence):', selected.context.trim() || 'No additional context supplied.', '',
    'SCOPE AND EVIDENCE RULES:',
    '- Begin by locating the requested inputs. Files are not transferred by copying this brief; report unavailable inputs as BLOCKED.',
    '- Use only the exact versioned accessions below and at most three genomes. Do not expand the panel or replace accession versions.',
    '- The registry is a frozen historical snapshot, not a current runtime probe. Check selected tools before use; keep unavailable, failed and unrun states distinct.',
    '- Keep host phylogeny independent of R-M genes. Use conserved single-copy markers on CPU; no GPU.',
    '- Do not fabricate files, commands, citations, topology, hashes, signatures, model consensus or execution results.',
    '- Predictions and model agreement are not experimental validation. Failed or unrun screening is not biological absence.',
    '- Preserve exact commands, inputs/outputs, version and model identifiers, stdout/stderr, exit codes and SHA-256 hashes.',
    '- This is TASK_REQUEST_ONLY. Preparing or opening this brief is not proof of execution, scientific acceptance, release approval or publication.', '',
    `FROZEN SOURCE: ${provenance.repository}/tree/${provenance.commit}`,
    `CHAIN: ${chain.id} (${chain.status}, historical)`,
    'REQUIRED INPUTS:', ...task.inputs.map((item) => `- ${item}`),
    'REVIEWABLE OUTPUTS:', ...task.outputs.map((item) => `- ${item}`),
    'ACCEPTANCE GATES:', ...task.gates.map((item) => `- ${item}`), '',
    'SELECTED TOOL CATALOG ENTRIES (check availability; selection does not install or enable a tool):',
    ...(selectedTools.length ? selectedTools.map((tool) => `- ${tool.id} [${tool.layer}; ${tool.status}; historical]: ${tool.scope}`) : ['- No tools selected. Identify the prerequisites; do not invent successful execution.']), '',
    'EXACT TASK REQUEST (schemas/task-request.schema.json):', JSON.stringify(payload, null, 2), '',
    'RETURN FORMAT:',
    'Return a concise result, evidence ledger, exact command/exit-code receipt, artifact hashes, changed files if any, and the next blocker. Use PASS, PARTIAL, FAIL, BLOCKED and NOT_TESTED only for the checks actually performed. State scientific acceptance separately from software checks. Do not claim completion until the required artifacts exist and their checks pass.',
  ].join('\n')
  return { title: task.title, prompt, payload, destination, url: destination.url, instruction: destination.instruction, launchLabel: destination.launchLabel, limitations }
}

/** Only writes the explicit brief. Callers open a destination after confirmed copy. */
export const copyHandoff = copyWorkflowPrompt
