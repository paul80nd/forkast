import React, { useState } from 'react'

/**
 * The primary action control. Token-driven inline styles so it re-themes with
 * light/dark automatically. Reference only the semantic --fk-* aliases.
 */
const SIZES = {
  sm: { padding: '5px 11px', fontSize: 'var(--fk-text-sm)' },
  md: { padding: '7px 15px', fontSize: 'var(--fk-text-body)' },
  lg: { padding: '10px 20px', fontSize: 'var(--fk-text-h3)' },
}

const VARIANTS = {
  primary:  { bg: 'var(--fk-brand)',         fg: 'var(--fk-text-onbrand)', hover: 'var(--fk-brand-hover)', border: 'transparent' },
  positive: { bg: 'var(--fk-positive-tint)',  fg: 'var(--fk-positive-ink)', hover: 'var(--fk-green-200)',  border: 'transparent' },
  soft:     { bg: 'var(--fk-brand-tint)',     fg: 'var(--fk-brand-ink)',    hover: 'var(--fk-green-200)',  border: 'transparent' },
  danger:   { bg: 'var(--fk-danger)',         fg: '#fff',                   hover: 'var(--fk-danger-hover)', border: 'transparent' },
  ghost:    { bg: 'transparent',              fg: 'var(--fk-text-muted)',   hover: 'var(--fk-surface-sunken)', border: 'transparent' },
  outline:  { bg: 'var(--fk-surface-card)',   fg: 'var(--fk-text)',         hover: 'var(--fk-surface-sunken)', border: 'var(--fk-border-strong)' },
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  glyph,
  disabled = false,
  fullWidth = false,
  style,
  ...rest
}) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const v = VARIANTS[variant] ?? VARIANTS.primary
  const s = SIZES[size] ?? SIZES.md

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--fk-font-body)',
        fontWeight: 'var(--fk-weight-medium)',
        lineHeight: 1.1,
        padding: s.padding,
        fontSize: s.fontSize,
        color: v.fg,
        background: disabled ? v.bg : hover ? v.hover : v.bg,
        border: '1px solid ' + v.border,
        borderRadius: 'var(--fk-radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        boxShadow: focus ? 'var(--fk-shadow-focus)' : 'none',
        outline: 'none',
        transition: 'background var(--fk-duration) var(--fk-ease), box-shadow var(--fk-duration) var(--fk-ease)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {glyph && <span aria-hidden style={{ fontSize: '1.05em', lineHeight: 1 }}>{glyph}</span>}
      {children}
    </button>
  )
}

/**
 * A split button: a primary action fused to a caret that opens a menu. Mirrors the
 * Recipe page's "Add to week ▾". `onMain` fires the action; `menu` is rendered
 * (absolutely) when the caret is toggled — caller controls open state via `open`.
 */
export function SplitButton({ children, variant = 'primary', size = 'md', onMain, open, onToggle, menu, glyph }) {
  const v = VARIANTS[variant] ?? VARIANTS.primary
  const s = SIZES[size] ?? SIZES.md
  const [hoverMain, setHoverMain] = useState(false)
  const [hoverCaret, setHoverCaret] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch' }}>
      <button
        type="button"
        onClick={onMain}
        onMouseEnter={() => setHoverMain(true)}
        onMouseLeave={() => setHoverMain(false)}
        style={{
          fontFamily: 'var(--fk-font-body)', fontWeight: 'var(--fk-weight-medium)',
          fontSize: s.fontSize, padding: s.padding, color: v.fg,
          background: hoverMain ? v.hover : v.bg, border: 'none',
          borderRadius: 'var(--fk-radius-md) 0 0 var(--fk-radius-md)',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
        }}
      >
        {glyph && <span aria-hidden>{glyph}</span>}
        {children}
      </button>
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        onClick={onToggle}
        onMouseEnter={() => setHoverCaret(true)}
        onMouseLeave={() => setHoverCaret(false)}
        style={{
          fontFamily: 'var(--fk-font-body)', fontSize: s.fontSize, padding: '0 9px',
          color: v.fg, background: hoverCaret ? v.hover : v.bg,
          borderLeft: '1px solid rgba(255,255,255,.3)', borderTop: 'none', borderRight: 'none', borderBottom: 'none',
          borderRadius: '0 var(--fk-radius-md) var(--fk-radius-md) 0', cursor: 'pointer',
        }}
      >▾</button>
      {open && menu && (
        <div role="menu" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px', zIndex: 20, minWidth: '176px',
          background: 'var(--fk-surface-card)', border: '1px solid var(--fk-border)',
          borderRadius: 'var(--fk-radius-md)', boxShadow: 'var(--fk-shadow-lg)', overflow: 'hidden',
        }}>{menu}</div>
      )}
    </span>
  )
}
