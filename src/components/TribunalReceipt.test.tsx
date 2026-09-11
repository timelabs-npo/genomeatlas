import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TribunalReceipt } from './TribunalReceipt'

describe('execution receipt', () => {
  afterEach(cleanup)

  it('renders supplied provenance and distinguishes consensus from validation', () => {
    const hash = '0f139f96494e09ff0387d2b4979318288c6cf54e'
    render(<TribunalReceipt runId="test-receipt" timestamp="2026-09-12T00:00:00Z" commitHash={hash} modelsConsensus={[{ model: 'Reviewer A', claim: '<script>untrusted claim</script>' }]} />)
    expect(screen.getByRole('heading', { name: 'Cryptographic Execution Receipt' })).toBeInTheDocument()
    expect(screen.getByText(hash)).toBeInTheDocument()
    expect(screen.getByText('2026-09-12T00:00:00Z')).toHaveAttribute('datetime', '2026-09-12T00:00:00Z')
    expect(screen.getByText('<script>untrusted claim</script>')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
    expect(screen.getByText(/Model agreement is not experimental validation/)).toBeInTheDocument()
  })

  it('does not fabricate model consensus when none is supplied', () => {
    render(<TribunalReceipt runId="empty" timestamp="2026-09-12T00:00:00Z" commitHash="unknown" modelsConsensus={[]} />)
    expect(screen.getByText('No model consensus supplied.')).toBeInTheDocument()
  })
})
