// Application layer: the image-pack cache use-cases. The hosted/installed build has no
// image server (the dev-only Vite middleware serves imported photos off disk), so this loads
// your own recipe images into the browser once — see docs/image-pack-spec.md. Stored in a
// separate, disposable IndexedDB database (src/db/images.ts), excluded from the JSON backup.
//
// Content-addressed: images are hashed and stored once per distinct content, so a dish's
// variant swaps — which share a byte-identical hero photo — cost one blob, not one per
// filename. This is the seam the UI (the Config → Recipe images card) and the feature tests
// both drive; the resolution hook (src/hooks/useRecipeImage.ts) reads it at render time.

import { imagesDb } from '../db/images'

/** SHA-256 of a blob's bytes, hex — the content address. */
async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface ImageStats {
  /** Distinct recipe filenames that resolve to a stored image. */
  names: number
  /** Distinct images actually held (≤ names — duplicates collapse here). */
  blobs: number
  /** Total bytes stored (the deduplicated footprint). */
  bytes: number
}

/**
 * Store a set of image files (as picked from the local images folder), keyed by filename and
 * deduplicated by content. `onProgress(done, total)` reports after each file so the UI can
 * show "N / total". Re-storing a filename overwrites its mapping; an image whose content is
 * already held is not rewritten. Non-file inputs and empty blobs are skipped.
 */
export async function putImages(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const total = files.length
  let done = 0
  // Sequential (not Promise.all): bounds memory to one file's bytes at a time across a pack
  // that can run to ~1 GB, and lets progress advance smoothly.
  for (const file of files) {
    if (file.size > 0) {
      const hash = await hashBlob(file)
      await imagesDb.transaction('rw', imagesDb.names, imagesDb.blobs, async () => {
        if (!(await imagesDb.blobs.get(hash))) {
          await imagesDb.blobs.put({ hash, blob: file.slice(), size: file.size })
        }
        await imagesDb.names.put({ name: file.name, hash })
      })
    }
    onProgress?.(++done, total)
  }
}

/** The stored image for a recipe's `image` filename, or undefined when the pack lacks it. */
export async function getImageBlob(name: string): Promise<Blob | undefined> {
  const entry = await imagesDb.names.get(name)
  if (!entry) return undefined
  return (await imagesDb.blobs.get(entry.hash))?.blob
}

/** Summary for the Config card: filename count, distinct-image count, deduplicated bytes. */
export async function imageStats(): Promise<ImageStats> {
  const [names, blobs] = await Promise.all([
    imagesDb.names.count(),
    imagesDb.blobs.toArray(),
  ])
  return { names, blobs: blobs.length, bytes: blobs.reduce((sum, b) => sum + b.size, 0) }
}

/** Wipe the image cache — it's regenerable, so this is a safe reset. */
export async function clearImages(): Promise<void> {
  await imagesDb.transaction('rw', imagesDb.names, imagesDb.blobs, async () => {
    await Promise.all([imagesDb.names.clear(), imagesDb.blobs.clear()])
  })
}
