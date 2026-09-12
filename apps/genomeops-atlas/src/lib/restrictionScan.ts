export type SequenceTopology = 'linear' | 'circular'
export type MatchStrand = '+' | '-' | 'both'

/** Explicit bounds keep an interactive, synchronous browser scan responsive. */
export const RESTRICTION_SCAN_LIMITS = { sequenceLength: 250_000, motifCount: 16, motifLength: 64, comparisons: 20_000_000, matches: 50_000 } as const

export interface RestrictionSite {
  id: string
  motif: string
  /** One-based coordinates on the supplied forward sequence. End may precede start on a circle. */
  start: number
  end: number
  length: number
  strand: MatchStrand
  crossesOrigin: boolean
  /** Forward-sequence bases, including the origin junction when applicable. */
  matchedSequence: string
}

export interface RestrictionScan {
  sequence: string
  topology: SequenceTopology
  sourceFormat: 'raw' | 'fasta'
  fastaHeader: string | null
  inputErrors: string[]
  invalidCharacters: string[]
  motifs: string[]
  invalidMotifs: string[]
  motifsLongerThanSequence: string[]
  sites: RestrictionSite[]
  siteCount: number
}

const IUPAC: Record<string, number> = {
  A: 1, C: 2, G: 4, T: 8, R: 5, Y: 10, S: 6, W: 9,
  K: 12, M: 3, B: 14, D: 13, H: 11, V: 7, N: 15,
}
const COMPLEMENT: Record<string, string> = {
  A: 'T', C: 'G', G: 'C', T: 'A', R: 'Y', Y: 'R', S: 'S', W: 'W',
  K: 'M', M: 'K', B: 'V', D: 'H', H: 'D', V: 'B', N: 'N',
}

export function normalizeRestrictionMotif(value: string): string | null {
  const motif = value.trim().toUpperCase()
  return /^[ACGTRYSWKMBDHVN]+$/.test(motif) ? motif : null
}

export function reverseComplementMotif(motif: string): string {
  return [...motif].reverse().map(base => COMPLEMENT[base]).join('')
}

function parseSequence(raw: string) {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const headers = lines.filter(line => line.startsWith('>'))
  const sourceFormat = headers.length ? 'fasta' as const : 'raw' as const
  let inputErrors: string[] = []
  if (headers.length > 1) inputErrors = ['Provide one FASTA record. Multiple records are separate molecules and cannot share one map.']
  else if (headers.length && !lines[0]?.startsWith('>')) inputErrors = ['A FASTA header must precede its sequence.']
  const sequence = inputErrors.length ? '' : lines.filter(line => !line.startsWith('>')).join('').toUpperCase().replace(/\s/g, '')
  return { sequence, sourceFormat, fastaHeader: headers.length === 1 ? headers[0].slice(1).trim() : null, inputErrors }
}

/**
 * Match user-supplied IUPAC motifs against unambiguous DNA on both strands.
 * Overlaps are retained. Forward/reverse matches at the same motif/locus are
 * one site with strand="both". Circular sites span at most one revolution.
 * This locates sequence patterns; it does not infer cleavage or host biology.
 */
