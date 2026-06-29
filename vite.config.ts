import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'

// Private recipe images are large (~625 MB) and must never be committed (privacy
// firewall) nor held in IndexedDB (Safari evicts idle blobs). So serve them straight
// from the gitignored folder on disk at /recipe-images/<file>, in dev and preview —
// they never enter the bundle. resolveAsset() maps a bare image filename to this route.
const IMAGES_DIR = 'data/private/images'
const ROUTE = '/recipe-images/'
const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
}

function privateImages(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? ''
    if (!url.startsWith(ROUTE)) return next()
    // basename() strips any path so the request can't escape IMAGES_DIR.
    const name = basename(decodeURIComponent(url.slice(ROUTE.length).split('?')[0]))
    const file = join(IMAGES_DIR, name)
    if (!name || !existsSync(file) || !statSync(file).isFile()) {
      res.statusCode = 404
      return res.end('Not found')
    }
    res.setHeader('Content-Type', MIME[extname(name).toLowerCase()] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    createReadStream(file).pipe(res)
  }
  return {
    name: 'forkast-private-images',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), privateImages()],
})
