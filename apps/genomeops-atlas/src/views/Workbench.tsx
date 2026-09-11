import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Circle, ClipboardList, Copy, Database, Dna, ExternalLink, FileCheck2, FileSearch, FileText, GitBranch, Globe2, Home, Image, Menu, MessageSquare, Network, Search, Shield, Sparkles, Wrench, X } from 'lucide-react'
import { WorkbenchDialog } from '../components/WorkbenchDialog'
import { composeHandoff, copyHandoff, defaultHandoffOptions, destinations, parseGenomeAccessions, personaOptions, roleOptions, searchTools, starterTasks, toneOptions, toolCatalog, toolLayers, toolStatuses, type CatalogTool, type StarterTask } from '../lib/workbench'
import { EvidenceLibrary } from './EvidenceLibrary'
import { PlasmidSandboxView } from './PlasmidSandboxView'
import { WorkflowDispatcher } from './WorkflowDispatcher'

type Section = 'home' | 'tasks' | 'tools' | 'evidence' | 'plasmid' | 'dispatcher'
type HandoffOptions = Parameters<typeof composeHandoff>[0]
const navigation = [
  { id: 'home', label: 'Workbench', icon: Home },
  { id: 'tasks', label: 'Task library', icon: BookOpen },
  { id: 'tools', label: 'Scientific tools', icon: Wrench },
  { id: 'evidence', label: 'Evidence library', icon: FileCheck2 },
  { id: 'plasmid', label: 'Plasmid sandbox', icon: Circle },
  { id: 'dispatcher', label: 'Workflow dispatcher', icon: Network },
] as const
const taskVisuals: Record<string, { icon: typeof Dna; color: string; category: string }> = {
  panel: { icon: Database, color: '#81b6ff', category: 'Genome selection' },
  download: { icon: FileText, color: '#98e7c9', category: 'Data preparation' },
  markers: { icon: Dna, color: '#91d9cd', category: 'Conserved markers' },
  tree: { icon: GitBranch, color: '#c8a2f3', category: 'Phylogenomics' },
  rm: { icon: Shield, color: '#ee91b2', category: 'R–M systems' },
  evidence: { icon: FileSearch, color: '#f3b171', category: 'Literature & evidence' },
  figure: { icon: Image, color: '#83d8dd', category: 'Scientific figures' },
  release: { icon: FileCheck2, color: '#b3cda6', category: 'Review & release' },
}
const featuredChains = ['panel', 'download', 'tree', 'rm', 'evidence', 'figure']
const featuredTools = ['NCBI', 'GToTree', 'IQ-TREE', 'DefenseFinder']
const sectionFromHash = (): Section => {
  const raw = new URLSearchParams(window.location.hash.slice(1)).get('section')
  return navigation.some(item => item.id === raw) ? raw as Section : 'home'
}
const saveText = (name: string, text: string, type: string) => {
  const objectUrl = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

function TaskCard({ task, onSelect }: { task: StarterTask; onSelect: (task: StarterTask) => void }) {
  const visual = taskVisuals[task.chainId] ?? taskVisuals.panel
  const Icon = visual.icon
  return <button className="wb-task-card" onClick={() => onSelect(task)} style={{ '--task-accent': visual.color } as CSSProperties}>
    <Icon className="wb-task-icon" size={34} strokeWidth={1.65} aria-hidden="true" />
    <span><span className="wb-task-category">{visual.category}</span><span className="wb-task-summary">{task.summary}</span></span>
    <ArrowRight className="wb-card-arrow" size={17} aria-hidden="true" />
  </button>
}

function ToolRow({ tool, onSelect }: { tool: CatalogTool; onSelect: (tool: CatalogTool) => void }) {
  const key = `${tool.id} ${tool.name}`.toLowerCase()
  const Icon = /ncbi|dataset|database/.test(key) ? Database : /tree|phylo/.test(key) ? GitBranch : /defense|rebase/.test(key) ? Shield : /literature|pubmed/.test(key) ? BookOpen : /genom|sequence|protein/.test(key) ? Dna : Wrench
  const color = /ncbi|dataset/.test(key) ? '#81b6ff' : /iq/.test(key) ? '#c8a2f3' : /defense/.test(key) ? '#f3b171' : '#98e7c9'
  return <div className="wb-tool-row">
    <div className="wb-tool-icon" style={{ color, background: `${color}0d` }}><Icon size={26} strokeWidth={1.7} aria-hidden="true" /></div>
    <div className="wb-tool-copy"><h3>{tool.name}</h3><p>{tool.label || tool.scope}</p></div>
    <button className="wb-button wb-button-small" onClick={() => onSelect(tool)} aria-label={`View ${tool.name}`}>View</button>
  </div>
}

function TaskHandoff({ task, onClose }: { task: StarterTask; onClose: () => void }) {
  const [options, setOptions] = useState<HandoffOptions>(() => ({ ...defaultHandoffOptions, taskId: task.id, context: '' }))
  const [accessionsText, setAccessionsText] = useState(defaultHandoffOptions.accessions.join('\n'))
  const prepared = useMemo(() => {
    try { return { handoff: composeHandoff({ ...options, accessions: parseGenomeAccessions(accessionsText) }), error: '' } }
    catch (error) { return { handoff: null, error: error instanceof Error ? error.message : 'Check the task inputs.' } }
  }, [options, accessionsText])
  const handoff = prepared.handoff
  const destination = destinations.find(item => item.id === options.destinationId) ?? destinations[0]
  const operation = useRef(0)
  useEffect(() => () => { operation.current += 1 }, [])
  const [copyState, setCopyState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle')
  const [showPrompt, setShowPrompt] = useState(false)
  const update = (key: keyof HandoffOptions, value: string) => { operation.current += 1; setOptions(current => ({ ...current, [key]: value })); setCopyState('idle') }
  const copy = async () => {
    if (!handoff) return
    const currentOperation = ++operation.current
    setCopyState('busy')
    try { await copyHandoff(handoff.prompt); if (operation.current === currentOperation) setCopyState('copied') }
    catch { if (operation.current === currentOperation) { setCopyState('error'); setShowPrompt(true) } }
  }
  return <WorkbenchDialog title={task.title} labelId="wb-task-title" onClose={onClose} wide>
    <div className="wb-dialog-body">
      <p className="wb-dialog-lead">{task.description}</p>
      <div className="wb-task-requirements"><div><h3>Bring to the task</h3><ul>{task.inputs.map(item => <li key={item}>{item}</li>)}</ul></div><div><h3>Bring back as evidence</h3><ul>{task.outputs.map(item => <li key={item}>{item}</li>)}</ul></div></div>
      <label className="wb-context-field wb-accession-field">Exact genome accessions<textarea value={accessionsText} onChange={event => { operation.current += 1; setAccessionsText(event.target.value); setCopyState('idle') }} rows={3} spellCheck={false} aria-invalid={Boolean(prepared.error)} aria-describedby="wb-accession-help wb-accession-error" /></label>
      <p className="wb-field-help" id="wb-accession-help">One to three unique, versioned RefSeq accessions from the frozen panel. The three pilot accessions are prefilled; edit this list to set your exact scope.</p>
      {prepared.error && <p className="wb-input-error" id="wb-accession-error" role="alert">{prepared.error}</p>}
      <div className="wb-form-section"><h3>Configure your research partner</h3><p>These choices travel in your prompt. They do not change account or model settings.</p>
        <div className="wb-field-grid">
          <label>Destination<select value={options.destinationId} onChange={event => update('destinationId', event.target.value)}>{destinations.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label>Role<select value={options.roleId} onChange={event => update('roleId', event.target.value)}>{roleOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label>Tone & mood<select value={options.toneId} onChange={event => update('toneId', event.target.value)}>{toneOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label>Working character<select value={options.personaId} onChange={event => update('personaId', event.target.value)}>{personaOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
        </div>
        <label className="wb-context-field">Your research context<textarea value={options.context} onChange={event => update('context', event.target.value)} rows={4} placeholder="Describe your question, exact strains or accessions, available files, and what you need to decide." /></label>
        <p className="wb-field-help">Your input stays in this browser until you copy it or download a file. Attach source files in the destination task.</p>
      </div>
      <details className="wb-gates"><summary>Acceptance gates <ChevronDown size={16} /></summary><ul>{task.gates.map(gate => <li key={gate}>{gate}</li>)}</ul></details>
      <div className="wb-launch-panel"><MessageSquare size={21} aria-hidden="true" /><div><h3>{destination.label}</h3><p>{destination.instruction}</p></div></div>
      <div className="wb-handoff-actions"><button className="wb-button wb-primary" onClick={copy} disabled={copyState === 'busy' || !handoff}>{copyState === 'copied' ? <Check size={17} /> : <Copy size={17} />}{copyState === 'busy' ? 'Copying…' : copyState === 'copied' ? 'Prompt copied' : 'Copy prompt'}</button><a className="wb-button" href={destination.url} target="_blank" rel="noopener noreferrer">{destination.launchLabel}<ExternalLink size={16} /></a><button className="wb-button wb-download" disabled={!handoff} onClick={() => { if (handoff) saveText(`${task.id}-prompt.md`, handoff.prompt, 'text/markdown') }}><ArrowDownToLine size={17} />Download prompt</button></div>
      <p className="wb-copy-status" role="status">{copyState === 'copied' ? 'Copied. Open the destination and paste your prepared prompt.' : copyState === 'error' ? 'Clipboard access failed. Select the prompt below to copy it, or download the file.' : 'Review the prompt, then copy and open your destination.'}</p>
      <button className="wb-text-button wb-preview-toggle" disabled={!handoff} onClick={() => setShowPrompt(!showPrompt)} aria-expanded={showPrompt}>{showPrompt ? 'Hide prepared prompt' : 'Review prepared prompt'}<ChevronDown size={16} /></button>
      {showPrompt && handoff && <div className="wb-prompt-preview"><label htmlFor="wb-prepared-prompt">Prepared prompt</label><textarea id="wb-prepared-prompt" readOnly value={handoff.prompt} rows={16} onFocus={event => event.currentTarget.select()} /><button className="wb-text-button" onClick={() => saveText(`${task.id}-task-request.json`, JSON.stringify(handoff.payload, null, 2), 'application/json')}><ArrowDownToLine size={16} />Download automation request</button></div>}
    </div>
  </WorkbenchDialog>
}

export function Workbench({ onOpenAtlas, onOpenGuide }: { onOpenAtlas: () => void; onOpenGuide: () => void }) {
  const [section, setSection] = useState<Section>(sectionFromHash)
  const [mobileNavigation, setMobileNavigation] = useState(false)
  const [query, setQuery] = useState('')
  const [layer, setLayer] = useState('all')
  const [status, setStatus] = useState('all')
  const [fullRegistry, setFullRegistry] = useState(false)
  const [selectedTask, setSelectedTask] = useState<StarterTask | null>(null)
  const [selectedTool, setSelectedTool] = useState<CatalogTool | null>(null)
  useEffect(() => { const readSection = () => { setSection(sectionFromHash()); setMobileNavigation(false) }; window.addEventListener('hashchange', readSection); return () => window.removeEventListener('hashchange', readSection) }, [])
  const navigate = (id: Section) => { setSection(id); setQuery(''); setMobileNavigation(false); window.location.hash = `section=${id}`; window.scrollTo({ top: 0 }) }
  const featured = featuredChains.flatMap(id => starterTasks.filter(task => task.chainId === id)).slice(0, 6)
  const featuredCatalog = featuredTools.flatMap(key => { const match = toolCatalog.find(tool => `${tool.id} ${tool.name}`.toLowerCase().includes(key.toLowerCase())); return match ? [match] : [] })
  const filteredTasks = starterTasks.filter(task => `${task.title} ${task.summary} ${task.category} ${task.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const filteredTools = searchTools(query, layer, status).filter(tool => fullRegistry || tool.relevant)
  const activeLabel = navigation.find(item => item.id === section)?.label ?? 'Workbench'
  const relevantTasks = selectedTool ? starterTasks.filter(task => task.toolIds.includes(selectedTool.id)) : []
  return <div className="wb-shell">
    <a className="wb-skip-link" href="#wb-main" onClick={event => { event.preventDefault(); const main = document.getElementById('wb-main'); main?.focus(); main?.scrollIntoView() }}>Skip to content</a>
    <header className="wb-mobile-header"><button className="wb-mobile-brand" onClick={() => navigate('home')}><Dna size={26} />GenomeAtlas</button><button className="wb-icon-button" onClick={() => setMobileNavigation(!mobileNavigation)} aria-label={mobileNavigation ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavigation}>{mobileNavigation ? <X size={23} /> : <Menu size={23} />}</button></header>
    {mobileNavigation && <button className="wb-nav-scrim" onClick={() => setMobileNavigation(false)} aria-label="Close navigation overlay" />}
    <aside className={`wb-sidebar${mobileNavigation ? ' is-open' : ''}`}>
      <button className="wb-brand" onClick={() => navigate('home')} aria-label="GenomeAtlas Workbench home"><Dna size={40} strokeWidth={1.6} /><span><strong>GenomeAtlas</strong><span>Workbench</span></span></button>
      <nav aria-label="Workbench navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`wb-nav-item${section === id ? ' is-active' : ''}`} onClick={() => navigate(id)} aria-current={section === id ? 'page' : undefined}><Icon size={22} strokeWidth={1.6} /><span>{label}</span></button>)}</nav>
      <div className="wb-sidebar-bottom"><div className="wb-more-label">From the research atlas</div><button className="wb-secondary-nav" onClick={onOpenAtlas}><Dna size={18} />Explore original atlas<ArrowRight size={15} /></button><button className="wb-secondary-nav" onClick={onOpenGuide}><Sparkles size={18} />Everyday task guide<ArrowRight size={15} /></button><a className="wb-source-link" href="https://github.com/timelabs-npo/genomeatlas" target="_blank" rel="noopener noreferrer"><Globe2 size={23} strokeWidth={1.6} /><span>GenomeAtlas<small>A canonical research source</small></span><ExternalLink size={14} /></a></div>
    </aside>
    <main id="wb-main" className={`wb-main${section === 'home' ? ' wb-home' : ''}`} tabIndex={-1}>
      {section === 'home' ? <>
        <header className="wb-welcome"><Dna size={52} strokeWidth={1.55} /><h1>GenomeAtlas Workbench</h1><p>A clear starting point for your next research task.</p></header>
        <section className="wb-section" aria-labelledby="wb-starters"><div className="wb-section-heading"><h2 id="wb-starters">Start a research task</h2><button className="wb-text-button" onClick={() => navigate('tasks')}>View all tasks<ArrowRight size={17} /></button></div><div className="wb-task-grid">{featured.map(task => <TaskCard key={task.id} task={task} onSelect={setSelectedTask} />)}</div></section>
        <section className="wb-section wb-home-tools" aria-labelledby="wb-tools"><div className="wb-section-heading"><h2 id="wb-tools">Scientific tools</h2><button className="wb-text-button" onClick={() => navigate('tools')}>Browse library<ArrowRight size={17} /></button></div><div className="wb-tool-grid">{featuredCatalog.map(tool => <ToolRow key={tool.id} tool={tool} onSelect={setSelectedTool} />)}</div></section>
        <section className="wb-proof-invitation"><FileCheck2 size={24} /><div><h2>See what the evidence supports</h2><p>Inspect real pilot outputs, source accessions, checksums, and the limits of each result.</p></div><button className="wb-text-button" onClick={() => navigate('evidence')}>Open evidence<ArrowRight size={17} /></button></section>
      </> : <>
        <header className="wb-page-header"><button className="wb-text-button wb-back" onClick={() => navigate('home')}><ArrowLeft size={16} />Workbench</button><h1>{activeLabel}</h1><p>{section === 'tasks' ? 'Start with a precise question. Leave with a prompt, an input contract, and a clear evidence standard.' : section === 'tools' ? 'Find the right capability and inspect what is known about its availability.' : section === 'evidence' ? 'Trace a result back to its inputs, execution, and limitations.' : section === 'plasmid' ? 'Explore a local sequence scan with its assumptions in view.' : 'Prepare a strict prompt or an automation request from the frozen project contracts.'}</p></header>
        {section === 'tasks' && <><div className="wb-library-toolbar"><label className="wb-search"><Search size={20} /><input aria-label="Search task library" placeholder="Search tasks, outputs, or research areas" value={query} onChange={event => setQuery(event.target.value)} /></label><span className="wb-result-count">{filteredTasks.length} tasks</span></div><div className="wb-task-grid wb-library-task-grid">{filteredTasks.map(task => <TaskCard key={task.id} task={task} onSelect={setSelectedTask} />)}</div>{!filteredTasks.length && <div className="wb-empty"><Search size={30} /><h2>No matching task</h2><p>Try a broader term such as “genome”, “tree”, or “evidence”.</p><button className="wb-button" onClick={() => setQuery('')}>Clear search</button></div>}<p className="wb-library-note">Every starter is tied to a GenomeAtlas workflow. A prepared request is a draft; execution and scientific review happen in your selected workspace.</p></>}
        {section === 'tools' && <><div className="wb-library-toolbar"><label className="wb-search"><Search size={20} /><input aria-label="Search scientific tools" placeholder="Search tools, sources, or capabilities" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="wb-filter"><span>Layer</span><select value={layer} onChange={event => setLayer(event.target.value)}><option value="all">All layers</option>{toolLayers.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="wb-filter"><span>Snapshot state</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All states</option>{toolStatuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label></div><div className="wb-catalog-context"><p>Frozen catalog metadata is historical. A listed tool is not proof of a live connection or a completed analysis.</p><label><input type="checkbox" checked={fullRegistry} onChange={event => setFullRegistry(event.target.checked)} />Include the full inherited registry</label></div><div className="wb-results-heading"><span>{filteredTools.length} of {toolCatalog.length} catalog entries</span></div><div className="wb-tool-grid wb-full-tool-grid">{filteredTools.map(tool => <ToolRow key={tool.id} tool={tool} onSelect={setSelectedTool} />)}</div>{!filteredTools.length && <div className="wb-empty"><Search size={30} /><h2>No matching tool</h2><p>Try another search or include the full inherited registry.</p><button className="wb-button" onClick={() => { setQuery(''); setLayer('all'); setStatus('all') }}>Reset filters</button></div>}</>}
        {section === 'evidence' && <EvidenceLibrary />}
        {section === 'plasmid' && <div className="wb-legacy-content"><PlasmidSandboxView /></div>}
        {section === 'dispatcher' && <div className="wb-legacy-content"><WorkflowDispatcher /></div>}
      </>}
      <footer className="wb-footer"><span>GenomeAtlas · Research with a source trail</span><a href="https://github.com/timelabs-npo/genomeatlas" target="_blank" rel="noopener noreferrer">Source & provenance<ExternalLink size={13} /></a></footer>
    </main>
    {selectedTask && <TaskHandoff key={selectedTask.id} task={selectedTask} onClose={() => setSelectedTask(null)} />}
    {selectedTool && <WorkbenchDialog title={selectedTool.name} labelId="wb-tool-title" onClose={() => setSelectedTool(null)}><div className="wb-dialog-body"><p className="wb-dialog-lead">{selectedTool.scope}</p><dl className="wb-tool-facts"><div><dt>Registry identifier</dt><dd>{selectedTool.id}</dd></div><div><dt>Catalog layer</dt><dd>{selectedTool.layer}</dd></div><div><dt>Recorded state</dt><dd>{selectedTool.status.replaceAll('_', ' ').toLowerCase()}</dd></div><div><dt>Probe recorded in snapshot</dt><dd>{selectedTool.probed ? 'Yes — inspect the recorded scope above' : 'No'}</dd></div></dl><p className="wb-catalog-note">This is a frozen catalog record, not a live connection check. The destination task must verify access, version, and suitability before use.</p>{'docsUrl' in selectedTool && typeof selectedTool.docsUrl === 'string' && <a className="wb-button" href={selectedTool.docsUrl} target="_blank" rel="noopener noreferrer">Open official documentation<ExternalLink size={16} /></a>}<h3 className="wb-related-heading">Use in a research task</h3><div className="wb-related-tasks">{relevantTasks.map(task => <button className="wb-related-task" key={task.id} onClick={() => { setSelectedTool(null); setSelectedTask(task) }}><ClipboardList size={19} /><span>{task.title}</span><ArrowRight size={17} /></button>)}{!relevantTasks.length && <p className="wb-catalog-note">No configured scientific starter uses this inherited catalog entry.</p>}</div></div></WorkbenchDialog>}
  </div>
}
