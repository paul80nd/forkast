import React, { useState } from 'react'

/** A text / search field with the brand focus ring. Forwards all input props. */
export function Input({ style, ...rest }) {
  const [focus, setFocus] = useState(false)
  return (
    <input
      onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e) }}
      onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e) }}
      style={{
        fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)',
        color: 'var(--fk-text)', background: 'var(--fk-surface-card)',
        padding: '7px 11px', borderRadius: 'var(--fk-radius-md)',
        border: '1px solid ' + (focus ? 'var(--fk-brand)' : 'var(--fk-border-strong)'),
        boxShadow: focus ? 'var(--fk-shadow-focus)' : 'none',
        outline: 'none', width: '100%',
        transition: 'border-color var(--fk-duration) var(--fk-ease), box-shadow var(--fk-duration) var(--fk-ease)',
        ...style,
      }}
      {...rest}
    />
  )
}
