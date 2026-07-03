import React from 'react'

/** A dashed placeholder panel — "Nothing planned yet…", "All triaged 🎉". */
export function EmptyState({ children, title }) {
  return (
    <div style={{
      background: 'var(--fk-surface-card)', border: '1px dashed var(--fk-border-strong)',
      borderRadius: 'var(--fk-radius-2xl)', padding: '40px 24px', textAlign: 'center',
      color: 'var(--fk-text-muted)', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-body)',
    }}>
      {title && <p style={{ margin: '0 0 4px', fontSize: 'var(--fk-text-h3)', fontWeight: 'var(--fk-weight-semibold)', color: 'var(--fk-text)' }}>{title}</p>}
      {children}
    </div>
  )
}
