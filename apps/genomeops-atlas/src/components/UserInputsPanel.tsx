import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Database, Dna, Layers, LockKeyhole, NotebookPen, RotateCcw, Search, Upload, X } from 'lucide-react'
import { frozenGenomeAccessions, inspectGenomeSelection, publishedPilotAccessions, readLocalSequenceFile, useUserInputs } from '../lib/userInputs'
import { toolCatalog } from '../lib/workbench'
import '../userInputs.css'

interface Props { open: boolean; onClose: () => void }

function InputEditor({ onClose }: Pick<Props, 'onClose'>) {
  const { inputs, setInput, toggleTool, resetInputs } = useUserInputs()
  const [query, setQuery] = useState('')
  const [browse, setBrowse] = useState(false)
  const [loadedFile, setLoadedFile] = useState<{ name: string; bytes: number; text: string } | null>(null)
  const [fileError, setFileError] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [mobile, setMobile] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1179px)').matches)
  const panelRef = useRef<HTMLElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileOperation = useRef(0)
  const selection = useMemo(() => inspectGenomeSelection(inputs.accessionsText), [inputs.accessionsText])
  const selectedTools = useMemo(() => toolCatalog.filter(tool => inputs.selectedToolIds.includes(tool.id)), [inputs.selectedToolIds])
  const matches = useMemo(() => frozenGenomeAccessions.filter(id => id.toLowerCase().includes(query.trim().toLowerCase())), [query])

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus({ preventScroll: true })
    return () => { fileOperation.current += 1; previous?.focus() }
  }, [])
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 1179px)')
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!mobile) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [mobile])
  useEffect(() => { fileOperation.current += 1; setLoadingFile(false) }, [inputs.sequenceText])

  const removeAccession = (index: number) => setInput('accessionsText', selection.accessions.filter((_, position) => index !== position).join('\n'))
  const addAccession = (id: string) => {
    if (selection.accessions.length >= 3 || selection.accessions.includes(id)) return
    setInput('accessionsText', [...selection.accessions, id].join('\n'))
  }
  const loadFile = async (file: File) => {
    const operation = ++fileOperation.current
    setLoadingFile(true)
    setFileError('')
    setLoadedFile(null)
    try {
      const text = await readLocalSequenceFile(file)
      if (operation !== fileOperation.current) return
      setInput('sequenceText', text)
      setLoadedFile({ name: file.name, bytes: file.size, text })
    } catch (error) {
      if (operation === fileOperation.current) setFileError(error instanceof Error ? error.message : 'The file could not be read. Try another plain-text file.')
    } finally {
      if (operation === fileOperation.current) setLoadingFile(false)
    }
  }
  const clear = () => {
    fileOperation.current += 1
    resetInputs()
    setLoadingFile(false)
    setLoadedFile(null)
    setFileError('')
    setResetConfirm(false)
  }

  return <>
    {mobile && <button className="ui-input-scrim" aria-label="Close inputs overlay" onClick={onClose} />}
    <aside className="ui-input-panel" ref={panelRef} role={mobile ? 'dialog' : 'complementary'} aria-modal={mobile || undefined} aria-labelledby="ui-input-title" tabIndex={-1} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose() }
      if (!mobile || event.key !== 'Tab') return
      const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([hidden]),textarea,select,a[href]')].filter(element => element.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
      <header className="ui-input-header"><div><h2 id="ui-input-title">Your inputs</h2><p>Shared across the workbench</p></div><button className="ui-input-close" aria-label="Close your inputs" onClick={onClose}><X size={20} /></button></header>
      <div className="ui-input-content">
        <section className="ui-input-section" aria-labelledby="ui-genome-heading">
          <h3 id="ui-genome-heading"><Database size={20} />Genome accessions <span className="ui-input-count">{selection.accessions.length}/3</span></h3>
          {selection.accessions.length > 0 && <ul className="ui-input-chips" aria-label="Selected genome accessions">{selection.accessions.map((id, index) => <li key={`${id}-${index}`}><code>{id}</code><button onClick={() => removeAccession(index)} aria-label={`Remove ${id}`}><X size={14} /></button></li>)}</ul>}
          <label className="ui-input-label" htmlFor="ui-accession-input">Exact genome selection</label>
          <textarea id="ui-accession-input" className="ui-input-monospace" value={inputs.accessionsText} rows={3} spellCheck={false} placeholder="Paste versioned GCF_ identifiers" aria-invalid={Boolean(selection.error)} aria-describedby="ui-accession-hint" onChange={event => setInput('accessionsText', event.target.value)} />
          <p id="ui-accession-hint" className={selection.error ? 'ui-input-error' : 'ui-input-hint'} role={selection.error ? 'alert' : undefined}>{selection.error || selection.hint}</p>
          <div className="ui-input-actions"><button className="ui-input-button" onClick={() => setBrowse(!browse)} aria-expanded={browse}><Search size={15} />{browse ? 'Hide genome browser' : 'Browse 177 genomes'}</button><button className="ui-input-text-button" onClick={() => setInput('accessionsText', publishedPilotAccessions.join('\n'))}>Load published pilot (3)</button></div>
          {browse && <div className="ui-genome-browser"><label htmlFor="ui-genome-search">Find a frozen accession</label><div className="ui-input-search"><Search size={16} /><input id="ui-genome-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by accession" /></div><p className="ui-input-hint">{matches.length} matches · choose up to three</p><ul aria-label="Frozen genome results">{matches.map(id => <li key={id}><button disabled={selection.accessions.includes(id) || selection.accessions.length >= 3} onClick={() => addAccession(id)} aria-label={`Add ${id}`}><code>{id}</code>{selection.accessions.includes(id) ? <Check size={14} /> : <span>+</span>}</button></li>)}</ul>{!matches.length && <p className="ui-input-hint">No exact panel match. Accession versions are part of the identifier.</p>}</div>}
        </section>

        <section className="ui-input-section" aria-labelledby="ui-sequence-heading">
          <h3 id="ui-sequence-heading"><Dna size={20} />DNA sequence</h3>
          <label className="ui-input-label" htmlFor="ui-sequence-input">Sequence text or single-record FASTA</label>
          <textarea id="ui-sequence-input" className="ui-input-monospace" value={inputs.sequenceText} rows={5} spellCheck={false} placeholder="Paste a sequence to inspect" aria-describedby="ui-sequence-hint" onChange={event => { fileOperation.current += 1; setLoadingFile(false); setFileError(''); setInput('sequenceText', event.target.value) }} />
          <p id="ui-sequence-hint" className="ui-input-hint">{inputs.sequenceText.length.toLocaleString()} text characters. The sandbox checks sequence format; loading text does not verify it.</p>
          <div className="ui-input-actions"><button className="ui-input-button" onClick={() => fileRef.current?.click()} disabled={loadingFile}><Upload size={15} />{loadingFile ? 'Reading file…' : 'Load sequence file'}</button><input ref={fileRef} type="file" hidden accept=".fa,.fasta,.fna,.seq,.txt,text/plain" aria-label="Load a local sequence file" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void loadFile(file) }} /></div>
          <p className="ui-input-hint">Plain text or FASTA, up to 5 MiB. File contents stay in this page.</p>
          {loadedFile?.text === inputs.sequenceText && <p className="ui-input-hint" role="status">{loadedFile.name} · {loadedFile.bytes.toLocaleString()} bytes · loaded on this page</p>}{fileError && <p className="ui-input-error" role="alert">{fileError}</p>}
          <fieldset className="ui-input-topology"><legend>Sequence topology</legend><label><input type="radio" name="ui-topology" checked={inputs.topology === 'circular'} onChange={() => setInput('topology', 'circular')} />Circular</label><label><input type="radio" name="ui-topology" checked={inputs.topology === 'linear'} onChange={() => setInput('topology', 'linear')} />Linear</label></fieldset>
        </section>

        <section className="ui-input-section" aria-labelledby="ui-context-heading"><h3 id="ui-context-heading"><NotebookPen size={20} />Research context</h3><label className="ui-input-label" htmlFor="ui-context-input">Question, files and notes</label><textarea id="ui-context-input" value={inputs.contextText} rows={4} placeholder="Describe your question, available files and the decision you need to make." onChange={event => setInput('contextText', event.target.value)} /><p className="ui-input-hint">Context is carried into prepared prompts. It is supplied text, not verified evidence.</p></section>

        <section className="ui-input-section" aria-labelledby="ui-tools-heading"><h3 id="ui-tools-heading"><Layers size={20} />Selected tools <span className="ui-input-count">{selectedTools.length}</span></h3>{selectedTools.length ? <ul className="ui-input-chips" aria-label="Selected tools">{selectedTools.map(tool => <li key={tool.id}><span>{tool.name}</span><button aria-label={`Remove tool ${tool.name}`} onClick={() => toggleTool(tool.id)}><X size={14} /></button></li>)}</ul> : <p className="ui-input-hint">Choose tools in the Scientific tools library. No tools are selected yet.</p>}<p className="ui-input-hint">Selection carries context into a task. It does not connect, install or run a tool.</p></section>
        <div className="ui-input-privacy"><LockKeyhole size={17} /><p>Page memory only. Inputs are not uploaded or saved automatically and are cleared on reload.</p></div>
        {resetConfirm ? <div className="ui-input-reset"><p>Clear genomes, sequence, notes and tool selections?</p><div className="ui-input-actions"><button className="ui-input-button" onClick={clear}>Clear all inputs</button><button className="ui-input-text-button" onClick={() => setResetConfirm(false)}>Keep inputs</button></div></div> : <button className="ui-input-text-button ui-input-reset-trigger" onClick={() => setResetConfirm(true)}><RotateCcw size={14} />Reset inputs</button>}
      </div>
    </aside>
  </>
}

export function UserInputsPanel({ open, onClose }: Props) {
  return open ? <InputEditor onClose={onClose} /> : null
}
