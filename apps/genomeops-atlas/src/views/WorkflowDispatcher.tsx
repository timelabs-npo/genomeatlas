import { useEffect, useRef, useState } from 'react'
import {
  availableWorkflows,
  copyWorkflowPrompt,
  workflowContracts,
  workflowPayload,
  workflowPrompt,
} from '../lib/workflowDispatcher'

export function WorkflowDispatcher() {
  const [selection, setSelection] = useState(() => ({
    workflow: availableWorkflows[0],
    request: workflowPayload(availableWorkflows[0]),
  }))
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const operation = useRef(0)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { workflow, request } = selection
  const { chain } = workflowContracts(workflow)

  useEffect(() => () => {
    operation.current += 1
    clearTimeout(resetTimer.current)
  }, [])

  const selectWorkflow = (next: typeof workflow) => {
    if (next.id === workflow.id) return
    operation.current += 1
    clearTimeout(resetTimer.current)
    setCopyState('idle')
    setSelection({ workflow: next, request: workflowPayload(next) })
  }

  const handlePromptCopy = async () => {
    const currentOperation = ++operation.current
    clearTimeout(resetTimer.current)
    setCopyState('copying')
    try {
      await copyWorkflowPrompt(workflowPrompt(workflow, request))
      if (operation.current !== currentOperation) return
      setCopyState('copied')
      resetTimer.current = setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      if (operation.current === currentOperation) setCopyState('error')
    }
  }

  return (
    <section className="content-view view-stack">
      <header className="view-intro">
        <span className="section-label">Workflow Dispatcher</span>
        <h1>The Librarian</h1>
        <p>Choose a workflow to prepare a strict chat prompt or a local automation request.</p>
      </header>

      <div className="split">
        <div className="view-stack" role="group" aria-label="Workflow catalog">
          {availableWorkflows.map((item) => (
            <button
              key={item.id}
              type="button"
              className="panel workflow-card"
              onClick={() => selectWorkflow(item)}
              aria-pressed={workflow.id === item.id}
            >
              <span className="section-label">Proposed workflow</span>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
            </button>
          ))}
        </div>

        <aside className="panel view-stack" aria-labelledby="workflow-action-title">
          <span className="section-label">Action Panel</span>
          <h2 id="workflow-action-title">{workflow.title}</h2>
          <p>{workflow.description}</p>

          <dl className="view-stack">
            <div className="fact-row"><dt>Required input</dt><dd>{chain.input}</dd></div>
            <div className="fact-row"><dt>Expected output</dt><dd>{chain.output}</dd></div>
            <div className="fact-row"><dt>Acceptance gate</dt><dd>{chain.gate}</dd></div>
          </dl>

          <p className="callout">
            Draft only · {request.genome_accessions.length} genomes from the frozen panel. Input data must be supplied
            before execution. This page does not submit a job or confirm a scientific result.
          </p>
          <div className="actions">
            <button
              type="button"
              className="button primary"
              onClick={handlePromptCopy}
              disabled={copyState === 'copying'}
              aria-live="polite"
            >
              {copyState === 'copied' ? 'Copied! Paste to ChatGPT' : copyState === 'copying' ? 'Copying…' : 'Generate Perfect Prompt'}
            </button>
            <pre className="mono" tabIndex={0} aria-label="Local automation task request">{JSON.stringify(request, null, 2)}</pre>
          </div>
          {copyState === 'error' ? (
            <p className="callout warning" role="alert">Could not copy the prompt. Allow clipboard access in your browser and try again.</p>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
