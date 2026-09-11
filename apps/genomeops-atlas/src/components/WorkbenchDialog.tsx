import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = { title: string; labelId: string; onClose: () => void; children: ReactNode; wide?: boolean }

export function WorkbenchDialog({ title, labelId, onClose, children, wide }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const panel = dialogRef.current
    panel?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select,textarea,[tabindex="0"]')]
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', handleKey)
      previousFocus?.focus()
    }
  }, [])
  return <div className="wb-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialogRef} className={`wb-dialog${wide ? ' wb-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1}>
      <header className="wb-dialog-header"><h2 id={labelId}>{title}</h2><button className="wb-icon-button" onClick={onClose} aria-label="Close dialog"><X size={22} /></button></header>
      {children}
    </div>
  </div>
}
