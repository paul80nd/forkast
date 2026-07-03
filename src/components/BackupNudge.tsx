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
        className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700 transition hover:bg-amber-100"
      >
        <span aria-hidden>⚠</span>
        <span className="hidden text-xs font-medium sm:inline">{status.short}</span>
      </Link>
      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-64 rounded-lg border border-amber-200 bg-white dark:bg-stone-100 p-2.5 text-xs text-stone-600 shadow-md group-hover:block"
      >
        {status.text} <span className="font-medium text-orange-600">Open Config →</span>
      </div>
    </div>
  )
}
