import { useMemo, useState, type CSSProperties } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Circle, Download, FlaskConical, MoveHorizontal, Plus, X } from 'lucide-react'
import { downloadText } from '../lib/export'
import {
  normalizeRestrictionMotif, restrictionScanToCsv, scanRestrictionSites, siteContainsPosition,
  type RestrictionScan, type RestrictionSite,
} from '../lib/restrictionScan'
import { useUserInputs } from '../lib/userInputs'
import './plasmidSandbox.css'

const STARTER_MOTIFS = ['GAATTC', 'GGATCC', 'GATATC', 'GANTC']
const COLORS = ['#98e7c9', '#88bdfa', '#eabb79', '#c8a0eb', '#ee9bb5', '#b8cc7b']
export const SYNTHETIC_PLASMID = '>synthetic-demo | constructed motif example; no biological annotation\n' +
  'AATTCGCTACAGGCTAACGTCATCGGATCCGCTATACCGACTGATCGTACGCTA\n' +
  'GACATCGTAGCTACGGATATCGCTAACGTTAGCATCGACTAGCGTACCTGACTG\n' +
  'ACGTTAGCATCGATGCTACGGAATTCGCTAGCATACGATCGTAGCTAGCATCGTA\n' +
  'GCTACGATCGTAGCATGACTCGTACGCTAGCTACGATCGTAGCATGCTAGCTAG'

