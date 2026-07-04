import { useEffect, useState } from 'react'
import { resolveAsset } from '../lib/assets'
import { getImageBlob } from '../app/images'

// Resolve a recipe's `image` to a URL, preferring the in-browser image pack (so the
// hosted/installed build shows photos with no server) and otherwise falling back to
// resolveAsset — see docs/image-pack-spec.md. Only a bare filename can be in the pack; a
// path ("demo/images/x.svg") or absolute URL is a committed/remote asset and is passed
// straight through.
//
// Object URLs are reference-counted, not pooled by a fixed-size LRU: Browse accumulates
// cards as you scroll (they don't unmount), so a capped pool would revoke a URL still on
// screen. Instead each mounted user holds a ref; the URL is created once per filename and
// revoked only when the last user unmounts. That keeps a stable URL per filename (no
// flicker on re-render) and frees memory as you navigate away.

interface UrlEntry {
  url: string
  refs: number
}
const urls = new Map<string, UrlEntry>()

function acquire(name: string, blob: Blob): string {
  const entry = urls.get(name)
  if (entry) {
    entry.refs++
    return entry.url
  }
  const url = URL.createObjectURL(blob)
  urls.set(name, { url, refs: 1 })
  return url
}

function release(name: string): void {
  const entry = urls.get(name)
  if (!entry) return
  if (--entry.refs <= 0) {
    URL.revokeObjectURL(entry.url)
    urls.delete(name)
  }
}

const isBareFilename = (ref: string) =>
  !ref.includes('/') && !/^(https?:|data:|blob:)/.test(ref)

export function useRecipeImage(ref: string): string {
  // Start from the network/base fallback so the first paint is never blank; swap to the
  // stored blob's object URL once the async lookup resolves.
  const [src, setSrc] = useState(() => resolveAsset(ref))

  useEffect(() => {
    if (!isBareFilename(ref)) {
      setSrc(resolveAsset(ref))
      return
    }
    let active = true
    let held: string | null = null
    setSrc(resolveAsset(ref))
    getImageBlob(ref)
      .then((blob) => {
        if (!active) return
        if (blob) {
          held = ref
          setSrc(acquire(ref, blob))
        }
      })
      .catch(() => {
        /* fall back to the resolveAsset value already set */
      })
    return () => {
      active = false
      if (held) release(held)
    }
  }, [ref])

  return src
}
