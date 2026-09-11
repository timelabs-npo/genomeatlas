import { describe, expect, it } from 'vitest'
import { scanRestrictionSites } from './restrictionScan'

describe('restriction motif scan', () => {
  it('counts overlapping occurrences and distinct motifs', () => {
    expect(scanRestrictionSites('AAAAAGATATCGAATTC', ['AAA', 'GATATC', 'GAATTC']).siteCount).toBe(5)
    expect(scanRestrictionSites('GATATCGATATC', ['GATATC', 'GATATC', '']).siteCount).toBe(2)
  })

  it('normalizes case and whitespace without discarding unknown bases', () => {
    expect(scanRestrictionSites('gaa\n ttc', ['GAATTC']).siteCount).toBe(1)
    expect(scanRestrictionSites('GAA N TTC', ['GAATTC'])).toEqual({ sequence: 'GAANTTC', invalidCharacters: ['N'], siteCount: 0 })
    expect(scanRestrictionSites('>FASTA\nGAATTC', ['GAATTC']).invalidCharacters.length).toBeGreaterThan(0)
  })

  it('handles empty, short and no-hit input', () => {
    expect(scanRestrictionSites(' \n', ['GAATTC']).sequence).toBe('')
    expect(scanRestrictionSites('GAAT', ['GAATTC']).siteCount).toBe(0)
    expect(scanRestrictionSites('ACGT', ['GAATTC']).siteCount).toBe(0)
  })
})
