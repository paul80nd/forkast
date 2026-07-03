import React from 'react'

/**
 * A coloured feature panel with a soft wash background and matching tinted border —
 * the "Suggested week" (info), variant/versions (brand) and summary blocks.
 */
const TONES = {
  info:    { bg: 'var(--fk-info-wash)',  border: 'var(--fk-harbour-200)', title: 'var(--fk-harbour-900)' },
  brand:   { bg: 'var(--fk-brand-wash)', border: 'var(--fk-green-200)',   title: 'var(--fk-brand-ink)' },
  warn:    { bg: 'var(--fk-warn-wash)',  border: 'var(--fk-honey-200)',   title: 'var(--fk-warn-ink)' },
  neutral: { bg: 'var(--fk-surface-card)', border: 'var(--fk-border)',    title: 'var(--fk-text)' },
}

export function Panel({ children, tone = 'neutral', title, subtitle, actions, style }) {
  const t = TONES[tone] ?? TONES.neutral
  return (
    <section style={{
      background: t.bg, border: '1px solid ' + t.border, borderRadius: 'var(--fk-radius-2xl)',
      padding: '16px', ...style,
    }}>
      {(title || actions) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: subtitle ? '2px' : '12px' }}>
          <div>
            {title && <h2 style={{ margin: 0, fontFamily: 'var(--fk-font-display)', fontWeight: 'var(--fk-weight-semibold)', fontSize: 'var(--fk-text-h2)', color: t.title }}>{title}</h2>}
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>{subtitle}</p>}
          </div>
          {actions && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{actions}</div>}
        </div>
      )}
      {(title && subtitle) && <div style={{ height: '12px' }} />}
      {children}
    </section>
  )
}
