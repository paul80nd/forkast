import { useEffect, useState } from 'react'
import { useStorageEstimate } from '../hooks/useStorageEstimate'
import { imageStats } from '../app/images'
import { formatBytes } from '../lib/storageEstimate'

// Config → Storage: how much space the app is using in this browser and whether the browser
// has promised (persisted) not to evict it. Thin shell over useStorageEstimate; the numbers
// and copy are shaped in ../lib/storageEstimate. The bar is decorative (aria-hidden) — the
// figures are in text right beside it, so screen readers get the real content.
export function StorageUsage() {
  const { display, loading, canRequestPersist, requestPersist } = useStorageEstimate()
  // Set only when a request was made and the browser declined — so the click always has a
  // visible result (granting flips the banner to calm; declining shows this note).
  const [declined, setDeclined] = useState(false)
  // The estimate is origin-wide, so it already includes the recipe-image cache. Surface how
  // much of it is that cache — it's re-importable and deliberately kept out of the backup, so
  // it reads differently from your precious data.
  const [imageBytes, setImageBytes] = useState<number | null>(null)
  useEffect(() => {
    void imageStats().then((s) => setImageBytes(s.bytes))
  }, [])

  async function onRequest() {
    const granted = await requestPersist()
    setDeclined(!granted)
  }

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Storage</h2>
      <p className="mt-1 text-sm text-muted">
        How much space this app is using in your browser (all of it — your data plus the
        recipe-image cache), and whether the browser has promised to keep it. Your saved JSON
        backup is the durable copy of the data.
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-muted">Checking…</p>
      ) : !display!.supported ? (
        <p className="mt-3 text-sm text-muted">
          This browser doesn’t report storage usage.
        </p>
      ) : (
        <>
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">{display!.usageLabel} used</span>
              <span className="text-muted">
                {display!.percent != null
                  ? `${display!.percentLabel} of ${display!.quotaLabel}`
                  : display!.quotaLabel}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-brand-700"
                style={{ width: `${display!.barPct}%` }}
              />
            </div>
            {imageBytes != null && imageBytes > 0 && (
              <p className="mt-1.5 text-xs text-muted">
                Including {formatBytes(imageBytes)} of recipe images — a re-importable cache,
                not part of your backup.
              </p>
            )}
          </div>

          <p
            className={`mt-3 text-sm ${
              display!.persist.tone === 'warn'
                ? 'rounded-lg border border-warn-tint bg-warn-wash p-3 text-warn-ink'
                : 'text-muted'
            }`}
          >
            {display!.persist.text}
          </p>

          {canRequestPersist && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onRequest}
                className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface"
              >
                Request persistent storage
              </button>
              {declined && (
                <p className="mt-2 text-sm text-muted">
                  The browser declined for now. It typically grants this once you’ve used the
                  app a few times, bookmarked it, or added it to your dock or home screen —
                  try again after that. Keeping a saved backup covers you either way.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
