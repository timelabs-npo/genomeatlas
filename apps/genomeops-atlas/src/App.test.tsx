import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const openGenomeWorkspace = () => {
  fireEvent.click(screen.getByRole('button', { name: /Genome selection/ }))
  expect(screen.getByRole('heading', { name: 'Choose the right genomes' })).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox', { name: 'Exact genome selection' }), { target: { value: 'GCF_000468955.1' } })
}

describe('GenomeAtlas interactive research workspace', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('genomeops-atlas:locale:v1', 'en')
    window.history.replaceState(null, '', '/')
    vi.mocked(navigator.clipboard.writeText).mockReset().mockResolvedValue(undefined)
  })

  it('uses a staged task library and opens a distinct full-page workspace', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'View all tasks' }))
    expect(screen.getByRole('heading', { name: 'Prepare' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Analyze' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Review & communicate' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Inspect R-M candidates workspace' }))
    expect(window.location.hash).toContain('task=screen-rm-candidates')
    expect(screen.getByRole('heading', { name: 'Inspect R-M candidates' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Prepare inputs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inspect R-M evidence inputs' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Inspect R-M candidates' })).not.toBeInTheDocument()
  })

  it('starts with empty shared inputs and prepares an explicitly scoped configured prompt', async () => {
    render(<App />)
    openGenomeWorkspace()
    fireEvent.change(screen.getByRole('textbox', { name: 'Question, files and notes' }), { target: { value: 'Review my exact genome and report missing evidence.' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Run in chat' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Destination' }), { target: { value: 'codex' } })
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Prompt copied' })).toBeInTheDocument())
    const text = vi.mocked(navigator.clipboard.writeText).mock.calls.at(-1)?.[0]
    expect(text).toContain('Review my exact genome and report missing evidence.')
    expect(text).toContain('Codex cloud')
    expect(text).toContain('GCF_000468955.1')
    expect(text).not.toContain('GCF_903886475.1')
    expect(screen.getByText(/They do not change account or model settings/)).toBeInTheDocument()
  })

  it('blocks invalid scope and does not report a changed brief as copied', async () => {
    let resolveCopy: () => void = () => {}
    vi.mocked(navigator.clipboard.writeText).mockImplementationOnce(() => new Promise<void>(resolve => { resolveCopy = resolve }))
    render(<App />)
    openGenomeWorkspace()
    fireEvent.click(screen.getByRole('tab', { name: 'Run in chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Question, files and notes' }), { target: { value: 'A new context after copy started.' } })
    await act(async () => { resolveCopy() })
    expect(screen.queryByRole('button', { name: 'Prompt copied' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Exact genome selection' }), { target: { value: 'GCF_999999999.1' } })
    expect(screen.getByRole('button', { name: 'Copy prompt' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Download prompt' })).toBeDisabled()
  })

  it('invalidates the preparation report when any shared sequence input changes', () => {
    render(<App />)
    openGenomeWorkspace()
    fireEvent.click(screen.getByRole('button', { name: 'Review accession selection' }))
    expect(screen.getByText('Local preparation check recorded')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Sequence text or single-record FASTA' }), { target: { value: 'ACGTGAATTC' } })
    expect(screen.queryByText('Local preparation check recorded')).not.toBeInTheDocument()
  })

  it('carries selected tools from the library into a task brief', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Add NCBI Datasets to toolset' }))
    openGenomeWorkspace()
    fireEvent.click(screen.getByRole('tab', { name: 'Run in chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Prompt copied' })).toBeInTheDocument())
    expect(vi.mocked(navigator.clipboard.writeText).mock.calls.at(-1)?.[0]).toContain('NCBI_Datasets [')
    const toolset = screen.getByRole('list', { name: 'Selected tools' })
    expect(within(toolset).getByText('NCBI Datasets')).toBeInTheDocument()
  })

  it('keeps unrelated inherited catalog entries opt-in and preserves the bilingual guide', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search scientific tools' }), { target: { value: 'Apple_Music' } })
    expect(screen.getByRole('heading', { name: 'No matching tool' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include the full inherited registry' }))
    expect(screen.queryByRole('heading', { name: 'No matching tool' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Everyday task guide/ }))
    fireEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(screen.getByRole('heading', { name: 'Что вы хотите сдвинуть с места?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to GenomeAtlas Workbench' }))
    expect(screen.getByRole('heading', { name: 'GenomeAtlas Workbench' })).toBeInTheDocument()
    expect(screen.getByText('(c) timelabs-npo 2026, MIT')).toBeInTheDocument()
  })
})
