import React, { useState } from 'react'

/**
 * A selectable pill — category filters and the variant selector. Filled brand when
 * `selected`; bordered surface otherwise (brand-tinted border on hover).
 */
export function Chip({ children, selected = false, onClick, disabled = false }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)', fontWeight: 'var(--fk-weight-medium)',
        padding: '6px 14px', borderRadius: 'var(--fk-radius-full)', cursor: disabled ? 'default' : 'pointer',
        color: selected ? 'var(--fk-text-onbrand)' : 'var(--fk-text-muted)',
        background: selected ? 'var(--fk-brand)' : 'var(--fk-surface-card)',
        border: '1px solid ' + (selected ? 'var(--fk-brand)' : hover ? 'var(--fk-green-300)' : 'var(--fk-border-strong)'),
        transition: 'background var(--fk-duration) var(--fk-ease), border-color var(--fk-duration) var(--fk-ease)',
        opacity: disabled ? 0.5 : 1,
      }}
    >{children}</button>
  )
}
