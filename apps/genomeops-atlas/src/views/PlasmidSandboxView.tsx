import { useMemo, useState } from 'react'
import { scanRestrictionSites } from '../lib/restrictionScan'

// Illustrative fixtures from the product specification, not strain annotations.
const hostStrains = [
  { id: 'l-lactis-il1403', label: 'L. lactis IL1403', motifs: ['GATATC', 'GAATTC'] },
  { id: 'l-plantarum-wcfs1', label: 'L. plantarum WCFS1', motifs: ['CCGG', 'GGATCC'] },
  { id: 's-thermophilus-dgcc7710', label: 'S. thermophilus DGCC7710', motifs: ['AAGCTT', 'GTCGAC'] },
] as const

export function PlasmidSandboxView() {
  const [selectedStrainId, setSelectedStrainId] = useState<string>(hostStrains[0].id)
  const [rawSequence, setRawSequence] = useState('')
  const selectedStrain = hostStrains.find((strain) => strain.id === selectedStrainId) ?? hostStrains[0]
  const scan = useMemo(() => scanRestrictionSites(rawSequence, selectedStrain.motifs), [rawSequence, selectedStrain])
  const valid = scan.sequence.length > 0 && scan.invalidCharacters.length === 0

  return (
    <section className="content-view view-stack">
      <div className="view-intro">
        <span className="section-label">Plasmid Sandbox · mock demonstration</span>
        <h1>Explore restriction motifs</h1>
        <p>Paste raw DNA to explore a restriction motif scan. Your sequence stays in this browser.</p>
      </div>

      <div className="panel view-stack">
        <p className="callout warning" id="sandbox-boundary">
          Mock simulation only. Motifs are illustrative and are not verified for these strains.
          Motif matches alone do not predict an experimental outcome.
          This scans a linear sequence only; methylation, circular junctions and other defense systems are not assessed.
        </p>
        <div className="toolbar">
          <div className="form-row">
            <label htmlFor="host-strain">Host strain</label>
            <select id="host-strain" value={selectedStrainId} onChange={(event) => setSelectedStrainId(event.target.value)}>
              {hostStrains.map((strain) => <option key={strain.id} value={strain.id}>{strain.label}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="plasmid-sequence">DNA sequence</label>
          <textarea
            id="plasmid-sequence"
            value={rawSequence}
            onChange={(event) => setRawSequence(event.target.value)}
            rows={12}
            spellCheck={false}
            autoCapitalize="characters"
            placeholder="Paste raw DNA sequence: A, T, G, C"
            aria-describedby="sandbox-boundary sequence-help"
            aria-invalid={scan.invalidCharacters.length > 0}
          />
          <small id="sequence-help">Uppercase or lowercase A, T, G, C only. Spaces and line breaks are allowed; FASTA headers and ambiguous bases are not.</small>
        </div>

        <dl className="fact-grid">
          <div><dt>DNA length</dt><dd>{scan.invalidCharacters.length > 0 ? 'Invalid input' : `${scan.sequence.length} bp`}</dd></div>
          <div><dt>Restriction sites</dt><dd>{valid ? scan.siteCount : 'Not assessed'}</dd></div>
        </dl>

        <div aria-live="polite" aria-atomic="true">
          {scan.invalidCharacters.length > 0 ? (
            <div className="callout warning">Invalid DNA. Remove non-ATGC characters before screening. No risk result has been calculated.</div>
          ) : !scan.sequence.length ? (
            <div className="callout">Paste a DNA sequence to begin. No risk result has been calculated.</div>
          ) : scan.siteCount > 0 ? (
            <div className="callout warning">
              <span className="section-label">Mock result</span>
              Found {scan.siteCount} illustrative motif matches. Restriction activity and transformation outcome are not assessed.
            </div>
          ) : (
            <div className="callout" style={{ borderColor: 'var(--lime)' }}>
              <span className="section-label">Mock result</span>
              No illustrative motif matches. This does not establish absence of R-M barriers or transformation safety.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
