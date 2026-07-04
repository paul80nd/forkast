import Dexie, { type Table } from 'dexie'

// A separate, disposable cache database for recipe images — NOT the main `forkast` store.
// Kept apart on purpose (see docs/image-pack-spec.md):
// - the Save/Open backup enumerates the main store's tables explicitly, so a distinct
//   database is automatically excluded from the exported JSON — images never bloat the backup;
// - it signals intent: this is a cache, wiped and rebuilt freely, decoupled from the main
//   store's schema versioning. Worst case (eviction / new machine) costs one re-import.
//
// Content-addressed so the variant images — byte-identical heroes shared across a dish's
// swaps — are stored once, not once per filename (the on-disk hardlink dedup, in IndexedDB):
// - `blobs` holds one copy of each distinct image, keyed by a hash of its bytes;
// - `names` maps each recipe's `image` filename to the hash it resolves to.
// Filenames are stable across imports, so re-importing recipes never orphans a stored image.

export interface StoredImageName {
  /** The recipe's `image` value — a bare filename, e.g. "beef-noodles.jpg". */
  name: string
  /** Content hash of the bytes this filename resolves to (→ `blobs.hash`). */
  hash: string
}

export interface StoredImageBlob {
  /** Content hash of the bytes (SHA-256, hex). */
  hash: string
  blob: Blob
  /** Byte length, denormalised so `imageStats` sums sizes without materialising blobs. */
  size: number
}

export class ForkastImagesDB extends Dexie {
  names!: Table<StoredImageName, string>
  blobs!: Table<StoredImageBlob, string>

  constructor() {
    super('forkast-images')
    this.version(1).stores({ names: 'name', blobs: 'hash' })
  }
}

export const imagesDb = new ForkastImagesDB()
