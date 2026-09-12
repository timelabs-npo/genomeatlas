import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { frozenGenomeAccessions, inspectGenomeSelection, publishedPilotAccessions, readLocalSequenceFile, sequenceFileLimit, UserInputsProvider, useUserInputs } from './userInputs'

function Consumer({ name }: { name: string }) {
  const { inputs, setInput, toggleTool, resetInputs } = useUserInputs()
  return <div><output aria-label={`${name} snapshot`}>{JSON.stringify(inputs)}</output><button onClick={() => setInput('contextText', 'Trace exact strain evidence.')}>{name} context</button><button onClick={() => toggleTool('NCBI_Datasets')}>{name} tool</button><button onClick={() => setInput('selectedToolIds', ['NCBI_Datasets', 'NCBI_Datasets', 'unknown'])}>{name} tool list</button><button onClick={resetInputs}>{name} reset</button></div>
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('shared research input state', () => {
  it('synchronizes consumers, deduplicates catalog tools and resets all inputs without storage', () => {
    const storage = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    const session = vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    render(<UserInputsProvider><Consumer name="first" /><Consumer name="second" /></UserInputsProvider>)
    const initial = JSON.parse(screen.getByLabelText('first snapshot').textContent!)
    expect(initial).toEqual({ accessionsText: '', sequenceText: '', contextText: '', selectedToolIds: [], topology: 'circular' })
    fireEvent.click(screen.getByRole('button', { name: 'first context' }))
    expect(screen.getByLabelText('second snapshot')).toHaveTextContent('Trace exact strain evidence.')
    fireEvent.click(screen.getByRole('button', { name: 'second tool list' }))
    expect(JSON.parse(screen.getByLabelText('first snapshot').textContent!).selectedToolIds).toEqual(['NCBI_Datasets'])
    fireEvent.click(screen.getByRole('button', { name: 'first tool' }))
    expect(JSON.parse(screen.getByLabelText('second snapshot').textContent!).selectedToolIds).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'second reset' }))
    expect(JSON.parse(screen.getByLabelText('first snapshot').textContent!)).toEqual(initial)
    expect(storage).not.toHaveBeenCalled()
    expect(session).not.toHaveBeenCalled()
  })

  it('gives standalone consumers isolated state without throwing', () => {
    render(<><Consumer name="first" /><Consumer name="second" /></>)
    fireEvent.click(screen.getByRole('button', { name: 'first context' }))
    expect(screen.getByLabelText('first snapshot')).toHaveTextContent('Trace exact strain evidence.')
    expect(screen.getByLabelText('second snapshot')).not.toHaveTextContent('Trace exact strain evidence.')
  })

  it('does not restore a genomic input after the provider is unmounted', () => {
    const view = render(<UserInputsProvider><Consumer name="first" /></UserInputsProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'first context' }))
    view.unmount()
    render(<UserInputsProvider><Consumer name="new" /></UserInputsProvider>)
    expect(JSON.parse(screen.getByLabelText('new snapshot').textContent!).contextText).toBe('')
  })
})

describe('genome and local-file contracts', () => {
  it('uses exactly the frozen177 panel and the explicit published3 subset', () => {
    expect(frozenGenomeAccessions).toHaveLength(177)
    expect(new Set(frozenGenomeAccessions).size).toBe(177)
    expect(publishedPilotAccessions).toHaveLength(3)
    expect(inspectGenomeSelection(publishedPilotAccessions.join(',\r\n')).valid).toBe(true)
    expect(inspectGenomeSelection('')).toMatchObject({ valid: false, error: '' })
    expect(inspectGenomeSelection('GCF_000468955').error).toMatch(/versioned/)
    expect(inspectGenomeSelection('GCF_999999999.9').error).toMatch(/outside/)
    expect(inspectGenomeSelection(`${publishedPilotAccessions[0]}\n${publishedPilotAccessions[0]}`).error).toMatch(/unique/)
    expect(inspectGenomeSelection(frozenGenomeAccessions.slice(0, 4).join('\n')).error).toMatch(/one to three/)
  })

  it('preserves exact FASTA text and rejects oversized or binary files', async () => {
    const raw = '>example\r\nACTG\r\n'
    const file = new File([raw], 'example.fasta')
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue(raw) })
    expect(await readLocalSequenceFile(file)).toBe(raw)
    const oversized = new File([], 'oversized.fasta')
    const read = vi.fn()
    Object.defineProperties(oversized, { size: { value: sequenceFileLimit + 1 }, text: { value: read } })
    await expect(readLocalSequenceFile(oversized)).rejects.toThrow('5 MiB')
    expect(read).not.toHaveBeenCalled()
    const binary = new File(['AC\0TG'], 'binary.txt')
    Object.defineProperty(binary, 'text', { value: vi.fn().mockResolvedValue('AC\0TG') })
    await expect(readLocalSequenceFile(binary)).rejects.toThrow('binary')
  })
})
