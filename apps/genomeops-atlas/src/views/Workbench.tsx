import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Circle, ClipboardList, Database, Dna, ExternalLink, FileCheck2, FileSearch, FileText, GitBranch, Globe2, Home, Image, Menu, Network, Plus, Search, Shield, Sparkles, Wrench, X } from 'lucide-react'
import { WorkbenchDialog } from '../components/WorkbenchDialog'
import { searchTools, starterTasks, toolCatalog, toolLayers, toolStatuses, type CatalogTool, type StarterTask } from '../lib/workbench'
import { UserInputsPanel } from '../components/UserInputsPanel'
import { inspectGenomeSelection, useUserInputs } from '../lib/userInputs'
import { TaskWorkspace } from './TaskWorkspace'
import { EvidenceLibrary } from './EvidenceLibrary'
import { PlasmidSandboxView } from './PlasmidSandboxView'
import { WorkflowDispatcher } from './WorkflowDispatcher'

type Section = 'home' | 'tasks' | 'tools' | 'evidence' | 'plasmid' | 'dispatcher'
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
const taskFromHash = () => new URLSearchParams(window.location.hash.slice(1)).get('task')

function TaskCard({ task, onSelect }: { task: StarterTask; onSelect: (task: StarterTask) => void }) {
  const visual = taskVisuals[task.chainId] ?? taskVisuals.panel
  const Icon = visual.icon
  return <button className="wb-task-card" onClick={() => onSelect(task)} style={{ '--task-accent': visual.color } as CSSProperties}>
    <Icon className="wb-task-icon" size={34} strokeWidth={1.65} aria-hidden="true" />
    <span><span className="wb-task-category">{visual.category}</span><span className="wb-task-summary">{task.summary}</span></span>
    <ArrowRight className="wb-card-arrow" size={17} aria-hidden="true" />
  </button>
}

function ToolRow({ tool, onSelect, selected, onToggle }: { tool: CatalogTool; onSelect: (tool: CatalogTool) => void; selected: boolean; onToggle: () => void }) {
  const key = `${tool.id} ${tool.name}`.toLowerCase()
  const Icon = /ncbi|dataset|database/.test(key) ? Database : /tree|phylo/.test(key) ? GitBranch : /defense|rebase/.test(key) ? Shield : /literature|pubmed/.test(key) ? BookOpen : /genom|sequence|protein/.test(key) ? Dna : Wrench
  const color = /ncbi|dataset/.test(key) ? '#81b6ff' : /iq/.test(key) ? '#c8a2f3' : /defense/.test(key) ? '#f3b171' : '#98e7c9'
  return <div className="wb-tool-row">
    <div className="wb-tool-icon" style={{ color, background: `${color}0d` }}><Icon size={26} strokeWidth={1.7} aria-hidden="true" /></div>
    <div className="wb-tool-copy"><h3>{tool.name}</h3><p>{tool.label || tool.scope}</p></div>
    <div className="wb-tool-row-actions"><button className="wb-button wb-button-small" onClick={() => onSelect(tool)} aria-label={`View ${tool.name}`}>View</button><button className={`wb-toolset-toggle${selected ? ' is-selected' : ''}`} onClick={onToggle} aria-label={`${selected ? 'Remove' : 'Add'} ${tool.name} ${selected ? 'from' : 'to'} toolset`} aria-pressed={selected}>{selected ? <Check size={16} /> : <Plus size={16} />}</button></div>
  </div>
}

