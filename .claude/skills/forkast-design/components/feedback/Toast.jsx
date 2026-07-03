import React, { useEffect } from 'react'

/**
 * A transient confirmation pill, bottom-centre, with an optional action (e.g.
 * "Undo"). Self-dismisses after `duration` (pass onClose). Render it only while a
 * message exists; the host owns that state. The pill inverts with the theme so it
 * always contrasts (ink-on-light in dark mode, dark-on-light otherwise).
 */
export function Toast({ children, action, onAction, onClose, duration = 3600 }) {
  useEffect(() => {
    if (!duration || !onClose) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])
  return (
    <div role="status" style={{
      position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)', zIndex: 60,
      display: 'inline-flex', alignItems: 'center', gap: '14px', maxWidth: '90vw',
      background: 'var(--fk-text)', color: 'var(--fk-surface-card)', fontFamily: 'var(--fk-font-body)', fontSize: 'var(--fk-text-sm)',
      padding: '10px 16px', borderRadius: 'var(--fk-radius-full)', boxShadow: 'var(--fk-shadow-lg)',
    }}>
      <span>{children}</span>
      {action && <button type="button" onClick={onAction} style={{ background: 'none', border: 'none', color: 'var(--fk-brand)', fontWeight: 'var(--fk-weight-semibold)', cursor: 'pointer', font: 'inherit' }}>{action}</button>}
    </div>
  )
}
