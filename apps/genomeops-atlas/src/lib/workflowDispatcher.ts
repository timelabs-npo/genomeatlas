import registry from '../data/genomeatlas/registry.json'
import chains from '../data/genomeatlas/chains.json'
import template from '../data/genomeatlas/task-request.template.json'
import provenance from '../data/genomeatlas/provenance.json'

type WorkflowId = 'phylogenomic-tree' | 'rm-detection' | 'literature-anchor-audit'
type ChainId = 'tree' | 'rm' | 'evidence'

interface AvailableWorkflow {
  id: WorkflowId
  title: string
  subtitle: string
  description: string
  chainId: ChainId
  prerequisiteIds: string[]
  registryIds: string[]
  role: 'BUILD' | 'VERIFY'
}

export const availableWorkflows: readonly AvailableWorkflow[] = [
  {
    id: 'phylogenomic-tree',
    title: 'Phylogenomic Tree',
    subtitle: 'Conserved markers → supported host tree',
    description: 'Build a host phylogeny from conserved single-copy protein markers. R-M genes are excluded from topology construction and mapped only after independent review.',
    chainId: 'tree',
    prerequisiteIds: ['panel', 'download', 'markers'],
    registryIds: ['NCBI_Datasets', 'GToTree', 'HMMER', 'MAFFT', 'trimAl', 'IQ-TREE'],
    role: 'BUILD',
  },
  {
    id: 'rm-detection',
    title: 'R-M Detection',
    subtitle: 'Ordered proteins → R-M system candidates',
    description: 'Detect restriction-modification candidates independently from the host tree. Preserve failed, unknown and unreviewed states; raw hits require review before they become biological claims.',
    chainId: 'rm',
    prerequisiteIds: ['panel', 'download'],
    registryIds: ['DefenseFinder', 'REBASE'],
    role: 'BUILD',
  },
  {
    id: 'literature-anchor-audit',
    title: 'Literature Anchor Audit',
    subtitle: 'Exact strain and system → source-linked evidence',
    description: 'Audit exact-strain R-M evidence using system names, accessions, REBASE records and primary papers. Keep predictions, methylation evidence and restriction validation separate.',
    chainId: 'evidence',
    prerequisiteIds: ['panel', 'rm'],
    registryIds: ['REBASE', 'life-sciences-literature'],
    role: 'VERIFY',
  },
]

// This bounded example uses accessions shared by the frozen parent panel and the
// scientific demo. It does not imply that prerequisite data has been acquired.
export const dispatcherDemoAccessions = ['GCF_000468955.1', 'GCF_903886475.1', 'GCF_002970915.1']

export function workflowContracts(workflow: AvailableWorkflow) {
  const steps = [...workflow.prerequisiteIds, workflow.chainId].map((id) => {
    const chain = chains.find((entry) => entry.id === id)
    if (!chain) throw new Error(`Missing frozen chain: ${id}`)
    return chain
  })
  const tools = workflow.registryIds.map((id) => {
    const entry = registry.entries.find((item) => item.id === id)
    if (!entry) throw new Error(`Missing frozen registry entry: ${id}`)
    return entry
  })
  return { steps, tools, chain: steps[steps.length - 1] }
}

export function workflowPayload(
  workflow: AvailableWorkflow,
  now = new Date(),
  requestId = `request-${crypto.randomUUID()}`,
) {
  const criteria = [...template.acceptance_criteria]
  if (workflow.chainId === 'rm') criteria.push('raw-components-reviewed')
  if (workflow.chainId === 'evidence') criteria.push('exact-strain-evidence')

  return {
    ...template,
    request_id: requestId,
    created_at_utc: now.toISOString(),
    chain_id: workflow.chainId,
    role: workflow.role,
    genome_accessions: [...dispatcherDemoAccessions],
    acceptance_criteria: criteria,
    config: { ...template.config },
  }
}

export function workflowPrompt(workflow: AvailableWorkflow, request: ReturnType<typeof workflowPayload>) {
  const { steps, tools } = workflowContracts(workflow)
  return [
    `TASK: ${workflow.title}`,
    `DESCRIPTION: ${workflow.description}`,
    '',
    'ROLE: Evidence-gated bioinformatics executor.',
    'SCOPE: Bounded demo; use only the exact versioned accessions in the request below. Never expand beyond three genomes.',
    'This is TASK_REQUEST_ONLY. Copying this prompt does not execute, approve, accept or publish anything.',
    'The registry snapshot records historical status only. Check prerequisites and tool availability before execution; report unavailable steps as BLOCKED or NOT_TESTED.',
    'No input sequence packages or completed scientific results are attached by this UI.',
    '',
    'CONSTRAINTS:',
    '- Do not invent data, identifiers, topology, sources, hashes or execution results.',
    '- Do not use R-M proteins to infer the host phylogeny. Use conserved single-copy markers on CPU; no GPU.',
    '- Do not convert missing, failed or unrun analyses into biological absence.',
    '- Keep predictions separate from experimental validation; model agreement is not validation.',
    '- Preserve exact accessions, commands, software/model versions, stdout/stderr, exit codes and SHA-256 hashes.',
    '- Require independent review, exact input equality and versions/hashes before accepting results.',
    '',
    `FROZEN SOURCE: ${provenance.repository}/tree/${provenance.commit}`,
    'CHAIN CONTRACTS (prerequisites first; verify existing outputs before running the requested chain):',
    ...steps.flatMap((step) => [
      `- data/chains.json#${step.id}: ${step.title} [${step.status}]`,
      `  Required input: ${step.input}`,
      `  Expected output: ${step.output}`,
      `  Acceptance gate: ${step.gate}`,
    ]),
    '',
    'FROZEN REGISTRY ENTRIES (not a current runtime probe):',
    ...tools.map((tool) => `- data/registry.json#${tool.id}: ${tool.status}; ${tool.scope}`),
    '',
    'EXACT TASK REQUEST (schemas/task-request.schema.json):',
    JSON.stringify(request, null, 2),
    '',
    'RETURN FORMAT:',
    'Return a receipt with PASS, PARTIAL, FAIL or BLOCKED; list input/output hashes, exact commands, exit codes, unmet acceptance criteria and NOT_TESTED items. Report scientific acceptance separately from software checks.',
  ].join('\n')
}

export async function copyWorkflowPrompt(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  const previousFocus = document.activeElement
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    if (typeof document.execCommand !== 'function' || !document.execCommand('copy')) {
      throw new Error('Clipboard copy was unavailable.')
    }
  } finally {
    textarea.remove()
    if (previousFocus instanceof HTMLElement) previousFocus.focus()
  }
}
