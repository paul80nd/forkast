import React from 'react'

/**
 * A bordered segmented toggle — the "Cooking for 2 / 4 / 6" portions control.
 * Single-select. `options` is an array of { value, label } (label optional).
 */
export function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex', overflow: 'hidden',
        border: '1px solid var(--fk-border-strong)', borderRadius: 'var(--fk-radius-md)',
      }}
    >
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange && onChange(opt.value)}
            style={{
              fontFamily: 'var(--fk-font-body)', fontWeight: 'var(--fk-weight-medium)',
              fontSize: 'var(--fk-text-sm)', padding: '5px 14px',
              color: active ? 'var(--fk-text-onbrand)' : 'var(--fk-text-muted)',
              background: active ? 'var(--fk-brand)' : 'var(--fk-surface-card)',
              border: 'none',
              borderLeft: i === 0 ? 'none' : '1px solid var(--fk-border)',
              cursor: 'pointer', transition: 'background var(--fk-duration) var(--fk-ease)',
            }}
          >{opt.label ?? opt.value}</button>
        )
      })}
    </div>
  )
}
