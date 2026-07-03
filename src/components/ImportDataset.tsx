import { useRef, useState } from 'react'
import { importRecipeDataset, type ImportResult } from '../app/dataset'

// File-picker import: read a recipes.json from disk and load it into the working
// store. This is also the path the durable Open/restore flow will reuse. The heavy
// lifting (validate + write) lives in the app layer; this is just the thin shell.
export function ImportDataset() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [replaceAll, setReplaceAll] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so re-picking the same file fires change again
    if (!file) return
    // Only "Replace all" is destructive — confirm that path; additive is safe.
    if (
      replaceAll &&
      !window.confirm(
        'Replace ALL current recipes with the contents of this file?\n\n' +
          'Your stars, plans and cooked history are kept. Continue?',
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const text = await file.text()
      setResult(await importRecipeDataset(text, replaceAll ? 'replace' : 'additive'))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Dataset</h2>
      <p className="mt-1 text-sm text-muted">
        Import a recipe dataset (<code className="text-muted">recipes.json</code>).
        By default this <span className="font-medium">adds new recipes and refreshes
        existing ones</span> by id — recipes already in your collection that aren’t in
        the file are kept. Your stars, plans and cooked history are always kept.
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={replaceAll}
          onChange={(e) => setReplaceAll(e.target.checked)}
          className="fk-check"
        />
        Replace all current recipes (clear first)
      </label>
      {replaceAll && (
        <p className="mt-2 rounded-lg border border-warn-tint bg-warn-wash px-3 py-2 text-sm text-warn-ink">
          <span className="font-semibold">Heads up:</span> this{' '}
          <span className="font-semibold">deletes every current recipe</span> before
          loading the file. Your stars, plans and cooked history are still kept.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        onChange={onFile}
        className="hidden"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="mt-3 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
      >
        {busy ? 'Importing…' : replaceAll ? 'Replace all…' : 'Import dataset…'}
      </button>

      {result && (
        <div className="mt-3 rounded-lg border border-brand-200 bg-positive-tint p-3 text-sm text-positive-ink">
          Imported <span className="font-semibold">{result.imported}</span>{' '}
          {result.imported === 1 ? 'recipe' : 'recipes'}
          {result.skipped > 0 && (
            <>
              {' '}— skipped <span className="font-semibold">{result.skipped}</span>{' '}
              unusable{' '}
              {result.skipped === 1 ? 'record' : 'records'}.
            </>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-positive-ink">
              {result.errors.slice(0, 10).map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {result.errors.length > 10 && (
                <li>…and {result.errors.length - 10} more.</li>
              )}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-ink">
          Import failed: {error}
        </div>
      )}
    </div>
  )
}