const colorFor = (motifs: string[], motif: string) => COLORS[Math.max(0, motifs.indexOf(motif)) % COLORS.length]
const strandLabel = (site: RestrictionSite) => site.strand === 'both' ? 'Both strands' : site.strand === '+' ? 'Forward (+)' : 'Reverse (−)'
const siteLabel = (site: RestrictionSite) => site.motif + ' at ' + site.start + '–' + site.end + (site.crossesOrigin ? ', crosses origin' : '')
const point = (angle: number, radius: number) => ({
  x: 260 + Math.sin(angle * Math.PI / 180) * radius,
  y: 215 - Math.cos(angle * Math.PI / 180) * radius,
})
function arc(start: number, extent: number, radius: number) {
  const from = point(start, radius)
  const to = point(start + extent, radius)
  if (extent >= 359.999) {
    const middle = point(start + 180, radius)
    return `M ${from.x} ${from.y} A ${radius} ${radius} 0 1 1 ${middle.x} ${middle.y} A ${radius} ${radius} 0 1 1 ${from.x} ${from.y}`
  }
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${extent > 180 ? 1 : 0} 1 ${to.x} ${to.y}`
}

function SequenceMap({ scan, selected, onSelect }: { scan: RestrictionScan; selected?: RestrictionSite; onSelect: (site: RestrictionSite) => void }) {
  const n = scan.sequence.length
  const sites = scan.sites.slice(0, 500)
  const circular = scan.topology === 'circular'
  const activate = (event: React.KeyboardEvent<SVGGElement>, site: RestrictionSite) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(site) }
  }
  return <div className="ps-map">
    <svg viewBox={circular ? '0 0 520 430' : '0 0 520 300'} role="group" aria-label={circular ? 'Circular motif position map' : 'Linear motif position map'}>
      <title>{circular ? 'Circular' : 'Linear'} sequence map: {n} bases, {scan.siteCount} motif matches</title>
      {circular ? <>
        <circle cx="260" cy="215" r="141" className="ps-ring-track" />
        <circle cx="260" cy="215" r="120" className="ps-ring-guide" />
        {n > 0 && Array.from({ length: Math.min(n, 8) }, (_, i) => {
          const position = Math.floor(n * i / Math.min(n, 8))
          const angle = position / n * 360
          const from = point(angle, 160), to = point(angle, 166), label = point(angle, 184)
          return <g key={i} className="ps-map-tick"><line x1={from.x} y1={from.y} x2={to.x} y2={to.y} /><text x={label.x} y={label.y + 4} textAnchor="middle">{position + 1}</text></g>
        })}
        <text x="260" y="191" textAnchor="middle" className="ps-map-caption">{n ? 'SEQUENCE LENGTH' : 'YOUR SEQUENCE'}</text>
        <text x="260" y="227" textAnchor="middle" className="ps-map-length">{n ? n.toLocaleString() : 'Add DNA'}</text>
        <text x="260" y="254" textAnchor="middle" className="ps-map-caption">{n ? 'bp · circular' : 'to explore its motifs'}</text>
        {sites.map(site => {
          const angle = (site.start - 1) / n * 360
          const end = point(angle, 157)
          return <g key={site.id} role="button" tabIndex={0} aria-label={'Select site ' + siteLabel(site)} aria-pressed={selected?.id === site.id}
            onClick={() => onSelect(site)} onKeyDown={event => activate(event, site)} className={'ps-map-site' + (selected?.id === site.id ? ' is-selected' : '')} style={{ color: colorFor(scan.motifs, site.motif) }}>
            <title>{siteLabel(site)} · {strandLabel(site)}</title>
            <path d={arc(angle, site.length / n * 360, 141)} className="ps-site-arc" />
            <circle cx={end.x} cy={end.y} r={selected?.id === site.id ? 6 : 4} />
            <path d={arc(angle, Math.max(site.length / n * 360, 3), 141)} className="ps-site-hit" />
          </g>
        })}
      </> : <>
        <text x="36" y="40" className="ps-map-caption">FORWARD REFERENCE · 1 → {n || 'N'}</text>
        <line x1="40" y1="142" x2="480" y2="142" className="ps-linear-track" />
        <line x1="40" y1="164" x2="480" y2="164" className="ps-linear-track" />
        <text x="20" y="146" className="ps-map-caption">+</text><text x="20" y="168" className="ps-map-caption">−</text>
        {n > 0 && Array.from({ length: Math.min(n, 5) }, (_, i) => {
          const position = n === 1 ? 1 : Math.round((n - 1) * i / (Math.min(n, 5) - 1)) + 1
          const x = 40 + (position - 1) / n * 440
          return <g key={i} className="ps-map-tick"><line x1={x} y1="184" x2={x} y2="190" /><text x={x} y="208" textAnchor="middle">{position}</text></g>
        })}
        {!n && <text x="260" y="110" textAnchor="middle" className="ps-map-length">Add DNA to begin</text>}
        {sites.map(site => {
          const x = 40 + (site.start - 1) / n * 440
          const end = 40 + (site.start - 1 + site.length) / n * 440
          const y = 90 + (scan.motifs.indexOf(site.motif) % 3) * 14
          return <g key={site.id} role="button" tabIndex={0} aria-label={'Select site ' + siteLabel(site)} aria-pressed={selected?.id === site.id}
            onClick={() => onSelect(site)} onKeyDown={event => activate(event, site)} className={'ps-map-site' + (selected?.id === site.id ? ' is-selected' : '')} style={{ color: colorFor(scan.motifs, site.motif) }}>
            <title>{siteLabel(site)} · {strandLabel(site)}</title>
            <line x1={x} y1={y} x2={x} y2="172" className="ps-linear-site" />
            <line x1={x} y1={site.strand === '-' ? 164 : 142} x2={end} y2={site.strand === '-' ? 164 : 142} className="ps-linear-span" />
            {site.strand === 'both' && <line x1={x} y1="164" x2={end} y2="164" className="ps-linear-span" />}
            <circle cx={x} cy={y} r={selected?.id === site.id ? 6 : 4} />
            <line x1={x} y1={y} x2={x} y2="172" className="ps-site-hit" />
          </g>
        })}
        <text x="260" y="260" textAnchor="middle" className="ps-map-caption">{n.toLocaleString()} bp · linear</text>
      </>}
    </svg>
    <p className="ps-map-note">Select a marker to inspect its bases. Coordinates are one-based.{scan.siteCount > 500 ? ' The map shows the first 500 matches; exports contain all matches.' : ''}</p>
  </div>
}

export function PlasmidSandboxView({ onOpenTask }: { onOpenTask?: (taskId: string) => void } = {}) {
  const { inputs, setInput } = useUserInputs()
  const [motifs, setMotifs] = useState<string[]>(STARTER_MOTIFS)
  const [draftMotif, setDraftMotif] = useState('')
  const [motifError, setMotifError] = useState('')
  const [tab, setTab] = useState<'map' | 'sites' | 'sequence'>('map')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sequenceStart, setSequenceStart] = useState(0)
  const [sitePage, setSitePage] = useState(0)
  const [showEditor, setShowEditor] = useState(!inputs.sequenceText)
  const scan = useMemo(() => scanRestrictionSites(inputs.sequenceText, motifs, inputs.topology), [inputs.sequenceText, motifs, inputs.topology])
  const valid = Boolean(scan.sequence.length && !scan.invalidCharacters.length && !scan.inputErrors.length)
  const selected = scan.sites.find(site => site.id === selectedId)
  const visibleSitePage = Math.min(sitePage, Math.max(0, Math.ceil(scan.siteCount / 200) - 1))
  const gc = valid ? 100 * (scan.sequence.match(/[GC]/g)?.length ?? 0) / scan.sequence.length : 0
  const sourceName = inputs.sequenceText === SYNTHETIC_PLASMID ? 'Synthetic example' : scan.fastaHeader || 'Your sequence'
  const visibleStart = Math.min(sequenceStart, Math.max(0, scan.sequence.length - 1))
  const windowLength = inputs.topology === 'circular' ? Math.min(240, scan.sequence.length) : Math.min(240, scan.sequence.length - visibleStart)
  const positions = valid ? Array.from({ length: windowLength }, (_, i) => ((visibleStart + i) % scan.sequence.length) + 1) : []
  const rows = Array.from({ length: Math.ceil(positions.length / 60) }, (_, i) => positions.slice(i * 60, (i + 1) * 60))
  const addMotifs = (event: React.FormEvent) => {
    event.preventDefault()
    const values = draftMotif.trim().split(/[\s,;]+/).filter(Boolean)
    const normalized = values.map(normalizeRestrictionMotif)
    if (!values.length || normalized.some(value => value === null)) { setMotifError('Use DNA IUPAC letters: A C G T R Y S W K M B D H V N. Separate motifs with a space or comma.'); return }
    setMotifs(current => [...new Set([...current, ...normalized.filter((value): value is string => value !== null)])])
    setDraftMotif(''); setMotifError('')
  }
  const selectSite = (site: RestrictionSite) => {
    setSelectedId(site.id)
    const flank = Math.min(12, scan.sequence.length - 1)
    setSequenceStart(inputs.topology === 'circular' ? (site.start - 1 - flank + scan.sequence.length) % scan.sequence.length : Math.max(0, site.start - 13))
  }
  const loadExample = () => { setInput('sequenceText', SYNTHETIC_PLASMID); setInput('topology', 'circular'); setMotifs(STARTER_MOTIFS); setSelectedId(null); setSequenceStart(0); setShowEditor(false) }
  const exportJson = () => downloadText('motif-scan.json', JSON.stringify({
    schema: 'genomeatlas.motif-scan/1', exportedAtUtc: new Date().toISOString(),
    coordinateSystem: '1-based inclusive; circular end may precede start',
    scope: 'Sequence-pattern matches only. No cleavage, methylation, strain identity, or transformation prediction.',
    ...scan,
  }, null, 2), 'application/json')

  return <section className="ps-workspace" aria-label="Plasmid sandbox">
    <header className="ps-intro">
      <div><span className="ps-eyebrow">SEQUENCE EXPLORER</span><h1>Plasmid sandbox<span>.</span></h1><p>Map your motifs. Inspect every match.</p></div>
      <button className="ps-button" onClick={loadExample}><FlaskConical size={16} />Load synthetic example</button>
    </header>

    <div className="ps-input-strip">
      <span className="ps-source-dot" /><div><strong title={sourceName}>{sourceName}</strong><span>{valid ? scan.sequence.length.toLocaleString() + ' bp in this browser' : 'Raw DNA or one FASTA record'}</span></div>
      <button className="ps-text-button" aria-expanded={showEditor} onClick={() => setShowEditor(!showEditor)}>{showEditor ? 'Hide input' : 'Edit sequence'}</button>
    </div>
    {showEditor && <div className="ps-editor"><label htmlFor="sandbox-dna">Sandbox DNA sequence</label><textarea id="sandbox-dna" rows={5} value={inputs.sequenceText} onChange={event => { setInput('sequenceText', event.target.value); setSequenceStart(0) }} spellCheck={false} autoCapitalize="characters" placeholder="Paste A, C, G, T or one FASTA record" aria-invalid={Boolean(scan.invalidCharacters.length || scan.inputErrors.length)} aria-describedby="ps-input-help" /><small id="ps-input-help">A, C, G, T bases; case and whitespace are normalized. Shared with your workspace inputs.</small></div>}
    <div className="ps-input-message" role="status">
      {scan.inputErrors.length > 0 ? scan.inputErrors.join(' ') : scan.invalidCharacters.length > 0 ? 'Invalid DNA characters: ' + scan.invalidCharacters.join(' ') + '. Resolve ambiguous bases before mapping; none are silently removed.' : !scan.sequence.length ? 'Add a sequence or load the constructed example to begin.' : null}
    </div>

    <div className="ps-motif-controls">
      <div className="ps-control-heading"><h2>Recognition patterns</h2><span>IUPAC motifs · both strands · <a href="https://www.ncbi.nlm.nih.gov/sites/books/NBK44863/table/sequencesquickstart.Td/?report=objectonly" target="_blank" rel="noreferrer">Pattern code guide</a></span></div>
      <div className="ps-motif-row">{motifs.map(motif => <span key={motif} className="ps-motif-chip" style={{ '--motif-color': colorFor(motifs, motif) } as CSSProperties}><i />{motif}<button onClick={() => setMotifs(current => current.filter(value => value !== motif))} aria-label={'Remove motif ' + motif}><X size={13} /></button></span>)}
        {!motifs.length && <span className="ps-muted">Add a motif to scan.</span>}
      </div>
      <form onSubmit={addMotifs} className="ps-motif-form"><label className="ps-sr-only" htmlFor="custom-motif">Custom motif</label><input id="custom-motif" value={draftMotif} onChange={event => { setDraftMotif(event.target.value); setMotifError('') }} placeholder="Add a motif, e.g. GANTC" spellCheck={false} aria-invalid={Boolean(motifError)} aria-describedby={motifError ? 'ps-motif-error' : undefined} /><button className="ps-button" type="submit"><Plus size={15} />Add motif</button></form>
      {motifError && <p className="ps-error" id="ps-motif-error" role="alert">{motifError}</p>}
      <p className="ps-map-note">Browser limits: 250,000 bases, 16 motifs, 64 letters per motif, 50,000 matches. Larger scans belong in an external sequence tool.</p>
    </div>

    <div className="ps-summary"><div><span>Length</span><strong>{valid ? scan.sequence.length.toLocaleString() : '—'}<small> bp</small></strong></div><div><span>Motif matches</span><strong>{valid ? scan.siteCount.toLocaleString() : '—'}</strong></div><div><span>GC content</span><strong>{valid ? gc.toFixed(1) : '—'}<small>%</small></strong></div><div><span>Origin junctions</span><strong>{valid ? scan.sites.filter(site => site.crossesOrigin).length : '—'}</strong></div></div>

    <div className="ps-explorer">
      <div className="ps-explorer-toolbar"><div className="ps-tabs" role="tablist" aria-label="Scan view">{(['map', 'sites', 'sequence'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} aria-controls={'ps-' + value + '-panel'} id={'ps-' + value + '-tab'} onClick={() => setTab(value)}>{value === 'map' ? 'Sequence map' : value === 'sites' ? 'Matches' : 'Sequence'}</button>)}</div>
        <div className="ps-topology" role="group" aria-label="Sequence topology"><button aria-pressed={inputs.topology === 'circular'} onClick={() => setInput('topology', 'circular')}><Circle size={14} />Circular</button><button aria-pressed={inputs.topology === 'linear'} onClick={() => setInput('topology', 'linear')}><MoveHorizontal size={16} />Linear</button></div>
      </div>

      {tab === 'map' && <div id="ps-map-panel" role="tabpanel" aria-labelledby="ps-map-tab" className="ps-map-layout">
        <SequenceMap scan={valid ? scan : { ...scan, sequence: '', sites: [], siteCount: 0 }} selected={selected} onSelect={selectSite} />
        <aside className="ps-inspector">
          <span className="ps-eyebrow">{selected ? 'SELECTED MATCH' : 'MOTIF LEGEND'}</span>
          {selected ? <><h3 style={{ color: colorFor(motifs, selected.motif) }}>{selected.motif}</h3><dl><div><dt>Coordinates</dt><dd>{selected.start} → {selected.end}</dd></div><div><dt>Strand</dt><dd>{strandLabel(selected)}</dd></div><div><dt>Spans origin</dt><dd>{selected.crossesOrigin ? 'Yes' : 'No'}</dd></div><div><dt>Length</dt><dd>{selected.length} bp</dd></div></dl><code className="ps-matched-bases">{selected.matchedSequence}</code><small>Matched bases on your forward sequence.</small><button className="ps-text-button" onClick={() => setTab('sequence')}>Inspect highlighted bases<ArrowUpRight size={14} /></button><button className="ps-text-button ps-muted" onClick={() => setSelectedId(null)}>Clear selection</button></> :
            <><h3>Every marker is a match.</h3><p>Choose one on the map to see its position, strand, and bases.</p><ul className="ps-legend">{motifs.map(motif => <li key={motif}><i style={{ background: colorFor(motifs, motif) }} /><code>{motif}</code><strong>{valid ? scan.sites.filter(site => site.motif === motif).length : '—'}</strong></li>)}</ul></>}
          <p className="ps-coordinate-note">Overlapping sites are retained. A motif matching both strands at one position is counted once.</p>
        </aside>
      </div>}

      {tab === 'sites' && <div id="ps-sites-panel" role="tabpanel" aria-labelledby="ps-sites-tab" className="ps-sites-panel">
        <div className="ps-table-scroll"><table><thead><tr><th>Motif</th><th>Start</th><th>End</th><th>Strand</th><th>Origin</th><th><span className="ps-sr-only">Select</span></th></tr></thead><tbody>{scan.sites.slice(visibleSitePage * 200, (visibleSitePage + 1) * 200).map(site => <tr key={site.id} className={selected?.id === site.id ? 'is-selected' : ''}><td><span className="ps-table-motif" style={{ color: colorFor(motifs, site.motif) }}>{site.motif}</span></td><td>{site.start}</td><td>{site.end}</td><td>{strandLabel(site)}</td><td>{site.crossesOrigin ? 'Crosses' : '—'}</td><td><button className="ps-text-button" onClick={() => { selectSite(site); setTab('sequence') }} aria-label={'Inspect ' + siteLabel(site)}>Inspect<ArrowUpRight size={13} /></button></td></tr>)}</tbody></table></div>
        {!scan.sites.length && <p className="ps-empty">{scan.inputErrors.length || scan.invalidCharacters.length ? 'Scan unavailable. Resolve the input message above to continue.' : valid && motifs.length ? 'No matches for these patterns in this sequence.' : 'Your matches will appear here after you add DNA and motifs.'}</p>}
        {scan.siteCount > 200 && <div className="ps-sequence-heading"><p className="ps-map-note">Showing {visibleSitePage * 200 + 1}–{Math.min((visibleSitePage + 1) * 200, scan.siteCount)} of {scan.siteCount.toLocaleString()} matches. Exports contain all matches.</p><div className="ps-pagination"><button aria-label="Previous matches page" disabled={visibleSitePage === 0} onClick={() => setSitePage(visibleSitePage - 1)}><ChevronLeft size={17} /></button><span>Page {visibleSitePage + 1}</span><button aria-label="Next matches page" disabled={(visibleSitePage + 1) * 200 >= scan.siteCount} onClick={() => setSitePage(visibleSitePage + 1)}><ChevronRight size={17} /></button></div></div>}
      </div>}

      {tab === 'sequence' && <div id="ps-sequence-panel" role="tabpanel" aria-labelledby="ps-sequence-tab" className="ps-sequence-panel">
        <div className="ps-sequence-heading"><div><h3>{selected ? selected.motif + ' · highlighted match' : 'Sequence, base by base'}</h3><p>{selected ? strandLabel(selected) + ' · coordinates ' + selected.start + ' → ' + selected.end : 'Select a match on the map or in the table to highlight it.'}</p></div><div className="ps-pagination"><button aria-label="Previous sequence window" disabled={!valid || visibleStart === 0} onClick={() => setSequenceStart(Math.max(0, visibleStart - 240))}><ChevronLeft size={17} /></button><span>{positions[0] ?? 0}–{positions.at(-1) ?? 0}</span><button aria-label="Next sequence window" disabled={!valid || visibleStart + 240 >= scan.sequence.length} onClick={() => setSequenceStart(visibleStart + 240)}><ChevronRight size={17} /></button></div></div>
        <div className="ps-sequence-bases" aria-label="Sequence bases with selected motif highlighted">{rows.map((row, index) => <div className="ps-base-row" key={index}><span className="ps-base-coordinate">{row[0]}</span><code>{row.map(position => <span key={position} data-position={position} className={selected && siteContainsPosition(selected, position) ? 'ps-base-selected' : ''} title={'Base ' + position} style={selected && siteContainsPosition(selected, position) ? { '--motif-color': colorFor(motifs, selected.motif) } as CSSProperties : undefined}>{scan.sequence[position - 1]}</span>)}</code></div>)}</div>
        {!valid && <p className="ps-empty">Add valid DNA to inspect the sequence.</p>}
        <p className="ps-map-note">Up to 240 bases per window. A circular window can continue across position 1.</p>
      </div>}
    </div>

    {scan.motifsLongerThanSequence.length > 0 && valid && <p className="ps-muted ps-small">Not scanned: {scan.motifsLongerThanSequence.join(', ')} exceeds this molecule's length. Circular matches span at most one revolution.</p>}
    <footer className="ps-footer"><p>Pattern locations only. No strain assignment, cleavage prediction, or transformation assessment.</p><div><button className="ps-button" disabled={!valid || !motifs.length} onClick={exportJson}><Download size={15} />Scan JSON</button><button className="ps-button" disabled={!valid || !motifs.length} onClick={() => downloadText('motif-sites.csv', restrictionScanToCsv(scan), 'text/csv')}><Download size={15} />Sites CSV</button>{onOpenTask && <button className="ps-text-button" onClick={() => onOpenTask('audit-strain-evidence')}>Check recognition evidence<ArrowUpRight size={15} /></button>}</div></footer>
  </section>
}
