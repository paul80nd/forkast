# Image pack — feature spec

The app is local-first and can run either from `npm run dev` or from the hosted/installed
build. In dev a Vite middleware serves imported recipe images straight off disk (the
`forkast-private-images` plugin in `vite.config.ts`); on the hosted build there is no such
server, so imported-recipe images 404. The **image pack** closes that gap: it lets you load your
own recipe images **into the browser once**, so the hosted/installed app shows them without any
server — while keeping them out of the durable backup, because they're regenerable, not precious.

> A **feature spec**: the design and rationale for one area, sitting alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). It's living
> documentation — the app-layer logic ships with a Gherkin scenario in
> `features/image-pack.feature` (the executable proof) plus unit tests; this prose keeps the *why*.

## Why this is safe now

Images were deliberately kept out of IndexedDB originally (`vite.config.ts` notes it): browsers
may evict idle site data, most eagerly on the strict/reference target. Two things changed that
calculus:

- **Persistent storage.** Once the app is **installed** (added to the dock / home screen), the
  browser grants persistent storage, so the working store is exempt from idle/pressure eviction.
  See [`spec.md`](spec.md) durability + the Config → Storage card (`src/components/StorageUsage.tsx`).
- **Quota.** Browsers report tens of GB of per-origin quota on a desktop machine; a full image set
  (order of ~1 GB) is a low single-digit percentage of it.

So images-in-IndexedDB is now cheap and safe. And because they remain **re-importable**, the
worst case (an eviction, or moving to a new machine) costs one re-import — never data loss.

## The model

### A separate, disposable cache database

Images live in their **own IndexedDB database** (`forkast-images`, `src/db/images.ts`), *not* in
the main `forkast` store:

- The Save/Open backup (`src/app/backup.ts`) enumerates the main store's tables explicitly, so a
  separate database is **automatically excluded** from the exported JSON. The backup stays small
  and about *your data* (stars, plans, cooked history, bindings) — images never bloat it.
- It signals intent: this is a **cache**, wiped and rebuilt freely, decoupled from the main
  store's schema versioning.

**Content-addressed**, so a dish's variant swaps — which share a byte-identical hero photo (the
image hash *is* the variant group key at import time) — are stored **once**, not once per
filename. This is the on-disk hardlink dedup (`scripts/dedupe-images.ts`) carried into IndexedDB.
Two tables (`src/db/images.ts`):

```ts
blobs: 'hash'   // { hash: string; blob: Blob; size: number }  — one copy per distinct image
names: 'name'   // { name: string; hash: string }              — filename → the hash it resolves to
```

`names` is keyed by the recipe's `image` value (a bare filename), so re-importing recipes never
orphans a stored image — filenames are stable across imports. Ingestion hashes each file
(SHA-256), writes the blob only if that hash isn't already held, then maps the filename to it; so
loading the whole folder collapses the variant duplicates automatically.

### Ingestion — a directory picker, no new dependency

Config gains a **Recipe images** card (beneath the Storage card). It uses a directory picker
(`<input type="file" webkitdirectory multiple>`) pointed at the local images folder
(`data/private/images`). This needs **no new dependency** and **no change to the import
pipeline** — you point the app at the folder you already have.

- On pick, non-image files are ignored and each image is stored (deduped by content), with
  progress (`N / total`).
- The card then shows a stored summary (`imageStats()`: filename count, distinct-image count when
  it differs, deduplicated bytes) and a **Clear** button.
- Images are stored **as-is** (their existing resolution) — no in-browser resize. Given persisted
  storage and ample quota, the simplicity and full sharpness are worth the ~1 GB. (An optional
  canvas-based downscale could be added later if footprint ever matters; explicitly out of scope
  here.)

App-layer use-cases (`src/app/images.ts`, driven by tests below): `putImages(files, onProgress)`,
`getImageBlob(name)`, `imageStats()`, `clearImages()`.

### Resolution — prefer the store, fall back to the network

Today every recipe image renders via `resolveAsset(recipe.image)` (`src/lib/assets.ts`). Note the
existing distinction that this feature preserves:

- **Bare filename** (`"dish.jpg"`) — an *imported* image → the private-images route / this cache.
- **Path with a slash** (`"demo/images/x.svg"`) — a *committed* demo asset → resolved against the
  app base, **untouched** by this feature.

A new `useRecipeImage(ref)` hook (`src/hooks/`) replaces the `resolveAsset(...)` calls at the
`<img>` call sites (Browse card, recipe detail, Curate, Plan, Compare, Variants). Its order:

1. If `ref` is a bare filename **and** a blob for it exists → an **object URL** for that blob.
2. Otherwise → `resolveAsset(ref)` unchanged (dev middleware serves it; the hosted build 404s).
3. On image load error → a neutral **placeholder tile** (brand-tint), so a missing image degrades
   gracefully rather than showing a broken-image glyph.

Object URLs are **reference-counted** in a small module-level registry: the URL is created once
per filename and revoked only when the last mounted user unmounts. (Not a fixed-cap LRU — Browse
accumulates cards as you scroll rather than unmounting them, so a capped pool could revoke a URL
still on screen.) That keeps a stable URL per filename, so re-rendering doesn't re-create/flicker
its image, while freeing memory as you navigate away.

Consequence: once the pack is imported, images resolve **entirely from IndexedDB**, bypassing the
network — so no service-worker change is needed. In dev the cache is typically empty, so rendering
falls through to the existing middleware; both paths keep working.

## Scope

- **In:** store your images in-browser once; show them in the hosted/installed app; keep them out
  of the JSON backup; graceful placeholder when absent.
- **Out:** any change to the import pipeline; committing images (the privacy firewall forbids it —
  the pack is loaded at runtime from a local folder, never committed); in-browser resizing;
  syncing images between devices (re-import per device, by design).

## Testing

Unlike the browser-only PWA wiring, this has real app-layer logic and is tested at both tiers:

- **Unit** (`src/app/images.test.ts` or beside the lib): `putImages` → `getImageBlob` round-trip,
  filename dedup, `imageStats` totals, `clearImages`.
- **Feature** (`features/image-pack.feature`): given recipes and a stored pack, the app resolves a
  recipe's image from the store; given no pack, it falls back (verbatim ref) — driven against
  `fake-indexeddb`, below the UI.

A [`decisions.md`](decisions.md) entry records the architectural call (separate cache DB, excluded
from backup, re-importable) when this is built.
