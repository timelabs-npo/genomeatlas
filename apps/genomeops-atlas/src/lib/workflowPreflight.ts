import { parseGenomeAccessions } from './workbench'
import { workflowPayload, workflowPrompt, type availableWorkflows } from './workflowDispatcher'
import provenance from '../data/genomeatlas/provenance.json'

export interface InspectedArtifact {
  id: string
  name: string
  bytes: number
  sha256: string
  format: 'FASTA' | 'JSON' | 'TSV' | 'text'
  records: number | null
  sequenceLengths: number[]
  accessions: string[]
  findings: string[]
  errors: string[]
  source: 'user-file' | 'published-pilot'
}

export async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Structural inspection only. Never treats recognizable bytes as accepted biology. */
export async function inspectArtifact(name: string, bytes: ArrayBuffer, source: InspectedArtifact['source'] = 'user-file'): Promise<InspectedArtifact> {
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error(`${name}: choose a text artifact smaller than 20 MB.`)
  if (!bytes.byteLength) throw new Error(`${name}: the file is empty.`)
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { throw new Error(`${name}: choose a UTF-8 FASTA, TSV, JSON or text file.`) }
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) throw new Error(`${name}: binary content is not supported.`)
  }
  const content = text.trim()
  if (!content) throw new Error(`${name}: the file contains only whitespace.`)
  // Preserve empty boundary cells in tables while accepting CRLF and CR line endings.
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n')
  const findings: string[] = []
  const errors: string[] = []
  const declaresFasta = /\.(?:fa|faa|fna|fasta)$/i.test(name)
  const declaresJson = /\.json$/i.test(name)
  if (declaresFasta && !content.startsWith('>')) errors.push('The filename declares FASTA, but no initial FASTA header was found.')
  let jsonRecords: number | null = null
  if (declaresJson) {
    try {
      const value: unknown = JSON.parse(content)
      jsonRecords = Array.isArray(value) ? value.length : null
      findings.push('JSON syntax parses. No workflow-result schema has been validated.')
    } catch { errors.push('JSON syntax does not parse.') }
  }
  let format: InspectedArtifact['format'] = 'text'
  let records: number | null = null
  const sequenceLengths: number[] = []
  if (content.startsWith('>')) {
    format = 'FASTA'
    const identifiers: string[] = []
    let sequence = ''
    let minimumLength = Infinity
    let maximumLength = 0
    const recordError = (message: string) => { if (!errors.includes(message)) errors.push(message) }
    const finish = () => {
      if (!sequence.length) recordError('A FASTA record has an empty sequence.')
      if (!/^[A-Za-z*?.-]*$/.test(sequence)) recordError('A FASTA sequence contains unsupported characters.')
      sequenceLengths.push(sequence.length)
      if (sequence.length < minimumLength) minimumLength = sequence.length
      if (sequence.length > maximumLength) maximumLength = sequence.length
    }
    for (const line of lines) {
      if (line.startsWith('>')) {
        if (identifiers.length) finish()
        identifiers.push(line.slice(1).trim().split(/\s+/)[0])
        sequence = ''
      } else sequence += line.replace(/\s/g, '')
    }
    finish()
    records = identifiers.length
    if (identifiers.some((id) => !id)) errors.push('Every FASTA record needs an identifier.')
    if (new Set(identifiers).size !== identifiers.length) errors.push('FASTA identifiers are duplicated.')
    findings.push(`${records} FASTA records; ${minimumLength}–${maximumLength} characters per record.`)
    findings.push(new Set(sequenceLengths).size === 1 ? 'Record lengths are equal; alignment homology has not been assessed.' : 'Record lengths differ; this is not a rectangular alignment.')
  } else if (declaresJson) {
    format = 'JSON'
    records = jsonRecords
  } else if (lines[0].includes('\t')) {
    format = 'TSV'
    const columns = lines[0].split('\t').length
    records = lines.length - 1
    if (lines.slice(1).some((line) => line.split('\t').length !== columns)) errors.push('Tab-separated rows have inconsistent column counts.')
    findings.push(`${columns} columns; ${records} rows after the first row. Column meanings have not been validated.`)
  } else findings.push('Readable UTF-8 text. Content and scientific interpretation need review.')
  const accessions = [...new Set(content.match(/\bGC[AF]_\d{9}\.\d+\b/g) ?? [])].sort()
  findings.push(accessions.length ? `${accessions.length} distinct assembly identifiers found in text; this does not establish file ownership.` : 'No versioned assembly identifiers found; accession-to-file mapping remains unverified.')
  const hash = await sha256(bytes)
  return { id: `${name}:${hash}`, name, bytes: bytes.byteLength, sha256: hash, format, records, sequenceLengths, accessions, findings, errors: [...new Set(errors)], source }
}

export async function inspectWorkflowInputs(workflow: typeof availableWorkflows[number], accessionText: string, context: string, artifacts: InspectedArtifact[], shared?: { sequenceText: string; topology: 'circular' | 'linear'; selectedToolIds: string[] }) {
  const accessions = parseGenomeAccessions(accessionText)
  const request = workflowPayload(workflow)
  request.genome_accessions = accessions
  const receipt = {
    schema: 'genomeatlas.local-input-inspection/1',
    inspectedAt: new Date().toISOString(),
    workflowId: workflow.id,
    sourceCommit: provenance.commit,
    genomeAccessions: accessions,
    selectionCheck: 'PASS',
    attachedFiles: artifacts,
    accessionComparisons: artifacts.map(file => ({
      fileId: file.id,
      fileName: file.name,
      observedAccessions: [...file.accessions],
      observedOutsideSelection: file.accessions.filter(accession => !accessions.includes(accession)),
      selectedNotMentioned: accessions.filter(accession => !file.accessions.includes(accession)),
      interpretation: 'NOT_PROOF_OF_OWNERSHIP',
    })),
    fileStructureCheck: artifacts.length === 0 ? 'NOT_TESTED' : artifacts.some((file) => file.errors.length) ? 'FAIL' : 'PASS',
    inputCompleteness: 'NOT_VERIFIED',
    execution: 'NOT_RUN',
    scientificAcceptance: 'NOT_ASSESSED',
    context,
    ...(shared ? {
      sharedSequence: {
        provided: Boolean(shared.sequenceText),
        rawTextCharacters: shared.sequenceText.length,
        rawTextSha256: shared.sequenceText ? await sha256(new TextEncoder().encode(shared.sequenceText).buffer) : null,
        topology: shared.topology,
      },
      selectedToolIds: [...new Set(shared.selectedToolIds)],
    } : {}),
    limitations: ['File hashes identify bytes, not authorship or biological truth.', 'Text structure checks do not prove required workflow inputs are complete.', 'No files are uploaded or transferred by the brief. Attach the files in your execution workspace.'],
  }
  const receiptHash = await sha256(new TextEncoder().encode(JSON.stringify(receipt)).buffer)
  const prompt = [
    workflowPrompt(workflow, request), '',
    'USER CONTEXT (unverified user-provided text):', context.trim() || 'No additional context supplied.', '',
    'LOCAL INPUT INSPECTION (not a scientific result):', JSON.stringify(receipt, null, 2),
    `INSPECTION SHA-256 (compact JSON receipt bytes): ${receiptHash}`,
    ...(shared ? ['', 'The shared DNA/FASTA text is not transferred in this brief; only its UTF-8 byte fingerprint is recorded. Supply the original sequence in your execution workspace. Selected tool identifiers are context, not a statement of availability or execution.'] : []),
  ].join('\n')
  return { request, receipt, receiptHash, prompt }
}
