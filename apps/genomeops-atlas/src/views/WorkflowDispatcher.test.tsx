import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkflowDispatcher } from './WorkflowDispatcher'
import { copyWorkflowPrompt, dispatcherDemoAccessions } from '../lib/workflowDispatcher'
import { UserInputsProvider, useUserInputs } from '../lib/userInputs'

function Controls() {
  const { setInput } = useUserInputs()
  return <><button onClick={() => setInput('accessionsText', dispatcherDemoAccessions.join('\n'))}>Set pilot</button><button onClick={() => setInput('contextText', 'Changed context')}>Change context</button><button onClick={() => setInput('selectedToolIds', ['NCBI_Datasets'])}>Change shared tools</button><button onClick={() => setInput('topology', 'linear')}>Change topology</button><button onClick={() => setInput('sequenceText', 'ACTG')}>Change shared sequence</button></>
}
function setup() { return render(<UserInputsProvider><Controls/><WorkflowDispatcher/></UserInputsProvider>) }
async function inspect() {
  fireEvent.click(screen.getByRole('button', { name: 'Set pilot' }))
  fireEvent.click(screen.getByRole('button', { name: 'Inspect inputs' }))
  await screen.findByText('3 exact accessions checked')
}

describe('WorkflowDispatcher', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>()
  beforeEach(() => { writeText.mockReset().mockResolvedValue(undefined); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } }) })
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('requires shared input selection and produces actual local inspection before handoff', async () => {
    setup()
    expect(screen.getByRole('button', { name: 'Inspect inputs' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copy prepared brief' })).toBeDisabled()
    await inspect()
    expect(screen.getByText('No source files attached')).toBeInTheDocument()
    expect(screen.getByText('Analysis not run')).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy prepared brief' })))
    expect(writeText.mock.calls[0][0]).toContain('"fileStructureCheck": "NOT_TESTED"')
    expect(screen.getByRole('link', { name: 'Open Codex cloud' })).toHaveAttribute('href', 'https://chatgpt.com/codex')
  })
  it('invalidates receipt and copy when shared context or workflow changes', async () => {
    setup(); await inspect()
    fireEvent.click(screen.getByRole('button', { name: 'Change context' }))
    expect(screen.getByRole('button', { name: 'Copy prepared brief' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Inputs changed')
    fireEvent.click(screen.getByRole('button', { name: /R-M Detection/ }))
    expect(screen.getByRole('button', { name: /R-M Detection/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Inspect inputs' }))
    await screen.findByText('3 exact accessions checked')
    fireEvent.click(screen.getByRole('button', { name: 'Review prepared brief' }))
    expect((screen.getByLabelText('Prepared workflow brief') as HTMLTextAreaElement).value).toContain('Changed context')
    expect((screen.getByLabelText('Prepared workflow brief') as HTMLTextAreaElement).value).toContain('"chain_id": "rm"')
  })
  it('reports a clipboard denial and permits retry', async () => {
    writeText.mockRejectedValueOnce(new Error('Denied'))
    setup(); await inspect()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy prepared brief' })))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not copy the prompt')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy prepared brief' })))
    expect(screen.getByRole('button', { name: 'Brief copied' })).toBeInTheDocument()
  })
  it.each([
    ['Change shared tools', '"NCBI_Datasets"'],
    ['Change topology', '"topology": "linear"'],
    ['Change shared sequence', '"rawTextCharacters": 4'],
  ])('invalidates the existing inspection on %s and carries the new state only after reinspection', async (control, expected) => {
    setup(); await inspect()
    fireEvent.click(screen.getByRole('button', { name: control }))
    expect(screen.getByRole('button', { name: 'Copy prepared brief' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Inputs changed')
    fireEvent.click(screen.getByRole('button', { name: 'Inspect inputs' }))
    await screen.findByText('3 exact accessions checked')
    fireEvent.click(screen.getByRole('button', { name: 'Review prepared brief' }))
    expect((screen.getByLabelText('Prepared workflow brief') as HTMLTextAreaElement).value).toContain(expected)
  })
  it('does not accept an inspection that finishes after shared inputs changed', async () => {
    const digest = crypto.subtle.digest.bind(crypto.subtle)
    let finish!: () => Promise<void>
    vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce((algorithm, data) => new Promise(resolve => {
      finish = async () => resolve(await digest(algorithm, data))
    }))
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Set pilot' }))
    fireEvent.click(screen.getByRole('button', { name: 'Inspect inputs' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change topology' }))
    await act(async () => finish())
    expect(screen.queryByText('3 exact accessions checked')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy prepared brief' })).toBeDisabled()
  })
  it('does not show copied success after a shared tool edit overtakes clipboard writing', async () => {
    let finish!: () => void
    writeText.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve }))
    setup(); await inspect()
    fireEvent.click(screen.getByRole('button', { name: 'Copy prepared brief' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change shared tools' }))
    await act(async () => finish())
    expect(screen.queryByRole('button', { name: 'Brief copied' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open Codex cloud' })).not.toBeInTheDocument()
  })
  it('ignores stale clipboard completion after changing workflows', async () => {
    let finish!: () => void
    writeText.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
    setup(); await inspect()
    fireEvent.click(screen.getByRole('button', { name: 'Copy prepared brief' }))
    fireEvent.click(screen.getByRole('button', { name: /Literature Anchor Audit/ }))
    await act(async () => finish())
    expect(screen.queryByRole('button', { name: 'Brief copied' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open Codex cloud' })).not.toBeInTheDocument()
  })
  it('refuses a published file whose bytes do not match the source manifest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new TextEncoder().encode('>x\nAAAA').buffer }))
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Try the published alignment' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('differs from its recorded SHA-256'))
    expect(screen.queryByRole('button', { name: 'Remove Aligned_SCGs.faa' })).not.toBeInTheDocument()
  })
  it('restores focus and cleans up when legacy clipboard succeeds or fails', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const copy = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: copy })
    render(<button type="button">Original focus</button>)
    screen.getByRole('button').focus()
    await copyWorkflowPrompt('strict prompt')
    expect(document.querySelector('textarea')).toBeNull()
    expect(screen.getByRole('button')).toHaveFocus()
    await expect(copyWorkflowPrompt('strict prompt')).rejects.toThrow('Clipboard copy was unavailable')
    expect(document.querySelector('textarea')).toBeNull()
  })
})
