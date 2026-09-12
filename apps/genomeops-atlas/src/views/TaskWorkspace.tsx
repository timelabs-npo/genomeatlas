import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowDownToLine, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, ClipboardList, Copy, ExternalLink, FileCheck2, FileText, FolderOpen, MessageSquare, Plus, Trash2, Upload, Wrench } from 'lucide-react'
import { composeHandoff, copyHandoff, defaultHandoffOptions, destinations, personaOptions, roleOptions, toneOptions, toolCatalog, type StarterTask } from '../lib/workbench'
import { inspectGenomeSelection, publishedPilotAccessions, useUserInputs } from '../lib/userInputs'
import { inspectArtifact, type InspectedArtifact } from '../lib/workflowPreflight'
import { buildTaskTemplate, taskInputReport, workspaceRecipes } from '../lib/taskWorkspace'

type WorkspaceTab = 'prepare' | 'tools' | 'handoff' | 'evidence'
type HandoffOptions = Parameters<typeof composeHandoff>[0]
const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof FileText }> = [
  { id: 'prepare', label: 'Prepare inputs', icon: FolderOpen },
  { id: 'tools', label: 'Toolset', icon: Wrench },
  { id: 'handoff', label: 'Run in chat', icon: MessageSquare },
  { id: 'evidence', label: 'Evidence checklist', icon: FileCheck2 },
]
const saveText = (name: string, text: string, type = 'text/plain') => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function TaskWorkspace({ task, onBack, onOpenInputs, onOpenTools, onOpenEvidence }: {
  task: StarterTask; onBack: () => void; onOpenInputs: () => void; onOpenTools: () => void; onOpenEvidence: () => void
}) {
  const { inputs, setInput, toggleTool } = useUserInputs()
  const [tab, setTab] = useState<WorkspaceTab>('prepare')
  const [artifacts, setArtifacts] = useState<InspectedArtifact[]>([])
  const [fileState, setFileState] = useState<'idle' | 'reading'>('idle')
  const [fileError, setFileError] = useState('')
  const [options, setOptions] = useState<HandoffOptions>(() => ({ ...defaultHandoffOptions, taskId: task.id }))
  const [inspection, setInspection] = useState<{ key: string; value: ReturnType<typeof taskInputReport> } | null>(null)
  const [copyStatus, setCopyStatus] = useState<{ text: string; phase: 'busy' | 'copied' | 'error' } | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const operation = useRef(0)
  const readOperation = useRef(0)
  useEffect(() => () => { operation.current += 1; readOperation.current += 1 }, [])
  const selection = inspectGenomeSelection(inputs.accessionsText)
  const recipe = workspaceRecipes[task.chainId]
  const sourceKey = JSON.stringify([inputs, artifacts.map(file => file.id)])
  const report = inspection?.key === sourceKey ? inspection.value : null
  const prepared = useMemo(() => {
    try {
      const selectedAccessions = inspectGenomeSelection(inputs.accessionsText)
      if (!selectedAccessions.valid) throw new Error(selectedAccessions.error || 'Choose your genome scope in Your inputs before preparing a brief.')
      const handoff = composeHandoff({ ...options, context: inputs.contextText, accessions: selectedAccessions.accessions, toolIds: inputs.selectedToolIds })
      const prompt = [handoff.prompt, '', 'LOCAL PREPARATION RECORD:', report ? JSON.stringify(report, null, 2) : 'No current local inspection has been run. Inspect the supplied inputs before execution.', '', `SHARED SEQUENCE TOPOLOGY: ${inputs.topology}`, 'SHARED SEQUENCE:', inputs.sequenceText.trim() ? 'A sequence is present in the browser workspace. It is NOT embedded in this prompt or uploaded. Attach the original sequence file in the execution workspace if required.' : 'No sequence supplied in the shared browser workspace.'].join('\n')
      return { handoff, prompt, error: '' }
    } catch (error) { return { handoff: null, prompt: '', error: error instanceof Error ? error.message : 'Check your task inputs.' } }
  }, [options, inputs.accessionsText, inputs.contextText, inputs.selectedToolIds, inputs.sequenceText, inputs.topology, report])
  const destination = destinations.find(item => item.id === options.destinationId) ?? destinations[0]
  const activeCopy = copyStatus?.text === prepared.prompt ? copyStatus.phase : null
  const recommended = task.toolIds.flatMap(id => { const tool = toolCatalog.find(item => item.id === id); return tool ? [tool] : [] })
  const selected = inputs.selectedToolIds.flatMap(id => { const tool = toolCatalog.find(item => item.id === id); return tool ? [tool] : [] })

  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const current = ++readOperation.current
    setFileState('reading'); setFileError('')
    const next: InspectedArtifact[] = []
    const errors: string[] = []
    for (const file of Array.from(files)) {
      try {
        if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: choose a text artifact smaller than 20 MB.`)
        next.push(await inspectArtifact(file.name, await file.arrayBuffer()))
      } catch (error) { errors.push(error instanceof Error ? error.message : `Could not read ${file.name}.`) }
    }
    if (readOperation.current !== current) return
    setArtifacts(previous => [...previous, ...next.filter(file => !previous.some(existing => existing.id === file.id))])
    setFileError(errors.join(' ')); setFileState('idle')
    if (fileInput.current) fileInput.current.value = ''
  }
  const inspect = () => {
    if (!selection.valid) { onOpenInputs(); return }
    setInspection({ key: sourceKey, value: taskInputReport(task, inputs.accessionsText, artifacts) })
  }
  const copy = async () => {
    if (!prepared.handoff) return
    const current = ++operation.current
    const text = prepared.prompt
    setCopyStatus({ text, phase: 'busy' })
    try { await copyHandoff(text); if (operation.current === current) setCopyStatus({ text, phase: 'copied' }) }
    catch { if (operation.current === current) { setCopyStatus({ text, phase: 'error' }); setShowPrompt(true) } }
  }
  const downloadTemplate = () => {
    if (!selection.valid) { onOpenInputs(); return }
    const template = buildTaskTemplate(task, inputs.accessionsText)
    saveText(template.filename, template.text, 'text/tab-separated-values')
  }
  return <section className="wb-task-workspace" aria-label={`${task.title} workspace`}>
    <header className="wb-page-header wb-workspace-header"><button className="wb-text-button wb-back" onClick={onBack}><ArrowLeft size={16} />Task library</button><h1>{task.title}</h1><p>{recipe.purpose}</p></header>
    <div className="wb-workspace-scope"><div><ClipboardList size={20} /><span>{selection.valid ? `${selection.accessions.length} exact ${selection.accessions.length === 1 ? 'genome' : 'genomes'} selected` : 'Genome scope needs your input'}</span></div><button className="wb-text-button" onClick={onOpenInputs}>Edit shared inputs<ArrowRight size={16} /></button></div>
    <div className="wb-workspace-tabs" role="tablist" aria-label="Task workspace views">{tabs.map(({ id, label, icon: Icon }) => <button key={id} role="tab" id={`workspace-tab-${id}`} aria-selected={tab === id} aria-controls={`workspace-panel-${id}`} tabIndex={tab === id ? 0 : -1} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const index = tabs.findIndex(item => item.id === tab); const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].id; setTab(next); document.getElementById(`workspace-tab-${next}`)?.focus() } }}><Icon size={18} />{label}{id === 'tools' && selected.length > 0 && <span className="wb-tab-count">{selected.length}</span>}</button>)}</div>
    <div className="wb-workspace-panel" role="tabpanel" id={`workspace-panel-${tab}`} aria-labelledby={`workspace-tab-${tab}`}>
      {tab === 'prepare' && <>
        <div className="wb-workspace-prepare"><div className="wb-workspace-primary">
          <h2>Your preparation path</h2><ol className="wb-preparation-steps">{recipe.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
          {!selection.valid ? <div className="wb-preparation-empty"><DatabaseIcon /><div><h3>Set an exact genome scope</h3><p>{selection.error || 'Start with your own accessions or explicitly load the published three-genome pilot.'}</p><div className="wb-inline-actions"><button className="wb-button wb-primary" onClick={onOpenInputs}>Choose genomes</button><button className="wb-button" onClick={() => setInput('accessionsText', publishedPilotAccessions.join('\n'))}>Load published pilot</button></div></div></div> : <div className="wb-selected-accessions"><CheckCircle2 size={18} /><div><strong>Selection matches the frozen panel</strong><p>{selection.accessions.join(' · ')}</p><small>This verifies accession syntax and membership, not genome quality or taxonomy.</small></div></div>}
          <div className="wb-local-artifacts"><div className="wb-section-heading"><h3>Inspect your source files</h3><button className="wb-text-button" onClick={() => fileInput.current?.click()} disabled={fileState === 'reading'}><Plus size={16} />Add files</button></div><input ref={fileInput} type="file" multiple accept={recipe.accepted} onChange={event => void readFiles(event.target.files)} className="sr-only" tabIndex={-1} aria-label="Task source files" />
            {!artifacts.length ? <button className="wb-file-drop" onClick={() => fileInput.current?.click()} disabled={fileState === 'reading'}><Upload size={25} /><strong>{fileState === 'reading' ? 'Inspecting local files…' : 'Choose task source files'}</strong><span>Read text structure and SHA-256 hashes locally. Up to20 MB per file.</span></button> : <div className="wb-artifact-list">{artifacts.map(file => <article key={file.id}><FileText size={21} /><div><h4>{file.name}</h4><p>{file.format} · {file.bytes.toLocaleString()} bytes · {file.records === null ? 'text inspected' : `${file.records} records`}</p><code title={file.sha256}>{file.sha256}</code>{file.errors.length > 0 && <p className="wb-artifact-errors">{file.errors.join(' ')}</p>}</div><button className="wb-icon-button" onClick={() => setArtifacts(current => current.filter(item => item.id !== file.id))} aria-label={`Remove ${file.name}`}><Trash2 size={16} /></button></article>)}</div>}
            {fileError && <p className="wb-input-error" role="alert">{fileError}</p>}<p className="wb-field-help">Files stay in this task workspace. They are not uploaded or attached to a chat automatically.</p>
          </div>
          <div className="wb-preparation-actions"><button className="wb-button wb-primary" onClick={inspect} disabled={fileState === 'reading'}><FileCheck2 size={18} />{recipe.action}</button><button className="wb-button" onClick={downloadTemplate}><ArrowDownToLine size={17} />Download working template</button></div>
          {report && <div className={`wb-inspection-result${report.fileStructure === 'FAIL' ? ' has-errors' : ''}`} role="status"><h3>{report.fileStructure === 'FAIL' ? <AlertCircle size={18} /> : <FileCheck2 size={18} />}{report.fileStructure === 'FAIL' ? 'Input structure needs attention' : 'Local preparation check recorded'}</h3><p>{report.genomeAccessions.length} accession(s) matched; {report.artifacts.length} file(s) inspected. File structure: <strong>{report.fileStructure}</strong>. {report.artifacts.filter(file => file.errors.length).length > 0 ? `${report.artifacts.filter(file => file.errors.length).length} file(s) have structural errors. ` : ''}Required-input completeness remains unverified. No analysis was run.</p><div className="wb-inline-actions"><button className="wb-text-button" onClick={() => saveText(`${task.id}-preparation.json`, JSON.stringify(report, null, 2), 'application/json')}><ArrowDownToLine size={16} />Download inspection receipt</button><button className="wb-text-button" onClick={() => setTab('handoff')}>Prepare a chat brief<ArrowRight size={16} /></button></div></div>}
        </div><aside className="wb-workspace-guidance"><h3>What this task needs</h3><ul>{task.inputs.map(input => <li key={input}>{input}</li>)}</ul><h3>Source-file checklist</h3>{recipe.requirements.length ? <ul className="wb-prerequisite-list">{recipe.requirements.map(requirement => { const matches = artifacts.filter(file => requirement.match.test(file.name)); return <li key={requirement.label}>{matches.length ? <Check size={16} /> : <Circle size={14} />}<span>{requirement.label}<small>{matches.length ? `${matches.length} filename candidate(s); review required` : 'Not supplied here'}</small></span></li> })}</ul> : <p>The accession selection is the input for this preparation step. Metadata and biological inclusion decisions still need review.</p>}<h3>Recommended capabilities</h3><div className="wb-guidance-tools">{recommended.map(tool => <button key={tool.id} onClick={() => setTab('tools')}>{tool.name}<ArrowRight size={13} /></button>)}</div></aside></div>
      </>}
      {tab === 'tools' && <div className="wb-task-tools"><div className="wb-section-heading"><div><h2>Build this task’s toolset</h2><p>Choose the capabilities the execution workspace should check.</p></div><button className="wb-button" onClick={() => setInput('selectedToolIds', [...inputs.selectedToolIds, ...task.toolIds])}><Plus size={16} />Add recommended tools</button></div><div className="wb-workspace-tool-list">{recommended.map(tool => <article key={tool.id}><div className="wb-tool-purpose"><h3>{tool.name}</h3><p>{tool.label}</p><small>{tool.status.replaceAll('_', ' ').toLowerCase()} · historical catalog record</small></div><div className="wb-tool-actions">{tool.docsUrl && <a className="wb-text-button" href={tool.docsUrl} target="_blank" rel="noopener noreferrer">Official documentation<ExternalLink size={14} /></a>}<button className={`wb-button${inputs.selectedToolIds.includes(tool.id) ? ' is-selected' : ''}`} onClick={() => toggleTool(tool.id)} aria-pressed={inputs.selectedToolIds.includes(tool.id)}>{inputs.selectedToolIds.includes(tool.id) ? <Check size={16} /> : <Plus size={16} />}{inputs.selectedToolIds.includes(tool.id) ? 'In your toolset' : 'Add to toolset'}</button></div></article>)}</div><div className="wb-selected-toolset"><h3>Your shared toolset</h3>{selected.length ? <div className="wb-selected-tool-chips">{selected.map(tool => <button key={tool.id} onClick={() => toggleTool(tool.id)} aria-label={`Remove ${tool.name} from toolset`}>{tool.name}<Trash2 size={13} /></button>)}</div> : <p>No tools selected yet. Add capabilities above or browse the full library.</p>}<button className="wb-text-button" onClick={onOpenTools}>Browse scientific tools<ArrowRight size={16} /></button></div><p className="wb-library-note">Selecting a capability adds its catalog reference to your brief. It does not enable a plugin, grant access, or run an analysis.</p></div>}
      {tab === 'handoff' && <div className="wb-full-handoff"><div className="wb-form-section"><h2>Configure your research partner</h2><p>These choices travel in your prompt. They do not change account or model settings.</p><div className="wb-field-grid"><label>Destination<select value={options.destinationId} onChange={event => setOptions(current => ({ ...current, destinationId: event.target.value as HandoffOptions['destinationId'] }))}>{destinations.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label>Role<select value={options.roleId} onChange={event => setOptions(current => ({ ...current, roleId: event.target.value as HandoffOptions['roleId'] }))}>{roleOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label>Tone & mood<select value={options.toneId} onChange={event => setOptions(current => ({ ...current, toneId: event.target.value as HandoffOptions['toneId'] }))}>{toneOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label>Working character<select value={options.personaId} onChange={event => setOptions(current => ({ ...current, personaId: event.target.value as HandoffOptions['personaId'] }))}>{personaOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label></div></div><div className="wb-shared-brief-inputs"><h3>Included from Your inputs</h3><dl><div><dt>Genome scope</dt><dd>{selection.valid ? selection.accessions.join(', ') : 'Not selected'}</dd></div><div><dt>Research context</dt><dd>{inputs.contextText.trim() || 'No context supplied'}</dd></div><div><dt>Toolset</dt><dd>{selected.map(tool => tool.name).join(', ') || 'No tools selected'}</dd></div></dl><button className="wb-text-button" onClick={onOpenInputs}>Edit shared inputs<ArrowRight size={16} /></button></div>{prepared.error && <p className="wb-input-error" role="alert">{prepared.error}</p>}<div className="wb-launch-panel"><MessageSquare size={22} /><div><h3>{destination.label}</h3><p>{destination.instruction}</p></div></div><div className="wb-handoff-actions"><button className="wb-button wb-primary" onClick={copy} disabled={!prepared.handoff || activeCopy === 'busy'}>{activeCopy === 'copied' ? <Check size={17} /> : <Copy size={17} />}{activeCopy === 'busy' ? 'Copying…' : activeCopy === 'copied' ? 'Prompt copied' : 'Copy prompt'}</button><a className="wb-button" href={destination.url} target="_blank" rel="noopener noreferrer">{destination.launchLabel}<ExternalLink size={16} /></a><button className="wb-button wb-download" disabled={!prepared.handoff} onClick={() => saveText(`${task.id}-prompt.md`, prepared.prompt, 'text/markdown')}><ArrowDownToLine size={17} />Download prompt</button></div><p className="wb-copy-status" role="status">{activeCopy === 'copied' ? 'Copied. Open your destination and paste the prepared brief.' : activeCopy === 'error' ? 'Clipboard access failed. Select the prompt below or download it.' : 'Review the prepared brief before copying it into the destination.'}</p><button className="wb-text-button wb-preview-toggle" disabled={!prepared.handoff} onClick={() => setShowPrompt(!showPrompt)} aria-expanded={showPrompt}>{showPrompt ? 'Hide prepared prompt' : 'Review prepared prompt'}</button>{showPrompt && prepared.handoff && <div className="wb-prompt-preview"><label htmlFor="wb-prepared-prompt">Prepared prompt</label><textarea id="wb-prepared-prompt" readOnly value={prepared.prompt} rows={20} onFocus={event => event.currentTarget.select()} /><button className="wb-text-button" onClick={() => saveText(`${task.id}-task-request.json`, JSON.stringify(prepared.handoff?.payload, null, 2), 'application/json')}><ArrowDownToLine size={16} />Download automation request</button></div>}</div>}
      {tab === 'evidence' && <div className="wb-task-evidence"><div className="wb-section-heading"><div><h2>What a completed task must bring back</h2><p>These are acceptance requirements, not results generated by this page.</p></div><button className="wb-button" onClick={onOpenEvidence}>Inspect published evidence<ArrowRight size={16} /></button></div><div className="wb-output-checklist">{task.outputs.map(output => <div key={output}><Circle size={17} /><span>{output}</span><small>Required for review</small></div>)}</div><h3>Scientific acceptance gates</h3><ul className="wb-acceptance-gates">{task.gates.map(gate => <li key={gate}><FileCheck2 size={18} /><p>{gate}</p></li>)}</ul><div className="wb-evidence-boundary"><strong>No scientific result is implied by preparation.</strong><p>Local file inspection checks structure and exact bytes. The execution workspace must produce the requested outputs, preserve failed and unknown states, and independently review the biological interpretation.</p></div></div>}
    </div>
  </section>
}

function DatabaseIcon() { return <ClipboardList size={28} aria-hidden="true" /> }
