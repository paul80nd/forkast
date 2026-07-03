import { useRef, useState } from 'react'
import { exportBackup, importBackup, type RestoreResult } from '../app/backup'
import { todayISO } from '../lib/plan'
import { useBackupStatus, markBackupSaved } from '../hooks/useBackupStatus'

// Save / Open: a self-contained snapshot of every table (recipes + all curation) to a
// JSON file, and a wipe-and-restore back from one. We don't rely on the File System Access
// API (not in every evergreen browser — e.g. Safari), so Save downloads via an anchor +
// object URL. The heavy lifting lives in the app layer; this is the thin shell.
export function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'save' | 'open' | null>(null)
  const [restored, setRestored] = useState<RestoreResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const status = useBackupStatus()

  async function onSave() {
    setBusy('save')
    setError(null)
    setRestored(null)
    try {
      const snapshot = await exportBackup()
      const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `forkast-backup-${snapshot.exportedAt.slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      markBackupSaved(todayISO())
    } catch (err) {
      setError(`Save failed: ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so re-picking the same file fires change again
    if (!file) return
    // Open is a full replace — confirm before wiping the current state.
    if (
      !window.confirm(
        'Restore from this backup?\n\n' +
          'This REPLACES everything currently in the app — recipes, stars, plans, ' +
          'groups and shopping ticks — with the contents of the file. Continue?',
      )
    ) {
      return
    }
    setBusy('open')
    setError(null)
    setRestored(null)
    try {
      const text = await file.text()
      setRestored(await importBackup(text))
    } catch (err) {
      setError(`Restore failed: ${(err as Error).message}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Backup</h2>
      <p className="mt-1 text-sm text-muted">
        <span className="font-medium">Save</span> downloads a complete snapshot of your
        collection — recipes plus every refinement (stars, groups, plans, shopping). It's a
        true restore point: keep it somewhere safe.{' '}
        <span className="font-medium">Open</span> restores from one, replacing everything
        currently in the app.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={onFile}
        className="hidden"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={onSave}
          className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
        >
          {busy === 'save' ? 'Saving…' : 'Save backup…'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-50"
        >
          {busy === 'open' ? 'Restoring…' : 'Open backup…'}
        </button>
      </div>

      <p
        className={`mt-3 text-sm ${
          status.tone === 'warn'
            ? 'rounded-lg border border-warn-tint bg-warn-wash p-3 text-warn-ink'
            : 'text-muted'
        }`}
      >
        {status.text}
      </p>

      {restored && (
        <div className="mt-3 rounded-lg border border-brand-200 bg-positive-tint p-3 text-sm text-positive-ink">
          Restored <span className="font-semibold">{restored.recipes}</span>{' '}
          {restored.recipes === 1 ? 'recipe' : 'recipes'} and your curation.
          {restored.warnings.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-positive-ink">
              {restored.warnings.slice(0, 10).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {restored.warnings.length > 10 && (
                <li>…and {restored.warnings.length - 10} more.</li>
              )}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-ink">
          {error}
        </div>
      )}
    </div>
  )
}
