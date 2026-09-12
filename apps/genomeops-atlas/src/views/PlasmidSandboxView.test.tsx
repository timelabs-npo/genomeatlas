import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadText } from '../lib/export'
import { UserInputsProvider, useUserInputs } from '../lib/userInputs'
import { PlasmidSandboxView, SYNTHETIC_PLASMID } from './PlasmidSandboxView'

vi.mock('../lib/export', () => ({ downloadText: vi.fn() }))

const enterSequence = (value: string) => fireEvent.change(screen.getByLabelText('Sandbox DNA sequence'), { target: { value } })
const addMotif = (value: string) => {
  fireEvent.change(screen.getByLabelText('Custom motif'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Add motif' }))
}
const removeStarterMotifs = () => ['GAATTC', 'GGATCC', 'GATATC', 'GANTC'].forEach(motif => fireEvent.click(screen.getByRole('button', { name: 'Remove motif ' + motif })))

function SharedInputsHarness() {
  const { inputs, setInput } = useUserInputs()
  return <><label>External sequence<textarea value={inputs.sequenceText} onChange={event => setInput('sequenceText', event.target.value)} /></label><output aria-label="External topology">{inputs.topology}</output></>
}

describe('plasmid sandbox', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('starts empty and rejects unresolved DNA without fabricating strain predictions', () => {
    render(<PlasmidSandboxView />)
    expect(screen.getByRole('button', { name: 'Scan JSON' })).toBeDisabled()
    expect(screen.queryByLabelText('Host strain')).not.toBeInTheDocument()
    enterSequence('GAANTTC')
    expect(screen.getByText(/Invalid DNA characters: N/)).toBeInTheDocument()
    expect(screen.getByLabelText('Sandbox DNA sequence')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Sites CSV' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Select site/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Transformation (Safe|Blocked):/)).not.toBeInTheDocument()
  })

  it('loads an explicitly synthetic example with selectable measured positions', () => {
    render(<PlasmidSandboxView />)
    fireEvent.click(screen.getByRole('button', { name: 'Load synthetic example' }))
    expect(screen.getByText('Synthetic example')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Circular motif position map' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Select site/ }).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Edit sequence' }))
    expect(screen.getByLabelText('Sandbox DNA sequence')).toHaveValue(SYNTHETIC_PLASMID)
  })

  it('shares raw sequence and topology changes with the workspace provider', () => {
    render(<UserInputsProvider><SharedInputsHarness /><PlasmidSandboxView /></UserInputsProvider>)
    fireEvent.change(screen.getByLabelText('External sequence'), { target: { value: '>one\nAATTCG' } })
    expect(screen.getByLabelText('Sandbox DNA sequence')).toHaveValue('>one\nAATTCG')
    expect(screen.getByRole('button', { name: 'Select site GAATTC at 6–5, crosses origin' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    expect(screen.getByLabelText('External topology')).toHaveTextContent('linear')
    expect(screen.getByRole('group', { name: 'Linear motif position map' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Select site GAATTC/ })).not.toBeInTheDocument()
    enterSequence('GGATCC')
    expect(screen.getByLabelText('External sequence')).toHaveValue('GGATCC')
  })

  it('selects an origin-spanning site by keyboard and highlights its actual bases on a short circle', () => {
    const { container } = render(<PlasmidSandboxView />)
    enterSequence('AATTCG')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Select site GAATTC at 6–5, crosses origin' }), { key: 'Enter' })
    expect(screen.getByText('6 → 5')).toBeInTheDocument()
    expect(screen.getByText('Both strands')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inspect highlighted bases' }))
    const bases = Array.from(container.querySelectorAll('.ps-base-selected'))
    expect(bases.map(base => Number(base.getAttribute('data-position'))).sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(bases.map(base => base.textContent).join('')).toBe('AATTCG')
    expect(container.querySelector('[data-position="0"]')).toBeNull()
  })

  it('supports degenerate motifs and rejects malformed patterns before changing the scan', () => {
    render(<PlasmidSandboxView />)
    enterSequence('GACTC')
    removeStarterMotifs()
    addMotif('gAnTc')
    expect(screen.getByRole('button', { name: 'Remove motif GANTC' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select site GANTC at 1–5' })).toBeInTheDocument()
    addMotif('GA.*TC')
    expect(screen.getByRole('alert')).toHaveTextContent('Use DNA IUPAC letters')
    expect(screen.queryByRole('button', { name: 'Remove motif GA.*TC' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove motif GANTC' }))
    expect(screen.getByRole('button', { name: 'Scan JSON' })).toBeDisabled()
  })

  it('shows reverse-strand matches in reference coordinates and exports those exact results', () => {
    render(<PlasmidSandboxView />)
    enterSequence('CCCATCCC')
    fireEvent.click(screen.getByRole('button', { name: 'Linear' }))
    removeStarterMotifs(); addMotif('ATG')
    fireEvent.click(screen.getByRole('tab', { name: 'Matches' }))
    const row = screen.getByRole('button', { name: 'Inspect ATG at 3–5' }).closest('tr')!
    expect(within(row).getByText('Reverse (−)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Scan JSON' }))
    const [filename, content, mime] = vi.mocked(downloadText).mock.calls[0]
    expect(filename).toBe('motif-scan.json'); expect(mime).toBe('application/json')
    const exported = JSON.parse(content)
    expect(exported).toMatchObject({ sequence: 'CCCATCCC', topology: 'linear', siteCount: 1, motifs: ['ATG'] })
    expect(exported.sites).toEqual([expect.objectContaining({ motif: 'ATG', start: 3, end: 5, strand: '-', matchedSequence: 'CAT', crossesOrigin: false })])
    fireEvent.click(screen.getByRole('button', { name: 'Sites CSV' }))
    expect(vi.mocked(downloadText).mock.calls[1]).toEqual(['motif-sites.csv', expect.stringContaining('"ATG","3","5","-","false","CAT","linear","8"'), 'text/csv'])
  })

  it('rejects multiple FASTA records instead of creating a false junction', () => {
    render(<PlasmidSandboxView />)
    enterSequence('>first\nGAAT\n>second\nTC')
    expect(screen.getByRole('status')).toHaveTextContent('Provide one FASTA record')
    expect(screen.getByRole('button', { name: 'Scan JSON' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Select site/ })).not.toBeInTheDocument()
  })

  it('allows selection of matches beyond the first table page', () => {
    const { container } = render(<PlasmidSandboxView />)
    enterSequence('A'.repeat(260))
    removeStarterMotifs(); addMotif('AAA')
    fireEvent.click(screen.getByRole('tab', { name: 'Matches' }))
    expect(screen.queryByRole('button', { name: 'Inspect AAA at 259–1, crosses origin' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next matches page' }))
    fireEvent.click(screen.getByRole('button', { name: 'Inspect AAA at 259–1, crosses origin' }))
    expect(Array.from(container.querySelectorAll('.ps-base-selected')).map(base => Number(base.getAttribute('data-position')))).toEqual([259, 260, 1])
  })

  it('shows a blocked scan rather than a zero-match result when browser limits are exceeded', () => {
    render(<PlasmidSandboxView />)
    enterSequence('A'.repeat(50_001))
    removeStarterMotifs(); addMotif('N')
    expect(screen.getByRole('status')).toHaveTextContent('More than 50,000 matches')
    fireEvent.click(screen.getByRole('tab', { name: 'Matches' }))
    expect(screen.getByText(/Scan unavailable/)).toBeInTheDocument()
    expect(screen.queryByText(/No matches for these patterns/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scan JSON' })).toBeDisabled()
  })

})
