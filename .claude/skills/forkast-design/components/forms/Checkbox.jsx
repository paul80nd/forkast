import React from 'react'

/** A brand-accent checkbox with an optional inline label. */
export function Checkbox({ checked, onChange, label, disabled, ...rest }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)',
      color: 'var(--fk-text-muted)', cursor: disabled ? 'not-allowed' : 'pointer',
      userSelect: 'none', opacity: disabled ? 0.5 : 1,
    }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        style={{ width: '16px', height: '16px', accentColor: 'var(--fk-brand)', cursor: 'inherit' }}
        {...rest}
      />
      {label}
    </label>
  )
}
