import React from 'react'

/**
 * An on/off toggle switch. Use for a setting that takes effect *immediately* and
 * reads as persistent state (e.g. Browse's "Group variants"). For form selections
 * that are submitted, or multi-select lists (e.g. the Shop tick-list), use Checkbox.
 */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)', color: 'var(--fk-text-muted)',
      cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none', opacity: disabled ? 0.5 : 1,
    }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : undefined}
        disabled={disabled}
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 38, height: 22, flex: 'none', borderRadius: 'var(--fk-radius-full)', border: 'none', padding: 2,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: checked ? 'var(--fk-brand)' : 'var(--fk-neutral-300)',
          display: 'inline-flex', alignItems: 'center',
          transition: 'background var(--fk-duration) var(--fk-ease)',
        }}
      >
        <span style={{
          width: 18, height: 18, borderRadius: 'var(--fk-radius-full)', background: '#fff', boxShadow: 'var(--fk-shadow-xs)',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform var(--fk-duration) var(--fk-ease)',
        }} />
      </button>
      {label}
    </label>
  )
}
