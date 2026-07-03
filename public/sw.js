// Forkast service worker — makes the app installable (a PWA, which also helps the browser
// grant persistent storage) and gives basic offline via a runtime cache of the app shell.
//
// It caches nothing private: only same-origin GETs of the built app (on Pages that's the
// public demo build). Your imported recipes and curation live in IndexedDB, never here.
// Navigations are network-first so a fresh deploy always wins while online; content-hashed
// assets are cache-first (their names change on rebuild, so cached copies are never stale).

const CACHE = 'forkast-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // App shell / navigations: network-first, falling back to the cached shell when offline.
  // Under HashRouter every route is served by the same base document, so one entry covers all.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() =>
          caches.match(request).then((c) => c || caches.match(self.registration.scope)),
        ),
    )
    return
  }

  // Static assets (content-hashed, immutable): cache-first, populating the cache on first hit.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})
