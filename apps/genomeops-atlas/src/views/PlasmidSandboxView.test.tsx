import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PlasmidSandboxView } from './PlasmidSandboxView'

describe('plasmid sandbox', () => {
  afterEach(cleanup)

  it('does not call empty or invalid input safe', () => {
    render(<PlasmidSandboxView />)
    expect(screen.queryByText(/Transformation Safe:/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('DNA sequence'), { target: { value: 'GAANTTC' } })
    expect(screen.getByText(/Invalid DNA/)).toBeInTheDocument()
    expect(screen.getByLabelText('DNA sequence')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText(/Transformation (Safe|Blocked):/)).not.toBeInTheDocument()
  })

  it('updates mock results immediately for the sequence and selected strain', () => {
    render(<PlasmidSandboxView />)
    expect(screen.getByText(/Mock simulation only/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('DNA sequence'), { target: { value: 'gaat tcGATATC' } })
    expect(screen.getByText(/Found 2 illustrative motif matches/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Host strain'), { target: { value: 'l-plantarum-wcfs1' } })
    expect(screen.getByText(/No illustrative motif matches/)).toBeInTheDocument()
    expect(screen.queryByText(/Transformation Safe:/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('DNA sequence'), { target: { value: 'CCGGGGATCC' } })
    expect(screen.getByText(/Found 2 illustrative motif matches/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Host strain'), { target: { value: 's-thermophilus-dgcc7710' } })
    fireEvent.change(screen.getByLabelText('DNA sequence'), { target: { value: 'AAGCTTGTCGAC' } })
    expect(screen.getByText(/Found 2 illustrative motif matches/)).toBeInTheDocument()
  })
})
