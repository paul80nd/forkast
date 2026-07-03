import React from 'react'

/**
 * A tappable list line that checks off — ingredient "mise en place" and method
 * steps on the recipe page, and shopping ticks. Strikes through + mutes when
 * checked. `marker="box"` (default) renders a checkbox; `marker="step"` renders a
 * numbered circle (pass `index`). Optional `trailing` node (e.g. parsed amount).
 */
export function CheckItem({ checked, onToggle, children, trailing, marker = 'box', index }) {
  const box = marker === 'step'
    ? <span style={{ flex: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--fk-radius-full)', background: checked ? 'var(--fk-brand)' : 'var(--fk-brand-tint)', color: checked ? '#fff' : 'var(--fk-brand-ink)', fontSize: 'var(--fk-text-sm)', fontWeight: 'var(--fk-weight-semibold)' }}>{checked ? '✓' : index}</span>
    : <span style={{ flex: 'none', width: 18, height: 18, borderRadius: 'var(--fk-radius-sm)', border: '1px solid ' + (checked ? 'var(--fk-brand)' : 'var(--fk-border-strong)'), background: checked ? 'var(--fk-brand)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>{checked ? '✓' : ''}</span>
  return (
    <li onClick={onToggle} style={{ display: 'flex', alignItems: marker === 'step' ? 'flex-start' : 'center', gap: '10px', padding: '7px 0', cursor: 'pointer', listStyle: 'none' }}>
      {box}
      <span style={{ flex: 1, color: checked ? 'var(--fk-text-muted)' : 'var(--fk-text)', textDecoration: checked ? 'line-through' : 'none', lineHeight: 'var(--fk-leading-normal)' }}>{children}</span>
      {trailing}
    </li>
  )
}
