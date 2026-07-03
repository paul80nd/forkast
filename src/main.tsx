import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { seedDemoIfEmpty, seedDictionaryIfEmpty } from './db/seed'
import './index.css'

// Ask the browser to keep our IndexedDB from being evicted. Evergreen browsers may clear
// idle site data under storage pressure (Safari most eagerly), taking a user's
// ratings/plans/bindings with it — the JSON export is still the durable backup, but
// persistence buys headroom against silent loss. Idempotent; no-op where unsupported (or
// where the grant is refused). Only requested if not already granted.
if (navigator.storage?.persist) {
  navigator.storage
    .persisted()
    .then((already) => (already ? true : navigator.storage.persist()))
    .catch(() => {})
}

// Register the service worker (makes the app installable + basic offline). Production only —
// in dev it would fight Vite HMR and the private-images middleware. BASE_URL keeps the scope
// correct under the /forkast/ sub-path on Pages. Best-effort; failure is non-fatal.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}

// Load the bundled demo dataset + seed the ingredient dictionary on first run (both no-op
// once data exists).
seedDemoIfEmpty().catch((err) => console.error('Demo seed failed:', err))
seedDictionaryIfEmpty().catch((err) => console.error('Dictionary seed failed:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
