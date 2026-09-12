import { describe, expect, it } from 'vitest'
import {
  normalizeRestrictionMotif, restrictionScanToCsv, reverseComplementMotif,
  scanRestrictionSites, siteContainsPosition,
} from './restrictionScan'

describe('restriction motif scan', () => {
  it('counts overlapping occurrences and de-duplicates identical motif inputs', () => {
    expect(scanRestrictionSites('AAAAAGATATCGAATTC', ['AAA', 'GATATC', 'GAATTC']).siteCount).toBe(5)
    expect(scanRestrictionSites('GATATCGATATC', ['gatatc', 'GATATC', '']).siteCount).toBe(2)
    expect(scanRestrictionSites('AAAAA', ['AAA']).sites.map(site => site.start)).toEqual([1, 2, 3])
  })

  it('normalizes case and whitespace without silently deleting ambiguous sequence bases', () => {
    expect(scanRestrictionSites('gaa\n ttc', ['GAATTC']).siteCount).toBe(1)
    expect(scanRestrictionSites('GAA N TTC', ['GAATTC'])).toMatchObject({
      sequence: 'GAANTTC', invalidCharacters: ['N'], siteCount: 0, sites: [],
    })
    expect(scanRestrictionSites('GAATTC123', ['GAATTC']).siteCount).toBe(0)
  })

  it('accepts one FASTA record and retains its header', () => {
    expect(scanRestrictionSites('\uFEFF>synthetic circle\r\ngaa\r\nttc\r\n', ['GAATTC'])).toMatchObject({
      sourceFormat: 'fasta', fastaHeader: 'synthetic circle', sequence: 'GAATTC', siteCount: 1,
    })
  })

  it('refuses to concatenate distinct FASTA molecules or sequence before a header', () => {
    const multi = scanRestrictionSites('>one\nGAA\n>two\nTTC', ['GAATTC'], 'circular')
    expect(multi.inputErrors[0]).toMatch(/one FASTA record/)
    expect(multi.sequence).toBe('')
    expect(multi.siteCount).toBe(0)
    expect(scanRestrictionSites('ACGT\n>late\nGAATTC', ['GAATTC']).inputErrors[0]).toMatch(/precede/)
  })

  it('finds the reverse complement and reports forward-reference coordinates', () => {
    expect(scanRestrictionSites('CCCATCCC', ['ATG']).sites).toEqual([{
      id: 'ATG:2', motif: 'ATG', start: 3, end: 5, length: 3,
      strand: '-', crossesOrigin: false, matchedSequence: 'CAT',
    }])
  })

  it('counts palindromic forward/reverse matches once at each locus', () => {
    const scan = scanRestrictionSites('GAATTCGAATTC', ['GAATTC'])
    expect(scan.sites.map(site => [site.start, site.end, site.strand])).toEqual([[1, 6, 'both'], [7, 12, 'both']])
    expect(scan.siteCount).toBe(2)
  })

  it('finds a circular junction without fabricating a linear match', () => {
    expect(scanRestrictionSites('AATTCG', ['GAATTC'], 'linear').siteCount).toBe(0)
    const scan = scanRestrictionSites('AATTCG', ['GAATTC'], 'circular')
    expect(scan.sites).toMatchObject([{ start: 6, end: 5, crossesOrigin: true, matchedSequence: 'GAATTC', strand: 'both' }])
    expect(scan.siteCount).toBe(1)
  })

  it('counts every overlapping circular start exactly once, within one revolution', () => {
    expect(scanRestrictionSites('AAAAA', ['AAA'], 'circular').sites.map(site => site.start)).toEqual([1, 2, 3, 4, 5])
    const scan = scanRestrictionSites('AA', ['AAA'], 'circular')
    expect(scan.siteCount).toBe(0)
    expect(scan.motifsLongerThanSequence).toEqual(['AAA'])
  })

  it('matches IUPAC ambiguity codes in motifs against concrete DNA', () => {
    const allowed: Record<string, string> = {
      R: 'AG', Y: 'CT', S: 'CG', W: 'AT', K: 'GT', M: 'AC',
      B: 'CGT', D: 'AGT', H: 'ACT', V: 'ACG', N: 'ACGT',
    }
    for (const [code, bases] of Object.entries(allowed)) {
      for (const base of 'ACGT') {
        const forward = scanRestrictionSites(base, [code]).sites.some(site => site.strand !== '-')
        expect(forward, code + ' accepts ' + base).toBe(bases.includes(base))
      }
    }
    expect(scanRestrictionSites('ACGT', ['WCGW']).sites[0]?.strand).toBe('both')
  })

  it('complements every supported ambiguity code', () => {
    expect(reverseComplementMotif('ACGTRYSWKMBDHVN')).toBe('NBDHVKMWSRYACGT')
    expect(reverseComplementMotif('AGRY')).toBe('RYCT')
  })

  it('validates motifs without treating malformed patterns as regular expressions', () => {
    expect(normalizeRestrictionMotif(' gaanttc ')).toBe('GAANTTC')
    for (const motif of ['', 'A.*T', 'A/U', 'GA TTC', 'A2T', '>motif']) expect(normalizeRestrictionMotif(motif)).toBeNull()
    const scan = scanRestrictionSites('GAATTC', ['G.AATTC', 'GAATTC'])
    expect(scan.invalidMotifs).toEqual(['G.AATTC'])
    expect(scan.siteCount).toBe(1)
  })

  it('handles empty, short, and no-hit inputs without scientific predictions', () => {
    expect(scanRestrictionSites(' \n', ['GAATTC']).sequence).toBe('')
    expect(scanRestrictionSites('>empty\n', ['GAATTC']).siteCount).toBe(0)
    expect(scanRestrictionSites('GAAT', ['GAATTC']).siteCount).toBe(0)
    expect(scanRestrictionSites('ACGT', ['GAATTC']).siteCount).toBe(0)
  })

  it('highlights both parts of a site that crosses the origin', () => {
    const site = scanRestrictionSites('AATTCGGG', ['GAATTC'], 'circular').sites[0]
    expect(site).toMatchObject({ start: 8, end: 5 })
    expect([1, 5, 8].every(position => siteContainsPosition(site, position))).toBe(true)
    expect([6, 7].some(position => siteContainsPosition(site, position))).toBe(false)
  })

  it('exports actual coordinates, strand, and junction status as CSV', () => {
    const csv = restrictionScanToCsv(scanRestrictionSites('AATTCG', ['GAATTC'], 'circular'))
    expect(csv).toContain('"start_1based","end_1based","strand"')
    expect(csv).toContain('"GAATTC","6","5","both","true","GAATTC","circular","6"')
    expect(restrictionScanToCsv(scanRestrictionSites('', []))).toHaveLength(csv.split('\r\n')[0].length + 2)
  })

  it('accepts the browser sequence boundary and rejects an oversized molecule before scanning', () => {
    expect(scanRestrictionSites('A'.repeat(250_000), ['CG']).inputErrors).toEqual([])
    const large = scanRestrictionSites('A'.repeat(250_001), ['CG'])
    expect(large.inputErrors[0]).toContain('250,000 bases')
    expect(large.sites).toEqual([])
  })

  it('rejects excessive motif count and length, while accepting their boundaries', () => {
    const motifs = Array.from({ length: 17 }, (_, index) => 'C' + 'A'.repeat(index))
    expect(scanRestrictionSites('A'.repeat(100), motifs.slice(0, 16)).inputErrors).toEqual([])
    expect(scanRestrictionSites('A'.repeat(100), motifs).inputErrors[0]).toContain('16 distinct motifs')
    expect(scanRestrictionSites('A'.repeat(100), ['C'.repeat(64)]).inputErrors).toEqual([])
    expect(scanRestrictionSites('A'.repeat(100), ['C'.repeat(65)]).inputErrors[0]).toContain('64 IUPAC letters')
  })

  it('checks its work budget before a large scan', () => {
    const scan = scanRestrictionSites('A'.repeat(250_000), ['C'.repeat(64), 'G'.repeat(64)], 'circular')
    expect(scan.inputErrors[0]).toContain('20 million')
    expect(scan.sites).toEqual([])
  })

  it('accepts exactly 50,000 matches and discards incomplete results above that limit', () => {
    const boundary = scanRestrictionSites('A'.repeat(50_000), ['N'])
    expect(boundary.inputErrors).toEqual([])
    expect(boundary.siteCount).toBe(50_000)
    const tooDense = scanRestrictionSites('A'.repeat(50_001), ['N'])
    expect(tooDense.inputErrors[0]).toContain('More than 50,000 matches')
    expect(tooDense.inputErrors[0]).toContain('Partial results were discarded')
    expect(tooDense.sites).toEqual([])
    expect(tooDense.siteCount).toBe(0)
  })

})
