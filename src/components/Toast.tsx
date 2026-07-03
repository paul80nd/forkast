import { useEffect } from 'react'
import type { ReactNode } from 'react'

/**
 * A transient confirmation pill, bottom-centre, with an optional action (e.g. "Undo") —
 * reassurance after an auto-advancing action (rate & move on, delete, …). Render it only
 * while a message exists; the host owns that state and `onClose` fires after `duration` so
 * it can unmount. Remount it (change its `key`) to restart the timer for a fresh message.
 *
 * The pill inverts with the theme (dark-on-light / light-on-dark) so it always contrasts;
 * the action uses the same guaranteed-contrast pairing (not a brand tint, which would miss
 * AA on the inverted background) and reads as a control via weight + underline.
 */
export function Toast({
  children,
  action,
  onAction,
  onClose,
  duration = 3600,
}: {
  children: ReactNode
  action?: ReactNode
  onAction?: () => void
  onClose?: () => void
  duration?: number
}) {
  useEffect(() => {
    if (!duration || !onClose) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [duration, onClose])

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 inline-flex max-w-[90vw] -translate-x-1/2 items-center gap-3.5 rounded-full bg-ink px-4 py-2.5 text-sm text-card shadow-lg"
    >
      <span>{children}</span>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="font-semibold text-card underline underline-offset-2 hover:no-underline"
        >
          {action}
        </button>
      )}
    </div>
  )
}
