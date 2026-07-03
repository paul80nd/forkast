import React, { useState, useRef, useEffect } from 'react'

/**
 * A button that opens a popover of secondary controls, with an active-count badge.
 * The pattern for keeping a filter/search bar calm: put search + sort inline, tuck
 * the rest behind this, and surface applied filters as removable chips elsewhere.
 * Closes on outside click and Escape. `children` are the controls (e.g. Selects).
 */
export function FilterPopover({ label = 'Filters', count = 0, children, align = 'right', width = 250 }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  const active = count > 0 || open
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          fontFamily: 'var(--fk-font-body)', fontWeight: 'var(--fk-weight-medium)', fontSize: 'var(--fk-text-sm)',
          padding: '7px 13px', borderRadius: 'var(--fk-radius-md)', cursor: 'pointer',
          color: active ? 'var(--fk-brand-ink)' : 'var(--fk-text-muted)',
          background: active ? 'var(--fk-brand-tint)' : hover ? 'var(--fk-surface-sunken)' : 'var(--fk-surface-card)',
          border: '1px solid ' + (active ? 'var(--fk-green-300)' : 'var(--fk-border-strong)'),
          transition: 'background var(--fk-duration) var(--fk-ease), border-color var(--fk-duration) var(--fk-ease)',
        }}
      >
        {label}
        {count > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '18px', height: '18px', padding: '0 5px',
            borderRadius: 'var(--fk-radius-full)', background: 'var(--fk-brand)', color: '#fff', fontSize: 'var(--fk-text-2xs)', fontWeight: 'var(--fk-weight-semibold)' }}>{count}</span>
        )}
        <span aria-hidden style={{ fontSize: '11px' }}>▾</span>
      </button>
      {open && (
        <div role="dialog" style={{
          position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 30, width,
          background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)',
          borderRadius: 'var(--fk-radius-lg)', boxShadow: 'var(--fk-shadow-lg)', padding: '14px',
        }}>{children}</div>
      )}
    </span>
  )
}
