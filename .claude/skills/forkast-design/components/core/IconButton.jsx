import React, { useState } from 'react'

/**
 * A square, ghost icon button — theme toggle, remove (✕), row menu (▾). Pass a
 * glyph or an icon node as children. `tone` shifts the hover/text colour.
 */
const TONES = {
  neutral: { fg: 'var(--fk-text-muted)', hoverFg: 'var(--fk-text)',      hoverBg: 'var(--fk-surface-sunken)' },
  danger:  { fg: 'var(--fk-text-muted)', hoverFg: 'var(--fk-danger-ink)', hoverBg: 'var(--fk-danger-wash)' },
  brand:   { fg: 'var(--fk-text-muted)', hoverFg: 'var(--fk-brand-ink)',  hoverBg: 'var(--fk-brand-wash)' },
}

export function IconButton({ children, tone = 'neutral', size = 34, label, ...rest }) {
  const [hover, setHover] = useState(false)
  const t = TONES[tone] ?? TONES.neutral
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--fk-font-body)', fontSize: Math.round(size * 0.5),
        color: hover ? t.hoverFg : t.fg, background: hover ? t.hoverBg : 'transparent',
        border: 'none', borderRadius: 'var(--fk-radius-md)', cursor: 'pointer',
        transition: 'background var(--fk-duration) var(--fk-ease), color var(--fk-duration) var(--fk-ease)',
      }}
      {...rest}
    >{children}</button>
  )
}
