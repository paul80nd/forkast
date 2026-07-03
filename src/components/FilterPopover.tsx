import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A button that opens a popover of secondary controls, with an active-count badge
 * (forkast-design). The pattern for keeping a filter/search bar calm: put the
 * primary controls (search, sort) inline, tuck the rest (cuisine, time, rating)
 * behind this, and surface applied filters as removable chips below the bar.
 * Closes on outside click and Escape.
 */
export function FilterPopover({
  label = 'Filters',
  count = 0,
  align = 'right',
  width = 250,
  children,
}: {
  label?: string
  count?: number
  align?: 'left' | 'right'
  width?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const active = count > 0 || open
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
          active
            ? 'border-brand-300 bg-brand-tint text-brand-ink'
            : 'border-line-strong bg-card text-muted hover:bg-sunken'
        }`}
      >
        {label}
        {count > 0 && (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
        <span aria-hidden className="text-[11px]">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          style={{ width }}
          className={`absolute top-[calc(100%+6px)] z-30 rounded-lg border border-line bg-card p-3.5 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </div>
      )}
    </span>
  )
}
