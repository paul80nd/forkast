import React, { useState } from 'react'

/** A styled native select (keeps native menu behaviour) with a caret and focus ring. */
export function Select({ children, style, ...rest }) {
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e) }}
        onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e) }}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)',
          color: 'var(--fk-text)', background: 'var(--fk-surface-card)',
          padding: '7px 30px 7px 11px', borderRadius: 'var(--fk-radius-md)',
          border: '1px solid ' + (focus ? 'var(--fk-brand)' : 'var(--fk-border-strong)'),
          boxShadow: focus ? 'var(--fk-shadow-focus)' : 'none',
          outline: 'none', cursor: 'pointer',
          transition: 'border-color var(--fk-duration) var(--fk-ease), box-shadow var(--fk-duration) var(--fk-ease)',
          ...style,
        }}
        {...rest}
      >{children}</select>
      <span aria-hidden style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        pointerEvents: 'none', color: 'var(--fk-text-muted)', fontSize: '11px',
      }}>▾</span>
    </div>
  )
}