export function Workbench({ onOpenAtlas, onOpenGuide }: { onOpenAtlas: () => void; onOpenGuide: () => void }) {
  const { inputs, toggleTool } = useUserInputs()
  const [section, setSection] = useState<Section>(sectionFromHash)
  const [activeTaskId, setActiveTaskId] = useState(taskFromHash)
  const [inputsOpen, setInputsOpen] = useState(Boolean(taskFromHash()))
  const [mobileNavigation, setMobileNavigation] = useState(false)
  const [query, setQuery] = useState('')
  const [layer, setLayer] = useState('all')
  const [status, setStatus] = useState('all')
  const [fullRegistry, setFullRegistry] = useState(false)
  const [selectedTool, setSelectedTool] = useState<CatalogTool | null>(null)
  useEffect(() => { const readSection = () => { setSection(sectionFromHash()); setActiveTaskId(taskFromHash()); setMobileNavigation(false) }; window.addEventListener('hashchange', readSection); return () => window.removeEventListener('hashchange', readSection) }, [])
  const navigate = (id: Section) => { setSection(id); setActiveTaskId(null); setQuery(''); setMobileNavigation(false); if (id === 'plasmid') setInputsOpen(true); window.location.hash = `section=${id}`; window.scrollTo({ top: 0 }) }
  const openTask = (task: StarterTask) => { setSection('tasks'); setActiveTaskId(task.id); setSelectedTool(null); setInputsOpen(true); setMobileNavigation(false); window.location.hash = `section=tasks&task=${task.id}`; window.scrollTo({ top: 0 }) }
  const activeTask = section === 'tasks' ? starterTasks.find(task => task.id === activeTaskId) : undefined
  const selection = inspectGenomeSelection(inputs.accessionsText)
  const featured = featuredChains.flatMap(id => starterTasks.filter(task => task.chainId === id)).slice(0, 6)
  const featuredCatalog = featuredTools.flatMap(key => { const match = toolCatalog.find(tool => `${tool.id} ${tool.name}`.toLowerCase().includes(key.toLowerCase())); return match ? [match] : [] })
  const filteredTasks = starterTasks.filter(task => `${task.title} ${task.summary} ${task.category} ${task.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const filteredTools = searchTools(query, layer, status).filter(tool => fullRegistry || tool.relevant)
  const activeLabel = navigation.find(item => item.id === section)?.label ?? 'Workbench'
  const relevantTasks = selectedTool ? starterTasks.filter(task => task.toolIds.includes(selectedTool.id)) : []
  return <div className={`wb-shell${inputsOpen ? ' wb-inputs-open' : ''}`}>
    <a className="wb-skip-link" href="#wb-main" onClick={event => { event.preventDefault(); const main = document.getElementById('wb-main'); main?.focus(); main?.scrollIntoView() }}>Skip to content</a>
    <header className="wb-mobile-header"><button className="wb-mobile-brand" onClick={() => navigate('home')}><Dna size={26} />GenomeAtlas</button><button className="wb-icon-button" onClick={() => setMobileNavigation(!mobileNavigation)} aria-label={mobileNavigation ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavigation}>{mobileNavigation ? <X size={23} /> : <Menu size={23} />}</button></header>
    {mobileNavigation && <button className="wb-nav-scrim" onClick={() => setMobileNavigation(false)} aria-label="Close navigation overlay" />}
    <aside className={`wb-sidebar${mobileNavigation ? ' is-open' : ''}`}>
      <button className="wb-brand" onClick={() => navigate('home')} aria-label="GenomeAtlas Workbench home"><Dna size={40} strokeWidth={1.6} /><span><strong>GenomeAtlas</strong><span>Workbench</span></span></button>
      <nav aria-label="Workbench navigation">{navigation.map(({ id, label, icon: Icon }) => <button key={id} className={`wb-nav-item${section === id ? ' is-active' : ''}`} onClick={() => navigate(id)} aria-current={section === id ? 'page' : undefined}><Icon size={22} strokeWidth={1.6} /><span>{label}</span></button>)}</nav>
      <div className="wb-sidebar-bottom"><div className="wb-more-label">From the research atlas</div><button className="wb-secondary-nav" onClick={onOpenAtlas}><Dna size={18} />Explore original atlas<ArrowRight size={15} /></button><button className="wb-secondary-nav" onClick={onOpenGuide}><Sparkles size={18} />Everyday task guide<ArrowRight size={15} /></button><a className="wb-source-link" href="https://github.com/timelabs-npo/genomeatlas" target="_blank" rel="noopener noreferrer"><Globe2 size={23} strokeWidth={1.6} /><span>GenomeAtlas<small>A canonical research source</small></span><ExternalLink size={14} /></a></div>
    </aside>
    <main id="wb-main" className={`wb-main${section === 'home' ? ' wb-home' : ''}`} tabIndex={-1}>
      <div className="wb-global-toolbar"><span>{selection.valid ? `${selection.accessions.length} selected genomes` : 'Your research workspace'}{inputs.selectedToolIds.length ? ` · ${inputs.selectedToolIds.length} tools in your set` : ''}</span><button className="wb-button wb-inputs-toggle" onClick={() => setInputsOpen(!inputsOpen)} aria-expanded={inputsOpen}><ClipboardList size={17} />Your inputs</button></div>
      {activeTask ? <TaskWorkspace key={activeTask.id} task={activeTask} onBack={() => navigate('tasks')} onOpenInputs={() => setInputsOpen(true)} onOpenTools={() => navigate('tools')} onOpenEvidence={() => navigate('evidence')} /> : section === 'home' ? <>
        <header className="wb-welcome"><Dna size={52} strokeWidth={1.55} /><h1>GenomeAtlas Workbench</h1><p>A clear starting point for your next research task.</p></header>
        <section className="wb-section" aria-labelledby="wb-starters"><div className="wb-section-heading"><h2 id="wb-starters">Start a research task</h2><button className="wb-text-button" onClick={() => navigate('tasks')}>View all tasks<ArrowRight size={17} /></button></div><div className="wb-task-grid">{featured.map(task => <TaskCard key={task.id} task={task} onSelect={openTask} />)}</div></section>
        <section className="wb-section wb-home-tools" aria-labelledby="wb-tools"><div className="wb-section-heading"><h2 id="wb-tools">Scientific tools</h2><button className="wb-text-button" onClick={() => navigate('tools')}>Browse library<ArrowRight size={17} /></button></div><div className="wb-tool-grid">{featuredCatalog.map(tool => <ToolRow key={tool.id} tool={tool} onSelect={setSelectedTool} selected={inputs.selectedToolIds.includes(tool.id)} onToggle={() => toggleTool(tool.id)} />)}</div></section>
        <section className="wb-proof-invitation"><FileCheck2 size={24} /><div><h2>See what the evidence supports</h2><p>Inspect real pilot outputs, source accessions, checksums, and the limits of each result.</p></div><button className="wb-text-button" onClick={() => navigate('evidence')}>Open evidence<ArrowRight size={17} /></button></section>
      </> : <>
        {section !== 'plasmid' && section !== 'dispatcher' && <header className="wb-page-header"><button className="wb-text-button wb-back" onClick={() => navigate('home')}><ArrowLeft size={16} />Workbench</button><h1>{activeLabel}</h1><p>{section === 'tasks' ? 'Start with a precise question. Leave with a prompt, an input contract, and a clear evidence standard.' : section === 'tools' ? 'Find the right capability and inspect what is known about its availability.' : section === 'evidence' ? 'Trace a result back to its inputs, execution, and limitations.' : section === 'plasmid' ? 'Explore a local sequence scan with its assumptions in view.' : 'Prepare a strict prompt or an automation request from the frozen project contracts.'}</p></header>}
        {section === 'tasks' && <><div className="wb-library-toolbar"><label className="wb-search"><Search size={20} /><input aria-label="Search task library" placeholder="Search tasks, outputs, or research areas" value={query} onChange={event => setQuery(event.target.value)} /></label><span className="wb-result-count">{filteredTasks.length} tasks</span></div><div className="wb-task-pipeline">{[
          { title: 'Prepare', description: 'Choose the exact inputs and preserve their origin.', chains: ['panel', 'download'] },
          { title: 'Analyze', description: 'Build the host tree and inspect defense systems independently.', chains: ['markers', 'tree', 'rm'] },
          { title: 'Review & communicate', description: 'Connect claims, figures and releases to inspectable evidence.', chains: ['evidence', 'figure', 'release'] },
        ].map(group => { const tasks = filteredTasks.filter(task => group.chains.includes(task.chainId)); return tasks.length > 0 && <section className="wb-task-stage-group" key={group.title}><header><h2>{group.title}</h2><p>{group.description}</p></header><div>{tasks.map(task => { const visual = taskVisuals[task.chainId]; const Icon = visual.icon; return <article className="wb-pipeline-task" key={task.id}><div className="wb-pipeline-step" style={{ color: visual.color }}><span>{String(starterTasks.indexOf(task) + 1).padStart(2, '0')}</span><Icon size={23} strokeWidth={1.5} /></div><div className="wb-pipeline-purpose"><h3>{task.title}</h3><p>{task.summary}</p><dl><div><dt>Bring</dt><dd>{task.inputs[0]}</dd></div><div><dt>Work toward</dt><dd>{task.outputs[0]}</dd></div></dl></div><button className="wb-button" onClick={() => openTask(task)} aria-label={`Open ${task.title} workspace`}>Open workspace<ArrowRight size={16} /></button></article> })}</div></section> })}</div>{!filteredTasks.length && <div className="wb-empty"><Search size={30} /><h2>No matching task</h2><p>Try a broader term such as “genome”, “tree”, or “evidence”.</p><button className="wb-button" onClick={() => setQuery('')}>Clear search</button></div>}<p className="wb-library-note">Every starter is tied to a GenomeAtlas workflow. A prepared request is a draft; execution and scientific review happen in your selected workspace.</p></>}
        {section === 'tools' && <><div className="wb-tools-purpose"><Wrench size={23} /><div><h2>Choose a capability, then put it to work</h2><p>Read its purpose, open the official source, and add it to the toolset shared by your research tasks.</p></div></div><div className="wb-library-toolbar"><label className="wb-search"><Search size={20} /><input aria-label="Search scientific tools" placeholder="Search tools, sources, or capabilities" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="wb-filter"><span>Layer</span><select value={layer} onChange={event => setLayer(event.target.value)}><option value="all">All layers</option>{toolLayers.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="wb-filter"><span>Snapshot state</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All states</option>{toolStatuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label></div><div className="wb-catalog-context"><p>Frozen catalog metadata is historical. A listed tool is not proof of a live connection or a completed analysis.</p><label><input type="checkbox" checked={fullRegistry} onChange={event => setFullRegistry(event.target.checked)} />Include the full inherited registry</label></div><div className="wb-results-heading"><span>{filteredTools.length} of {toolCatalog.length} catalog entries</span></div><div className="wb-tool-grid wb-full-tool-grid">{filteredTools.map(tool => <ToolRow key={tool.id} tool={tool} onSelect={setSelectedTool} selected={inputs.selectedToolIds.includes(tool.id)} onToggle={() => toggleTool(tool.id)} />)}</div>{!filteredTools.length && <div className="wb-empty"><Search size={30} /><h2>No matching tool</h2><p>Try another search or include the full inherited registry.</p><button className="wb-button" onClick={() => { setQuery(''); setLayer('all'); setStatus('all') }}>Reset filters</button></div>}</>}
        {section === 'evidence' && <EvidenceLibrary />}
        {section === 'plasmid' && <PlasmidSandboxView onOpenTask={taskId => { const task = starterTasks.find(item => item.id === taskId); if (task) openTask(task) }} />}
        {section === 'dispatcher' && <div className="wb-legacy-content"><WorkflowDispatcher onOpenInputs={() => setInputsOpen(true)} /></div>}
      </>}
      <footer className="wb-footer"><span>(c) timelabs-npo 2026, MIT</span><a href="https://github.com/timelabs-npo/genomeatlas" target="_blank" rel="noopener noreferrer">GitHub<ExternalLink size={13} /></a></footer>
    </main>
    <UserInputsPanel open={inputsOpen} onClose={() => setInputsOpen(false)} />
    {selectedTool && <WorkbenchDialog title={selectedTool.name} labelId="wb-tool-title" onClose={() => setSelectedTool(null)}><div className="wb-dialog-body"><p className="wb-dialog-lead">{selectedTool.label}</p><div className="wb-tool-use-actions"><button className={`wb-button wb-primary${inputs.selectedToolIds.includes(selectedTool.id) ? ' is-selected' : ''}`} onClick={() => toggleTool(selectedTool.id)} aria-pressed={inputs.selectedToolIds.includes(selectedTool.id)}>{inputs.selectedToolIds.includes(selectedTool.id) ? <Check size={17} /> : <Plus size={17} />}{inputs.selectedToolIds.includes(selectedTool.id) ? 'In your toolset — remove' : 'Add to your toolset'}</button><p>Your selected capabilities are included in task briefs. Access and execution are checked in the destination.</p></div><p className="wb-tool-record-scope">{selectedTool.scope}</p><dl className="wb-tool-facts"><div><dt>Registry identifier</dt><dd>{selectedTool.id}</dd></div><div><dt>Catalog layer</dt><dd>{selectedTool.layer}</dd></div><div><dt>Recorded state</dt><dd>{selectedTool.status.replaceAll('_', ' ').toLowerCase()}</dd></div><div><dt>Probe recorded in snapshot</dt><dd>{selectedTool.probed ? 'Yes — inspect the recorded scope above' : 'No'}</dd></div></dl><p className="wb-catalog-note">This is a frozen catalog record, not a live connection check. The destination task must verify access, version, and suitability before use.</p>{'docsUrl' in selectedTool && typeof selectedTool.docsUrl === 'string' && <a className="wb-button" href={selectedTool.docsUrl} target="_blank" rel="noopener noreferrer">Open official documentation<ExternalLink size={16} /></a>}<h3 className="wb-related-heading">Use in a research task</h3><div className="wb-related-tasks">{relevantTasks.map(task => <button className="wb-related-task" key={task.id} onClick={() => openTask(task)}><ClipboardList size={19} /><span>{task.title}</span><ArrowRight size={17} /></button>)}{!relevantTasks.length && <p className="wb-catalog-note">No configured scientific starter uses this inherited catalog entry.</p>}</div></div></WorkbenchDialog>}
  </div>
}
