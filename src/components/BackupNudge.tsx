import { Link } from 'react-router-dom'
import { useBackupStatus } from '../hooks/useBackupStatus'

// Header reminder to save a backup, so the nudge isn't buried on the Config page. Shows
// only when there's no backup yet or it's gone stale (tone 'warn'); an amber ⚠ pill that
// links to Config, with the full message on hover. Silent once a recent backup exists.
export function BackupNudge() {
  const status = useBackupStatus()
  if (status.tone !== 'warn') return null

  return (
    <div className="group relative">
      <Link
        to="/config"
        aria-label={status.text}
        className="flex items-center gap-1.5 rounded-md border border-warn-tint bg-warn-wash px-2 py-1 text-warn-ink transition hover:bg-warn-tint"
      >
        <span aria-hidden>⚠</span>
        <span className="hidden text-xs font-medium sm:inline">{status.short}</span>
      </Link>
      {/* Positioned wrapper with a transparent pt-1 bridge so moving the mouse from the pill
          onto the popover never crosses a dead gap (which would drop the hover and close it).
          No pointer-events-none, so the popover itself stays hoverable. */}
      <div className="absolute right-0 top-full z-20 hidden pt-1 group-hover:block group-focus-within:block">
        <div
          role="tooltip"
          className="w-64 rounded-lg border border-warn-tint bg-card p-2.5 text-xs text-muted shadow-md"
        >
          {status.text} <span className="font-medium text-brand-ink">Open Config →</span>
        </div>
      </div>
    </div>
  )
}
