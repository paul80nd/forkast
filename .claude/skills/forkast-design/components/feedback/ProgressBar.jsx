import React from 'react'

/**
 * A slim determinate progress bar. Used for the Curate triage progress ("12 of
 * 40"). Tone picks the fill colour; `label`/`showValue` render a caption row.
 */
export function ProgressBar({ value, max = 100, tone = 'brand', label, showValue = false, size = 6 }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const color = tone === 'info' ? 'var(--fk-info)' : tone === 'star' ? 'var(--fk-star)' : 'var(--fk-brand)'
  return (
    <div>
      {(label || showValue) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>
          {label && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
          {showValue && <span style={{ whiteSpace: 'nowrap' }}>{value} of {max}</span>}
        </div>
      )}
      <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
        style={{ height: size, borderRadius: 'var(--fk-radius-full)', background: 'var(--fk-surface-sunken)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 'var(--fk-radius-full)', transition: 'width var(--fk-duration-lg) var(--fk-ease)' }} />
      </div>
    </div>
  )
}
