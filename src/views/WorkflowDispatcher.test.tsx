import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkflowDispatcher } from './WorkflowDispatcher'
import { copyWorkflowPrompt } from '../lib/workflowDispatcher'

describe('WorkflowDispatcher', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>()

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('provides exactly two handoff options and updates the chain on catalog selection', () => {
    const { container } = render(<WorkflowDispatcher />)
    const actions = container.querySelector('.actions')!
    expect([...actions.children].map((child) => child.tagName)).toEqual(['BUTTON', 'PRE'])
    expect(screen.getByRole('button', { name: /Phylogenomic Tree/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/This page does not submit a job/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /R-M Detection/ }))
    const request = JSON.parse(screen.getByLabelText('Local automation task request').textContent!)
    expect(request.chain_id).toBe('rm')
    expect(request.acceptance_criteria).toContain('raw-components-reviewed')
    expect(screen.getByRole('button', { name: /R-M Detection/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Phylogenomic Tree/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('copies the same request shown in the preview and resets its success state', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<WorkflowDispatcher />)
    const preview = screen.getByLabelText('Local automation task request').textContent!
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Generate Perfect Prompt' })))
    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText.mock.calls[0][0]).toContain(preview)
    expect(screen.getByRole('button', { name: 'Copied! Paste to ChatGPT' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1800))
    expect(screen.getByRole('button', { name: 'Generate Perfect Prompt' })).toBeInTheDocument()
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows a truthful clipboard error and permits a successful retry', async () => {
    writeText.mockRejectedValueOnce(new Error('Denied'))
    render(<WorkflowDispatcher />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Generate Perfect Prompt' })))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not copy the prompt')
    expect(screen.queryByRole('button', { name: 'Copied! Paste to ChatGPT' })).not.toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Generate Perfect Prompt' })))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copied! Paste to ChatGPT' })).toBeInTheDocument()
  })

  it('ignores a stale clipboard completion after switching workflows', async () => {
    let finish!: () => void
    writeText.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
    render(<WorkflowDispatcher />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate Perfect Prompt' }))
    expect(screen.getByRole('button', { name: 'Copying…' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Literature Anchor Audit/ }))
    await act(async () => finish())
    expect(screen.getByRole('button', { name: 'Generate Perfect Prompt' })).toBeInTheDocument()
    expect(JSON.parse(screen.getByLabelText('Local automation task request').textContent!).chain_id).toBe('evidence')
  })

  it('does not schedule success feedback after unmounting during a clipboard request', async () => {
    vi.useFakeTimers()
    let finish!: () => void
    writeText.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve }))
    const { unmount } = render(<WorkflowDispatcher />)
    fireEvent.click(screen.getByRole('button', { name: 'Generate Perfect Prompt' }))
    unmount()
    await act(async () => finish())
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cleans up and restores focus when the legacy clipboard succeeds or fails', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const copy = vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: copy })
    render(<button type="button">Original focus</button>)
    const button = screen.getByRole('button')
    button.focus()
    await copyWorkflowPrompt('strict prompt')
    expect(copy).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
    expect(button).toHaveFocus()
    await expect(copyWorkflowPrompt('strict prompt')).rejects.toThrow('Clipboard copy was unavailable')
    expect(document.querySelector('textarea')).toBeNull()
    expect(button).toHaveFocus()
  })
})
