import { describe, expect, it } from 'vitest'
import { inspectArtifact, inspectWorkflowInputs, sha256 } from './workflowPreflight'
import { availableWorkflows, dispatcherDemoAccessions } from './workflowDispatcher'
const bytes = (text: string) => new TextEncoder().encode(text).buffer

describe('local workflow input inspection', () => {
  it('hashes original bytes before recognizing CRLF FASTA records and assembly identifiers', async () => {
    const content = '>GCF_000468955.1\r\nM--AT\r\n>GCF_903886475.1\r\nMA?AT\r\n'
    const report = await inspectArtifact('alignment.faa', bytes(content))
    expect(report.sha256).toBe(await sha256(bytes(content)))
    expect(report.sha256).not.toBe(await sha256(bytes(content.replaceAll('\r', ''))))
    expect(report.format).toBe('FASTA')
    expect(report.records).toBe(2)
    expect(report.sequenceLengths).toEqual([5, 5])
    expect(report.accessions).toEqual(dispatcherDemoAccessions.slice(0, 2).sort())
    expect(report.errors).toEqual([])
    expect(report.findings.join(' ')).toContain('does not establish file ownership')
  })
  it('reports duplicated IDs, empty records and illegal sequence characters', async () => {
    const report = await inspectArtifact('bad.faa', bytes('>same\n\n>same\nATG7'))
    expect(report.errors).toEqual(expect.arrayContaining(['A FASTA record has an empty sequence.', 'FASTA identifiers are duplicated.', 'A FASTA sequence contains unsupported characters.']))
  })
  it('finds inconsistent tabular rows without approving column semantics', async () => {
    const report = await inspectArtifact('calls.tsv', bytes('accession\tstate\na\tunknown\nb'))
    expect(report.records).toBe(2)
    expect(report.errors).toContain('Tab-separated rows have inconsistent column counts.')
    expect(report.findings.join(' ')).toContain('Column meanings have not been validated')
  })
  it('preserves empty first and last table cells instead of stripping their tabs', async () => {
    const report = await inspectArtifact('missing-states.tsv', bytes('\taccession\tstate\r\n\tGCF_000468955.1\t\r\n'))
    expect(report.format).toBe('TSV')
    expect(report.records).toBe(1)
    expect(report.errors).toEqual([])
    expect(report.findings.join(' ')).toContain('3 columns')
  })
  it('inspects large record sets without spreading them into function arguments', async () => {
    const text = Array.from({ length: 150000 }, (_, index) => `>record-${index}\n${index === 0 ? 'AC' : 'A'}\n`).join('')
    const report = await inspectArtifact('many-records.fasta', bytes(text))
    expect(report.records).toBe(150000)
    expect(report.errors).toEqual([])
    expect(report.findings).toContain('150000 FASTA records; 1–2 characters per record.')
  })
  it('rejects binary, empty and oversized artifacts; reports invalid JSON', async () => {
    await expect(inspectArtifact('binary.txt', bytes('x\u0000'))).rejects.toThrow('binary')
    await expect(inspectArtifact('empty.txt', bytes('  \n'))).rejects.toThrow('whitespace')
    await expect(inspectArtifact('large.txt', new ArrayBuffer(20 * 1024 * 1024 + 1))).rejects.toThrow('smaller than 20 MB')
    expect((await inspectArtifact('bad.json', bytes('{'))).errors).toContain('JSON syntax does not parse.')
  })
  it('fails declared FASTA files without headers while leaving other alignment formats unspecified', async () => {
    for (const name of ['plain.fa', 'plain.faa', 'plain.fna', 'plain.fasta']) {
      const file = await inspectArtifact(name, bytes('ACTG\nACTG'))
      expect(file.format).toBe('text')
      expect(file.errors).toContain('The filename declares FASTA, but no initial FASTA header was found.')
      const result = await inspectWorkflowInputs(availableWorkflows[0], dispatcherDemoAccessions[0], '', [file])
      expect(result.receipt.fileStructureCheck).toBe('FAIL')
    }
    const unspecified = await inspectArtifact('alignment.aln', bytes('CLUSTAL W multiple sequence alignment\n'))
    expect(unspecified.errors).not.toContain('The filename declares FASTA, but no initial FASTA header was found.')
  })
  it('still checks declared JSON syntax when bytes instead resemble FASTA', async () => {
    const file = await inspectArtifact('wrong.json', bytes('>sequence\nACTG\n'))
    expect(file.format).toBe('FASTA')
    expect(file.records).toBe(1)
    expect(file.errors).toContain('JSON syntax does not parse.')
    const result = await inspectWorkflowInputs(availableWorkflows[0], dispatcherDemoAccessions[0], '', [file])
    expect(result.receipt.fileStructureCheck).toBe('FAIL')
  })
  it('carries the chosen exact inputs and preserves missing/unrun states', async () => {
    const result = await inspectWorkflowInputs(availableWorkflows[1], dispatcherDemoAccessions[1], 'Check these sources.', [])
    expect(result.request.genome_accessions).toEqual([dispatcherDemoAccessions[1]])
    expect(result.receipt).toMatchObject({ selectionCheck: 'PASS', fileStructureCheck: 'NOT_TESTED', inputCompleteness: 'NOT_VERIFIED', execution: 'NOT_RUN', scientificAcceptance: 'NOT_ASSESSED' })
    expect(result.prompt).toContain('Check these sources.')
    expect(result.prompt).toContain(JSON.stringify(result.request, null, 2))
    expect(result.receiptHash).toBe(await sha256(bytes(JSON.stringify(result.receipt))))
  })
  it('keeps failed structure checks visible in the export', async () => {
    const file = await inspectArtifact('bad.json', bytes('{'))
    const result = await inspectWorkflowInputs(availableWorkflows[2], dispatcherDemoAccessions.join('\n'), '', [file])
    expect(result.receipt.fileStructureCheck).toBe('FAIL')
    expect(result.prompt).toContain(file.sha256)
    expect(result.receipt.scientificAcceptance).toBe('NOT_ASSESSED')
  })
  it('flags IDs outside the selected scope without pretending to establish file ownership', async () => {
    const file = await inspectArtifact('two-genomes.faa', bytes(`>${dispatcherDemoAccessions[0]}\nACTG\n>${dispatcherDemoAccessions[1]}\nACTG\n`))
    const result = await inspectWorkflowInputs(availableWorkflows[0], dispatcherDemoAccessions[0], '', [file])
    expect(result.receipt.accessionComparisons).toEqual([{
      fileId: file.id, fileName: 'two-genomes.faa', observedAccessions: file.accessions,
      observedOutsideSelection: [dispatcherDemoAccessions[1]], selectedNotMentioned: [], interpretation: 'NOT_PROOF_OF_OWNERSHIP',
    }])
    const missing = await inspectWorkflowInputs(availableWorkflows[0], dispatcherDemoAccessions.join('\n'), '', [file])
    expect(missing.receipt.accessionComparisons[0].selectedNotMentioned).toEqual([dispatcherDemoAccessions[2]])
    expect(missing.receipt.inputCompleteness).toBe('NOT_VERIFIED')
  })
  it('fingerprints raw shared sequence and deduplicates tools without exporting the sequence itself', async () => {
    const shared = { sequenceText: 'AGCT', topology: 'linear' as const, selectedToolIds: ['NCBI_Datasets', 'HMMER', 'NCBI_Datasets'] }
    const result = await inspectWorkflowInputs(availableWorkflows[0], dispatcherDemoAccessions[0], '', [], shared)
    expect(result.receipt.sharedSequence).toEqual({ provided: true, rawTextCharacters: 4, rawTextSha256: await sha256(bytes('AGCT')), topology: 'linear' })
    expect(result.receipt.selectedToolIds).toEqual(['NCBI_Datasets', 'HMMER'])
    expect(result.prompt).not.toContain('AGCT')
    expect(result.prompt).toContain('not transferred in this brief')
    expect(result.prompt).toContain('not a statement of availability or execution')
    const empty = await inspectWorkflowInputs(availableWorkflows[0], dispatcherDemoAccessions[0], '', [], { ...shared, sequenceText: '' })
    expect(empty.receipt.sharedSequence).toMatchObject({ provided: false, rawTextCharacters: 0, rawTextSha256: null })
  })
  it('rejects empty or off-panel selection before creating a handoff', async () => {
    await expect(inspectWorkflowInputs(availableWorkflows[0], '', '', [])).rejects.toThrow('one to three')
    await expect(inspectWorkflowInputs(availableWorkflows[0], 'GCF_999999999.1', '', [])).rejects.toThrow('outside')
  })
})
