import { useEffect, useState } from 'react'
import { putImages, imageStats, clearImages, type ImageStats } from '../app/images'
import { formatBytes } from '../lib/storageEstimate'

// Config → Recipe images: load your own recipe photos into the browser once, so the
// hosted/installed build shows them without the dev-only image server — see
// docs/image-pack-spec.md. A directory picker (no new dependency) points at your local
// images folder; files are stored in a separate, disposable cache DB (excluded from the
// JSON backup) and deduplicated by content, so a dish's variant swaps share one image.
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i

export function RecipeImages() {
  const [stats, setStats] = useState<ImageStats | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    void imageStats().then(setStats)
  }, [])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) => IMAGE_RE.test(f.name))
    // Let the same folder be re-picked (onChange won't fire twice for an identical value).
    e.target.value = ''
    if (!picked.length) return
    setProgress({ done: 0, total: picked.length })
    await putImages(picked, (done, total) => setProgress({ done, total }))
    setProgress(null)
    setStats(await imageStats())
  }

  async function onClear() {
    await clearImages()
    setStats(await imageStats())
  }

  const stored = stats && stats.names > 0
  const busy = progress !== null

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">Recipe images</h2>
      <p className="mt-1 text-sm text-muted">
        Load your recipe photos into this browser once so they show without a server. They’re
        kept in a separate cache — not in your JSON backup — so re-loading from your images
        folder is always safe. Identical photos across a dish’s variants are stored once.
      </p>

      {stored && (
        <p className="mt-3 text-sm">
          <span className="font-medium text-ink">{stats.names.toLocaleString()} images</span>
          <span className="text-muted">
            {stats.blobs < stats.names && ` · ${stats.blobs.toLocaleString()} unique`} ·{' '}
            {formatBytes(stats.bytes)} stored
          </span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label
          className={`cursor-pointer rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800 ${
            busy ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {stored ? 'Load more images…' : 'Load images…'}
          <input
            type="file"
            multiple
            accept="image/*"
            // webkitdirectory isn't in the React input types; set it as an attribute so the
            // picker chooses a folder. Falls back to multi-file selection where unsupported.
            ref={(el) => el?.setAttribute('webkitdirectory', '')}
            className="sr-only"
            disabled={busy}
            onChange={onPick}
          />
        </label>

        {stored && !busy && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface"
          >
            Clear
          </button>
        )}

        {busy && (
          <span className="text-sm text-muted" role="status">
            Storing {progress.done.toLocaleString()} / {progress.total.toLocaleString()}…
          </span>
        )}
      </div>
    </div>
  )
}
