import { useRef, useState } from 'react'
import { exportBackup, importBackup, type RestoreResult } from '../app/backup'

// Save / Open: a self-contained snapshot of every table (recipes + all curation) to a
// JSON file, and a wipe-and-restore back from one. Safari has no File System Access API,
// so Save downloads via an anchor + object URL. The heavy lifting lives in the app layer;
// this is the thin shell.
export function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'save' | 'open' | null>(null)
  const [restored, setRestored] = useState<RestoreResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Backup</h2>
      <p className="mt-1 text-sm text-stone-500">
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
          className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {busy === 'save' ? 'Saving…' : 'Save backup…'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
        >
          {busy === 'open' ? 'Restoring…' : 'Open backup…'}
        </button>
      </div>

      {restored && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-800">
          Restored <span className="font-semibold">{restored.recipes}</span>{' '}
          {restored.recipes === 1 ? 'recipe' : 'recipes'} and your curation.
          {restored.warnings.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-emerald-900/80">
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
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}
    </div>
  )
}