export function scanRestrictionSites(raw: string, rawMotifs: readonly string[], topology: SequenceTopology = 'linear'): RestrictionScan {
  const parsed = parseSequence(raw)
  const sequence = parsed.sequence
  const invalidCharacters = [...new Set(sequence.replace(/[ACGT]/g, ''))]
  const normalized = rawMotifs.map(normalizeRestrictionMotif)
  const motifs = [...new Set(normalized.filter((motif): motif is string => motif !== null))]
  const invalidMotifs = [...new Set(rawMotifs.filter((_, index) => normalized[index] === null))]
  const result: RestrictionScan = {
    ...parsed, topology, invalidCharacters, motifs, invalidMotifs,
    motifsLongerThanSequence: sequence.length ? motifs.filter(motif => motif.length > sequence.length) : [],
    sites: [], siteCount: 0,
  }
  if (sequence.length > RESTRICTION_SCAN_LIMITS.sequenceLength) result.inputErrors.push('This browser map supports up to 250,000 bases. Use an external sequence tool for a larger molecule.')
  if (motifs.length > RESTRICTION_SCAN_LIMITS.motifCount) result.inputErrors.push('Scan up to 16 distinct motifs at a time. Remove some patterns to continue.')
  if (motifs.some(motif => motif.length > RESTRICTION_SCAN_LIMITS.motifLength)) result.inputErrors.push('Each motif can contain up to 64 IUPAC letters. Shorten the longer patterns to continue.')
  if (!sequence.length || result.inputErrors.length || invalidCharacters.length) return result

  const compiled = motifs.filter(motif => motif.length <= sequence.length).map(motif => ({
    motif, forward: [...motif].map(base => IUPAC[base]),
    reverse: [...reverseComplementMotif(motif)].map(base => IUPAC[base]),
  }))
  if (!compiled.length) return result
  const comparisons = compiled.reduce((total, { motif }) => total + motif.length * (topology === 'circular' ? sequence.length : sequence.length - motif.length + 1), 0)
  if (comparisons > RESTRICTION_SCAN_LIMITS.comparisons) {
    result.inputErrors.push('This scan exceeds the browser work limit of 20 million motif-position comparisons. Use fewer or shorter motifs, a smaller sequence, or an external sequence tool.')
    return result
  }
  const maximumLength = Math.max(0, ...compiled.map(item => item.motif.length))
  const expanded = topology === 'circular' ? sequence + sequence.slice(0, maximumLength - 1) : sequence
  const bases = new Uint8Array(expanded.length)
  for (let i = 0; i < expanded.length; i++) bases[i] = IUPAC[expanded[i]]

  for (const { motif, forward, reverse } of compiled) {
    const limit = topology === 'circular' ? sequence.length : sequence.length - motif.length + 1
    for (let start = 0; start < limit; start++) {
      let plus = true
      let minus = true
      for (let j = 0; j < motif.length && (plus || minus); j++) {
        plus = plus && Boolean(bases[start + j] & forward[j])
        minus = minus && Boolean(bases[start + j] & reverse[j])
      }
      if (!plus && !minus) continue
      if (result.sites.length === RESTRICTION_SCAN_LIMITS.matches) {
        result.inputErrors.push('More than 50,000 matches: this pattern set is too dense for the browser map. Use more specific motifs or an external sequence tool. Partial results were discarded.')
        result.sites = []
        return result
      }
      result.sites.push({
        id: motif + ':' + start,
        motif, start: start + 1, end: ((start + motif.length - 1) % sequence.length) + 1,
        length: motif.length, strand: plus && minus ? 'both' : plus ? '+' : '-',
        crossesOrigin: start + motif.length > sequence.length,
        matchedSequence: expanded.slice(start, start + motif.length),
      })
    }
  }
  result.sites.sort((a, b) => a.start - b.start || a.motif.localeCompare(b.motif))
  result.siteCount = result.sites.length
  return result
}

export function siteContainsPosition(site: RestrictionSite, oneBasedPosition: number): boolean {
  return site.crossesOrigin
    ? oneBasedPosition >= site.start || oneBasedPosition <= site.end
    : oneBasedPosition >= site.start && oneBasedPosition <= site.end
}

export function restrictionScanToCsv(scan: RestrictionScan): string {
  const rows = [
    ['motif', 'start_1based', 'end_1based', 'strand', 'crosses_origin', 'matched_forward_sequence', 'topology', 'sequence_length_bp'],
    ...scan.sites.map(site => [
      site.motif, site.start, site.end, site.strand, site.crossesOrigin,
      site.matchedSequence, scan.topology, scan.sequence.length,
    ]),
  ]
  return rows.map(row => row.map(value => JSON.stringify(String(value))).join(',')).join('\r\n') + '\r\n'
}
