import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('GenomeAtlas unified workbench', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('genomeops-atlas:locale:v1', 'en')
    window.history.replaceState(null, '', '/')
    vi.mocked(navigator.clipboard.writeText).mockReset().mockResolvedValue(undefined)
  })

  it('opens the research workbench and can search every task', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'GenomeAtlas Workbench' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Start a research task' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View all tasks' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search task library' }), { target: { value: 'no matching task token' } })
    expect(screen.getByRole('heading', { name: 'No matching task' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByText('8 tasks')).toBeInTheDocument()
  })

  it('prepares a role-aware prompt and links to the chosen destination without pretending to launch a configured session', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Genome selection/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Your research context' }), { target: { value: 'Review my frozen three-genome panel.' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy prompt' }))
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Prompt copied' })).toBeInTheDocument())
    expect(vi.mocked(navigator.clipboard.writeText).mock.calls.at(-1)?.[0]).toContain('Review my frozen three-genome panel.')
    expect(within(dialog).getByText(/They do not change account or model settings/)).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('blocks prompt copy for an invalid or out-of-panel accession list', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Genome selection/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Exact genome accessions' }), { target: { value: 'GCF_999999999.1' } })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('outside the frozen genome panel')
    expect(within(dialog).getByRole('button', { name: 'Copy prompt' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Download prompt' })).toBeDisabled()
  })

  it('does not mark a changed brief as copied after an older clipboard operation finishes', async () => {
    let resolveCopy: () => void = () => {}
    vi.mocked(navigator.clipboard.writeText).mockImplementationOnce(() => new Promise<void>(resolve => { resolveCopy = resolve }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Genome selection/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy prompt' }))
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Your research context' }), { target: { value: 'This context changed after copy started.' } })
    await act(async () => { resolveCopy() })
    expect(within(dialog).queryByRole('button', { name: 'Prompt copied' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Copy prompt' })).toBeEnabled()
  })

  it('makes frozen tool status inspectable and the full inherited registry opt-in', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Browse library' }))
    expect(screen.getByRole('checkbox', { name: 'Include the full inherited registry' })).not.toBeChecked()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search scientific tools' }), { target: { value: 'Apple_Music' } })
    expect(screen.getByRole('heading', { name: 'No matching tool' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include the full inherited registry' }))
    expect(screen.queryByRole('heading', { name: 'No matching tool' })).not.toBeInTheDocument()
  })

  it('keeps the original bilingual everyday guide accessible', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Everyday task guide/ }))
    expect(screen.getByRole('heading', { name: 'What are you trying to move forward?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'RU' }))
    expect(screen.getByRole('heading', { name: 'Что вы хотите сдвинуть с места?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to GenomeAtlas Workbench' }))
    expect(screen.getByRole('heading', { name: 'GenomeAtlas Workbench' })).toBeInTheDocument()
  })
})
