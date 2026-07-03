import React, { useState } from 'react'

/**
 * The top tab bar — Browse · Refine · Curate · Plan · Shop · Config. Active tab is
 * a brand-tint pill; the rest are muted with a sunken hover. `tabs` is an array of
 * { id, label }; the row scrolls horizontally when it overflows on narrow screens.
 */
export function NavTabs({ tabs, active, onChange }) {
  return (
    <nav style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
      {tabs.map((t) => <Tab key={t.id} tab={t} active={t.id === active} onChange={onChange} />)}
    </nav>
  )
}

function Tab({ tab, active, onChange }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={() => onChange && onChange(tab.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: 'var(--fk-font-body)', fontWeight: 'var(--fk-weight-medium)', fontSize: 'var(--fk-text-sm)',
        padding: '6px 13px', borderRadius: 'var(--fk-radius-md)', border: 'none', cursor: 'pointer',
        whiteSpace: 'nowrap',
        color: active ? 'var(--fk-brand-ink)' : 'var(--fk-text-muted)',
        background: active ? 'var(--fk-brand-tint)' : hover ? 'var(--fk-surface-sunken)' : 'transparent',
        transition: 'background var(--fk-duration) var(--fk-ease)',
      }}
    >{tab.label}</button>
  )
}
