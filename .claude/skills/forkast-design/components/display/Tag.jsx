import React from 'react'

/**
 * A small, static rounded label — cuisine, diet tags, allergens, "why" reasons,
 * "unrated", star/version overlays. Not interactive; use Chip for selectable pills.
 */
const TONES = {
  neutral: { bg: 'var(--fk-surface-sunken)', fg: 'var(--fk-text-muted)' },
  brand:   { bg: 'var(--fk-brand-tint)',     fg: 'var(--fk-brand-ink)' },
  star:    { bg: 'var(--fk-star-tint)',      fg: 'var(--fk-star-ink)' },
  info:    { bg: 'var(--fk-info-tint)',      fg: 'var(--fk-info-ink)' },
  warn:    { bg: 'var(--fk-warn-tint)',      fg: 'var(--fk-warn-ink)' },
  danger:  { bg: 'var(--fk-danger-tint)',    fg: 'var(--fk-danger-ink)' },
}

export function Tag({ children, tone = 'neutral', square = false, style }) {
  const t = TONES[tone] ?? TONES.neutral
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-xs)', fontWeight: 'var(--fk-weight-medium)',
      lineHeight: 1.4, padding: '3px 9px', color: t.fg, background: t.bg,
      borderRadius: square ? 'var(--fk-radius-sm)' : 'var(--fk-radius-full)',
      whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  )
}
