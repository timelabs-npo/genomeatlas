import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedAtlas } from './AdvancedAtlas'

describe('advanced GenomeOps Atlas workspace', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '#mode=advanced&view=evidence')
  })

  it('preserves the seeded evidence map and workforce router', () => {
    render(<AdvancedAtlas />)

    expect(screen.getByRole('heading', { name: 'L. lactis oxygen metabolism' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'nox, predicted' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /AI Workforce/i }))
    expect(screen.getByRole('heading', { name: 'Task → Agent Router' })).toBeInTheDocument()
    expect(screen.getByText('GPT-5.3-Codex-Spark', { selector: '.route-step-copy strong' })).toBeInTheDocument()
  })

  it('keeps Spark out of an explicitly selected genome-analysis route', () => {
    render(<AdvancedAtlas />)
    fireEvent.click(screen.getByRole('button', { name: /AI Workforce/i }))
    fireEvent.click(screen.getByRole('radio', { name: /Analyze genome/i }))

    const routeOutput = screen.getByText('Recommended agent stack').closest('.route-output')
    expect(routeOutput).not.toBeNull()
    expect(within(routeOutput as HTMLElement).getByRole('heading', { name: 'Analyze genome evidence' })).toBeInTheDocument()
    expect(within(routeOutput as HTMLElement).queryByText('GPT-5.3-Codex-Spark')).not.toBeInTheDocument()
  })

  it('opens new views through navigation and deep links', () => {
    window.history.replaceState(null, '', '#mode=advanced&view=plasmid')
    render(<AdvancedAtlas />)
    expect(screen.getByRole('heading', { name: 'Explore restriction motifs' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Workflow Dispatcher' }))
    expect(window.location.hash).toContain('view=dispatcher')
    expect(screen.getByRole('button', { name: 'Generate Perfect Prompt' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Current section' }), { target: { value: 'plasmid' } })
    expect(screen.getByRole('heading', { name: 'Explore restriction motifs' })).toBeInTheDocument()
  })

  it('keeps the atlas usable when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked') })
    render(<AdvancedAtlas />)
    expect(screen.getByRole('heading', { name: 'L. lactis oxygen metabolism' })).toBeInTheDocument()
    expect(screen.getByText(/Decisions remain in this session only/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Plasmid Sandbox' }))
    expect(screen.getByRole('heading', { name: 'Explore restriction motifs' })).toBeInTheDocument()
  })
})
