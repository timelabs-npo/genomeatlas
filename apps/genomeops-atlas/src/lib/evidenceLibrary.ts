import published from '../data/publishedEvidence.json'

export const publishedEvidence = published
export const pilotProofSummary = {
  title: 'A host tree from three real genomes',
  genomes: 3,
  markers: 118,
  proteinMappings: 350,
  artifactFiles: 1241,
  scope: 'GToTree 1.8.17 pilot · execution demonstrated · publication review pending',
}

export type EvidenceFile = typeof published.files[number]
export type FileCheck = { name: string; state: 'match' | 'mismatch' | 'unavailable'; detail: string }

/** Compare served bytes with the recorded manifest; not an authorship/signature check. */
export async function checkEvidenceFile(file: EvidenceFile): Promise<FileCheck> {
  try {
    const response = await fetch(file.url, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength !== file.bytes) {
      return { name: file.name, state: 'mismatch', detail: 'File length differs from the recorded artifact.' }
    }
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    return { name: file.name, state: actual === file.sha256 ? 'match' : 'mismatch', detail: actual }
  } catch (error) {
    return { name: file.name, state: 'unavailable', detail: error instanceof Error ? error.message : 'Unable to check file.' }
  }
}
