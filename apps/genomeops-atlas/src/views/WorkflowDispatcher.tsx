import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, Clipboard, FileCheck2, FileDown, Fingerprint, FlaskConical, FolderInput, GitBranch, Library, Plus, Trash2 } from 'lucide-react'
import { availableWorkflows, copyWorkflowPrompt, workflowContracts } from '../lib/workflowDispatcher'
import { inspectArtifact, inspectWorkflowInputs, type InspectedArtifact } from '../lib/workflowPreflight'
import { parseGenomeAccessions } from '../lib/workbench'
import { useUserInputs } from '../lib/userInputs'
import { UserInputsPanel } from '../components/UserInputsPanel'
import published from '../data/publishedEvidence.json'
import './workflowDispatcher.css'

type Inspection = Awaited<ReturnType<typeof inspectWorkflowInputs>>
const workflowIcons = [GitBranch, FlaskConical, Library]
function saveText(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function WorkflowDispatcher({ onOpenInputs }: { onOpenInputs?: () => void }) {
  const { inputs } = useUserInputs()
  const [workflow, setWorkflow] = useState(availableWorkflows[0])
  const [localInputsOpen, setLocalInputsOpen] = useState(false)
  const [artifacts, setArtifacts] = useState<InspectedArtifact[]>([])
  const [report, setReport] = useState<{ fingerprint: string; value: Inspection } | null>(null)
  const [busy, setBusy] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [error, setError] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const [preview, setPreview] = useState(false)
  const operation = useRef(0)
  const mounted = useRef(true)
  const { steps, tools, chain } = workflowContracts(workflow)
  const fingerprint = JSON.stringify([workflow.id, inputs, artifacts.map((file) => [file.id, file.source])])
  const current = report?.fingerprint === fingerprint ? report.value : null
  const fingerprintRef = useRef(fingerprint)
  useEffect(() => { fingerprintRef.current = fingerprint; operation.current += 1 }, [fingerprint])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operation.current += 1 } }, [])
  let accessionError = ''
  let accessions: string[] = []
  try { accessions = parseGenomeAccessions(inputs.accessionsText) } catch (cause) { accessionError = cause instanceof Error ? cause.message : 'Check genome accessions.' }
  const openInputs = onOpenInputs ?? (() => setLocalInputsOpen(true))

  async function addFiles(files: File[]) {
    setBusy(true); setError('')
    try {
      for (const file of files) if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: choose a text artifact smaller than 20 MB.`)
      const checked = await Promise.all(files.map(async (file) => inspectArtifact(file.name, await file.arrayBuffer())))
      if (mounted.current) setArtifacts((previous) => [...new Map([...previous, ...checked].map((file) => [file.id, file])).values()])
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not read this file.') }
    finally { if (mounted.current) setBusy(false) }
  }
  async function addPublishedAlignment() {
    setBusy(true); setError('')
    try {
      const recorded = published.files.find((file) => file.name === 'Aligned_SCGs.faa')!
      const response = await fetch(recorded.url, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Published alignment unavailable: HTTP ${response.status}`)
      const file = await inspectArtifact(recorded.name, await response.arrayBuffer(), 'published-pilot')
      if (file.bytes !== recorded.bytes || file.sha256 !== recorded.sha256) throw new Error('Published alignment differs from its recorded SHA-256 or byte length.')
      if (mounted.current) setArtifacts((previous) => [...new Map([...previous, file].map((entry) => [entry.id, entry])).values()])
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not inspect the published alignment.') }
    finally { if (mounted.current) setBusy(false) }
  }
  async function inspect() {
    setInspecting(true); setError(''); setCopyState('idle')
    const startFingerprint = fingerprint
    try {
      const value = await inspectWorkflowInputs(workflow, inputs.accessionsText, inputs.contextText, artifacts, inputs)
      if (mounted.current && fingerprintRef.current === startFingerprint) setReport({ fingerprint: startFingerprint, value })
    } catch (cause) { if (mounted.current && fingerprintRef.current === startFingerprint) setError(cause instanceof Error ? cause.message : 'Input inspection failed.') }
    finally { if (mounted.current) setInspecting(false) }
  }
  async function copy() {
    if (!current) return
    const currentOperation = ++operation.current
    setCopyState('copying')
    try {
      await copyWorkflowPrompt(current.prompt)
      if (mounted.current && operation.current === currentOperation) setCopyState('copied')
    } catch { if (mounted.current && operation.current === currentOperation) setCopyState('error') }
  }

  return <section className="dispatcher-workspace">
    <header className="dp-intro"><span className="dp-eyebrow">Workflow dispatcher</span><h1>Make the next step reproducible.</h1><p>Inspect your inputs, see the missing evidence, and carry a traceable brief into your execution workspace.</p></header>
    <div className="dp-layout">
      <nav className="dp-catalog" aria-label="Workflow catalog">{availableWorkflows.map((item, index) => {
        const Icon = workflowIcons[index]
        return <button key={item.id} className="dp-workflow" type="button" aria-pressed={workflow.id === item.id} onClick={() => { setWorkflow(item); setCopyState('idle'); setError(''); setPreview(false) }}><Icon size={22}/><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><ChevronRight size={16}/></button>
      })}<div className="dp-source-note"><Fingerprint size={20}/><strong>A receipt starts with inputs.</strong><p>Checks below run in this browser. External analysis starts only when you run the brief in your chosen workspace.</p><a href="#section=evidence">Explore the published pilot <ArrowUpRight size={14}/></a></div></nav>
      <div className="dp-bench">
        <header className="dp-bench-heading"><div><span className="dp-eyebrow">{workflow.role === 'VERIFY' ? 'Evidence review' : 'Analysis preparation'}</span><h2>{workflow.title}</h2></div><span className="dp-state">{current ? 'Inputs inspected' : 'Preparing inputs'}</span></header>
        <p className="dp-description">{workflow.description}</p>
        <ol className="dp-chain" aria-label="Required workflow stages">{steps.map((step, index) => <li key={step.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong><small>{step.id === 'panel' && accessions.length ? 'Selection supplied' : 'Execution unverified'}</small></li>)}</ol>
        <section className="dp-section"><div className="dp-section-title"><h3><FolderInput size={19}/> 1. Scope and source files</h3><button className="dp-link-button" onClick={openInputs}>Edit shared inputs <ChevronRight size={15}/></button></div>
          <div className="dp-accessions">{accessions.map((accession) => <span key={accession}><Check size={13}/>{accession}</span>)}{accessionError && <p>{accessionError}</p>}</div>
          <p className="dp-hint">Attach the files you intend to use. SHA-256 identifies their exact bytes; structural checks reveal common input problems. Files stay in this tab.</p>
          <div className="dp-upload"><label className="dp-button"><Plus size={16}/>{busy ? 'Reading files…' : 'Attach text artifacts'}<input aria-label="Attach text artifacts" type="file" multiple disabled={busy} accept=".fasta,.faa,.fa,.fna,.tsv,.txt,.json,.nwk,.tre,.md,.gff,.csv" onChange={(event) => { const files = [...(event.target.files ?? [])]; event.target.value = ''; if (files.length) void addFiles(files) }}/></label><button className="dp-link-button" disabled={busy} onClick={() => void addPublishedAlignment()}>Try the published alignment</button><span className="dp-hint">FASTA · TSV · JSON · text / 20 MB per file</span></div>
          {artifacts.length > 0 && <ul className="dp-files">{artifacts.map((file) => <li key={file.id}><FileCheck2 size={20}/><div><strong>{file.name}</strong><small>{file.format} · {file.bytes.toLocaleString()} bytes · {file.source === 'published-pilot' ? 'Published pilot; manifest matched' : 'User file'}</small><code title={file.sha256}>SHA-256 {file.sha256}</code><ul>{file.findings.map((finding) => <li key={finding}>{finding}</li>)}{file.errors.map((message) => <li className="dp-error" key={message}>{message}</li>)}</ul></div><button className="dp-icon-button" aria-label={`Remove ${file.name}`} onClick={() => setArtifacts((previous) => previous.filter((entry) => entry.id !== file.id))}><Trash2 size={16}/></button></li>)}</ul>}
        </section>
        <section className="dp-section"><h3><FileCheck2 size={19}/> 2. Inspect the handoff</h3><div className="dp-contract"><div><span>Required input</span><p>{chain.input}</p></div><div><span>Reviewable output</span><p>{chain.output}</p></div></div><button className="dp-button dp-primary" disabled={Boolean(accessionError) || busy || inspecting} onClick={() => void inspect()}><Fingerprint size={17}/>{inspecting ? 'Inspecting…' : 'Inspect inputs'}</button><p className="dp-hint">Validates your exact genome selection, records attached-file checks and creates a timestamped local inspection. It does not run the analysis.</p>
          {report && !current && <p className="dp-notice" role="status">Inputs changed. Inspect again to refresh the receipt and brief.</p>}
          {current && <div className="dp-inspection" aria-label="Local input inspection"><div><Check size={17}/><strong>{accessions.length} exact accessions checked</strong><span>Selection matches the frozen panel</span></div><div><Fingerprint size={17}/><strong>{artifacts.length} {artifacts.length === 1 ? 'file' : 'files'} fingerprinted</strong><span>{current.receipt.fileStructureCheck === 'FAIL' ? 'File structure problems need attention' : artifacts.length ? 'Structure inspected; input completeness needs review' : 'No source files attached'}</span></div><div><GitBranch size={17}/><strong>Analysis not run</strong><span>Scientific acceptance has not been assessed</span></div>{current.receipt.accessionComparisons.some((file) => file.observedOutsideSelection.length > 0) && <p className="dp-notice">Some files mention assemblies outside this selection. Review the accession-to-file mapping before execution.</p>}<details><summary>Accession mentions by file</summary>{current.receipt.accessionComparisons.map((file) => <p key={file.fileId}><strong>{file.fileName}</strong><br/>Outside selection: {file.observedOutsideSelection.join(', ') || 'None detected'}<br/>Selected IDs not found in text: {file.selectedNotMentioned.join(', ') || 'None'}<br/>Mention detection does not prove ownership or completeness.</p>)}</details><details><summary>Inspection identity</summary><code>{current.receiptHash}</code><p>{current.receipt.inspectedAt}</p></details></div>}
        </section>
        <section className="dp-section dp-handoff"><h3><Clipboard size={19}/> 3. Carry the work forward</h3><p className="dp-hint">The brief includes your scope, context, contracts and file fingerprints. Copy it, open a workspace, attach the original files and review before starting.</p><div className="dp-actions"><button className="dp-button dp-primary" disabled={!current || copyState === 'copying'} onClick={() => void copy()}><Clipboard size={16}/>{current && copyState === 'copied' ? 'Brief copied' : copyState === 'copying' && current ? 'Copying…' : 'Copy prepared brief'}</button><button className="dp-button" disabled={!current} onClick={() => current && saveText(`${workflow.id}-input-inspection.json`, JSON.stringify(current, null, 2))}><FileDown size={16}/>Download inspection bundle</button>{current && copyState === 'copied' && <a className="dp-button" href="https://chatgpt.com/codex" target="_blank" rel="noreferrer">Open Codex cloud <ArrowUpRight size={15}/></a>}</div><p className="dp-hint">Opening Codex does not choose a repository, upload files or submit a task.</p>
          {copyState === 'error' && <p className="dp-error" role="alert">Could not copy the prompt. Download the inspection bundle or use the selectable preview below.</p>}
          {current && <><button className="dp-link-button" aria-expanded={preview} onClick={() => setPreview(!preview)}>{preview ? 'Hide prepared brief' : 'Review prepared brief'} <ChevronRight size={14}/></button>{preview && <textarea readOnly aria-label="Prepared workflow brief" value={current.prompt} rows={15}/>}</>}
        </section>
        <details className="dp-gates"><summary>Acceptance gate and required tools</summary><p>{chain.gate}</p><ul>{tools.map((tool) => <li key={tool.id}><strong>{tool.id}</strong><span>{tool.status} · historical registry observation</span><p>{tool.scope}</p></li>)}</ul></details>
        {error && <p className="dp-error" role="alert">{error}</p>}
      </div>
    </div>
    {!onOpenInputs && <UserInputsPanel open={localInputsOpen} onClose={() => setLocalInputsOpen(false)}/>}
  </section>
}
