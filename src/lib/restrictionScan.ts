export interface RestrictionScan {
  sequence: string
  invalidCharacters: string[]
  siteCount: number
}

/** Scan raw, linear DNA; never silently remove ambiguous bases to create a site. */
export function scanRestrictionSites(raw: string, motifs: readonly string[]): RestrictionScan {
  const sequence = raw.toUpperCase().replace(/\s/g, '')
  const invalidCharacters = [...new Set(sequence.replace(/[ATGC]/g, ''))]
  if (invalidCharacters.length > 0 || sequence.length === 0) {
    return { sequence, invalidCharacters, siteCount: 0 }
  }

  let siteCount = 0
  for (const motif of new Set(motifs)) {
    if (!/^[ATGC]+$/.test(motif)) continue
    let position = sequence.indexOf(motif)
    while (position !== -1) {
      siteCount += 1
      position = sequence.indexOf(motif, position + 1)
    }
  }
  return { sequence, invalidCharacters, siteCount }
}
