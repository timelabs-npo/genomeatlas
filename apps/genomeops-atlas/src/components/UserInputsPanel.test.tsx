import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { frozenGenomeAccessions, publishedPilotAccessions, UserInputsProvider, useUserInputs } from '../lib/userInputs'
import { UserInputsPanel } from './UserInputsPanel'

function Snapshot() {
  const { inputs, toggleTool } = useUserInputs()
  return <><output aria-label="Shared input snapshot">{JSON.stringify(inputs)}</output><button onClick={() => toggleTool('NCBI_Datasets')}>Select catalog tool</button></>
}
const mount = () => render(<UserInputsProvider><Snapshot /><UserInputsPanel open onClose={vi.fn()} /></UserInputsProvider>)
const snapshot = () => JSON.parse(screen.getByLabelText('Shared input snapshot').textContent!)
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  else Reflect.deleteProperty(window, 'matchMedia')
})

describe('global input panel interactions', () => {
  it('starts empty, searches the frozen panel and enforces three visual selections', () => {
    mount()
    expect(screen.getByRole('textbox', { name: 'Exact genome selection' })).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Browse 177 genomes' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Find a frozen accession' }), { target: { value: frozenGenomeAccessions[0] } })
    expect(within(screen.getByRole('list', { name: 'Frozen genome results' })).getAllByRole('button')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: `Add ${frozenGenomeAccessions[0]}` }))
    expect(snapshot().accessionsText).toBe(frozenGenomeAccessions[0])
    fireEvent.click(screen.getByRole('button', { name: 'Load published pilot (3)' }))
    expect(snapshot().accessionsText).toBe(publishedPilotAccessions.join('\n'))
    expect(screen.getByRole('button', { name: `Add ${frozenGenomeAccessions[0]}` })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: `Remove ${publishedPilotAccessions[0]}` }))
    expect(snapshot().accessionsText.split('\n')).toHaveLength(2)
    expect(screen.getByRole('button', { name: `Add ${frozenGenomeAccessions[0]}` })).toBeEnabled()
  })

  it('exposes invalid raw accession state and shares sequence, topology, notes and tools', () => {
    mount()
    fireEvent.change(screen.getByRole('textbox', { name: 'Exact genome selection' }), { target: { value: 'GCF_000468955' } })
    expect(screen.getByRole('alert')).toHaveTextContent('versioned')
    expect(screen.getByRole('textbox', { name: 'Exact genome selection' })).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(screen.getByRole('textbox', { name: 'Sequence text or single-record FASTA' }), { target: { value: '>my sequence\nACTG' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Question, files and notes' }), { target: { value: 'Inspect the supplied source.' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Linear' }))
    fireEvent.click(screen.getByRole('button', { name: 'Select catalog tool' }))
    expect(snapshot()).toMatchObject({ sequenceText: '>my sequence\nACTG', contextText: 'Inspect the supplied source.', topology: 'linear', selectedToolIds: ['NCBI_Datasets'] })
    fireEvent.click(screen.getByRole('button', { name: 'Remove tool NCBI Datasets' }))
    expect(snapshot().selectedToolIds).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Reset inputs' }))
    expect(snapshot().sequenceText).not.toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Clear all inputs' }))
    expect(snapshot()).toEqual({ accessionsText: '', sequenceText: '', contextText: '', topology: 'circular', selectedToolIds: [] })
  })

  it('loads exact file text locally and shows file metadata', async () => {
    mount()
    const raw = '>exact-header\nGATTACA\n'
    const file = new File([raw], 'sequence.fasta')
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue(raw) })
    fireEvent.change(screen.getByLabelText('Load a local sequence file'), { target: { files: [file] } })
    await waitFor(() => expect(snapshot().sequenceText).toBe(raw))
    expect(within(screen.getByRole('complementary')).getByRole('status')).toHaveTextContent('sequence.fasta')
    expect(within(screen.getByRole('complementary')).getByRole('status')).toHaveTextContent('loaded on this page')
  })

  it('does not overwrite newer pasted text with a slow file result', async () => {
    mount()
    let resolveFile!: (value: string) => void
    const result = new Promise<string>(resolve => { resolveFile = resolve })
    const file = new File(['ACTG'], 'slow.txt')
    Object.defineProperty(file, 'text', { value: vi.fn().mockReturnValue(result) })
    fireEvent.change(screen.getByLabelText('Load a local sequence file'), { target: { files: [file] } })
    expect(screen.getByRole('button', { name: 'Reading file…' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: 'Sequence text or single-record FASTA' }), { target: { value: 'GGCC' } })
    await act(async () => resolveFile('ACTG'))
    expect(snapshot().sequenceText).toBe('GGCC')
    expect(within(screen.getByRole('complementary')).queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load sequence file' })).toBeEnabled()
  })

  it('leaves existing sequence intact when the file cannot be read', async () => {
    mount()
    fireEvent.change(screen.getByRole('textbox', { name: 'Sequence text or single-record FASTA' }), { target: { value: 'ACTG' } })
    const file = new File([], 'unreadable.txt')
    Object.defineProperty(file, 'text', { value: vi.fn().mockRejectedValue(new Error('File access failed')) })
    fireEvent.change(screen.getByLabelText('Load a local sequence file'), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('File access failed')
    expect(snapshot().sequenceText).toBe('ACTG')
  })

  it('provides a modal on narrow screens and restores focus and scrolling on close', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) })
    const opener = document.createElement('button')
    opener.textContent = 'Open user inputs'
    document.body.append(opener)
    opener.focus()
    const onClose = vi.fn()
    const oldOverflow = document.body.style.overflow
    const view = render(<UserInputsProvider><UserInputsPanel open onClose={onClose} /></UserInputsProvider>)
    const dialog = screen.getByRole('dialog', { name: 'Your inputs' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
    view.unmount()
    expect(opener).toHaveFocus()
    expect(document.body.style.overflow).toBe(oldOverflow)
    opener.remove()
  })
})
