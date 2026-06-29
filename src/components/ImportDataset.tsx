import { useRef, useState } from 'react'
import { importRecipeDataset, type ImportResult } from '../app/dataset'

// File-picker import: read a recipes.json from disk and load it into the working
// store. This is also the path the durable Open/restore flow will reuse. The heavy
// lifting (validate + write) lives in the app layer; this is just the thin shell.
export function ImportDataset() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so re-picking the same file fires change again
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const text = await file.text()
      setResult(await importRecipeDataset(text))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-lg font-semibold">Dataset</h2>
      <p className="mt-1 text-sm text-stone-500">
        Import a recipe dataset (<code className="text-stone-600">recipes.json</code>).
        This replaces the current recipes; your stars, plans and history are kept.
      </p>

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
        className="mt-3 rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
      >
        {busy ? 'Importing…' : 'Import dataset…'}
      </button>

      {result && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-800">
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
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-emerald-900/80">
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
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-800">
          Import failed: {error}
        </div>
      )}
    </div>
  )
}
