import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTINE_AIMS_KEY } from '../lib/routine'
import { RoutineGuide } from './RoutineGuide'

describe('everyday guide optional browser storage', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it.each(['blocked access', 'quota exceeded'])('keeps aims usable in memory when %s', (failure) => {
    if (failure === 'blocked access') {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('Storage blocked', 'SecurityError') })
    } else {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError') })
    }
    render(<RoutineGuide locale="en" onLocaleChange={vi.fn()} onAdvanced={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveTextContent('Browser storage is unavailable')
    expect(screen.getByRole('status')).toHaveTextContent('lost when you leave or reload')
    fireEvent.change(screen.getByRole('textbox', { name: 'What are you trying to move forward?' }), { target: { value: 'Plan an accession provenance review.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guide me' }))
    fireEvent.click(screen.getByRole('button', { name: 'My aims' }))
    const aim = within(screen.getByRole('dialog', { name: 'Your aims' })).getByRole('button', { name: /Plan an accession provenance review/ })
    fireEvent.click(aim)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Plan an accession provenance review.')
    expect(screen.getByRole('heading', { name: 'Start here' })).toBeInTheDocument()
  })

  it('persists an aim and restores it on a fresh mount when storage works', () => {
    const initial = render(<RoutineGuide locale="en" onLocaleChange={vi.fn()} onAdvanced={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Compare marker provenance methods.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guide me' }))
    expect(JSON.parse(window.localStorage.getItem(ROUTINE_AIMS_KEY)!)).toEqual([expect.objectContaining({ input: 'Compare marker provenance methods.' })])
    initial.unmount()
    render(<RoutineGuide locale="en" onLocaleChange={vi.fn()} onAdvanced={vi.fn()} />)
    expect(screen.queryByText(/Browser storage is unavailable/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'My aims' }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /Compare marker provenance methods/ })).toBeInTheDocument()
  })
})
