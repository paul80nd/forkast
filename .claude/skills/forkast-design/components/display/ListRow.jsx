import React from 'react'

/**
 * A meal / shopping / rated list row: optional thumbnail, a title (button when
 * `onOpen` given), a meta line and right-aligned action slot. Composes into the
 * bordered lists on Plan, Shop and Curate.
 */
export function ListRow({ image, title, meta, onOpen, actions, children }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
      listStyle: 'none', background: 'var(--fk-surface-card)',
    }}>
      <div style={{ display: 'flex', minWidth: 0, flex: 1, alignItems: 'center', gap: '12px' }}>
        {image && <img src={image} alt="" style={{ width: '56px', height: '56px', flex: 'none', borderRadius: 'var(--fk-radius-md)', objectFit: 'cover' }} />}
        <div style={{ minWidth: 0 }}>
          {onOpen ? (
            <button type="button" onClick={onOpen} title="View recipe" style={{ display: 'block', maxWidth: '100%', textAlign: 'left', border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--fk-font-body)', fontWeight: 'var(--fk-weight-medium)', fontSize: 'var(--fk-text-body)', color: 'var(--fk-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</button>
          ) : (
            <div style={{ fontWeight: 'var(--fk-weight-medium)', fontSize: 'var(--fk-text-body)', color: 'var(--fk-text)' }}>{title}</div>
          )}
          {meta && <div style={{ marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '2px 8px', fontSize: 'var(--fk-text-xs)', color: 'var(--fk-text-muted)' }}>{meta}</div>}
          {children}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 'none' }}>{actions}</div>}
    </li>
  )
}
