// Pass 1 — Acquire. Source-agnostic: the provider's URLs + image hints live in a
// config (kept private), so this code names no provider. For each slug it fetches the
// raw recipe JSON verbatim and one image into a local cache. Idempotent (skips what's
// already cached) and rate-limited — the only networked pass.
//
// Run with native Node (>=22 strips TS types — no build step):
//   node scripts/acquire.ts --config <config.json> --slugs <slugs.txt> [--limit N] [--force]

import { readFile, writeFile, mkdir, access, rename } from 'node:fs/promises'
import { join, extname } from 'node:path'

interface AcquireConfig {
  /** Recipe endpoint with a `{slug}` placeholder. */
  recipeApiUrl: string
  rawDir: string
  imageDir: string
  /** Where the images live in the raw JSON, and which width to prefer. */
  image?: { path: string; urlField: string; widthField: string; preferWidth: number }
  rateLimitMs: number
  userAgent: string
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) { out[key] = next; i++ }
    else out[key] = true
  }
  return out
}

const exists = (p: string) => access(p).then(() => true, () => false)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Walk a dotted path into a parsed JSON object. */
function getPath(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
}

/** Pick the image URL whose width is closest to the preferred width. */
function pickImageUrl(json: any, cfg: NonNullable<AcquireConfig['image']>): string | undefined {
  const images = getPath(json, cfg.path)
  if (!Array.isArray(images) || images.length === 0) return undefined
  const dist = (img: any) => Math.abs((img[cfg.widthField] ?? 0) - cfg.preferWidth)
  const best = images.reduce((a, b) => (dist(b) < dist(a) ? b : a))
  return best?.[cfg.urlField]
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const configPath = args.config as string
  const slugsPath = args.slugs as string
  if (!configPath || !slugsPath) {
    console.error('usage: node scripts/acquire.ts --config <config.json> --slugs <slugs.txt> [--limit N] [--force]')
    process.exit(1)
  }

  const full = JSON.parse(await readFile(configPath, 'utf8'))
  const cfg: AcquireConfig = full.acquire ?? full
  const force = Boolean(args.force)
  const limit = args.limit ? Number(args.limit) : Infinity

  let slugs = (await readFile(slugsPath, 'utf8'))
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'))
  if (Number.isFinite(limit)) slugs = slugs.slice(0, limit)

  await mkdir(cfg.rawDir, { recursive: true })
  await mkdir(cfg.imageDir, { recursive: true })

  let rawFetched = 0
  let rawSkipped = 0
  let imgFetched = 0
  const failed: string[] = []

  for (const [i, slug] of slugs.entries()) {
    const tag = `[${i + 1}/${slugs.length}] ${slug}`
    const rawPath = join(cfg.rawDir, `${slug}.json`)
    let networked = false

    try {
      // Recipe JSON — from cache when present, else fetch + cache.
      let json: any
      if (!force && (await exists(rawPath))) {
        json = JSON.parse(await readFile(rawPath, 'utf8'))
        rawSkipped++
      } else {
        const res = await fetch(cfg.recipeApiUrl.replace('{slug}', slug), {
          headers: { 'user-agent': cfg.userAgent },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        json = JSON.parse(text) // validate before caching
        // Atomic write: a kill mid-write leaves a .tmp, never a half file that a
        // resume would mistake for complete and skip.
        await writeFile(`${rawPath}.tmp`, text)
        await rename(`${rawPath}.tmp`, rawPath)
        rawFetched++
        networked = true
      }

      // One image — fetched only when missing, independent of the JSON cache, so a
      // prior image failure retries on re-run without re-downloading the JSON.
      if (cfg.image) {
        const imgUrl = pickImageUrl(json, cfg.image)
        if (imgUrl) {
          const ext = extname(new URL(imgUrl).pathname) || '.jpg'
          const imgPath = join(cfg.imageDir, `${slug}${ext}`)
          if (force || !(await exists(imgPath))) {
            const ir = await fetch(imgUrl, { headers: { 'user-agent': cfg.userAgent } })
            if (ir.ok) {
              await writeFile(`${imgPath}.tmp`, Buffer.from(await ir.arrayBuffer()))
              await rename(`${imgPath}.tmp`, imgPath)
              imgFetched++
              networked = true
            }
          }
        }
      }

      console.log(`  ${tag} ✓`)
    } catch (err) {
      failed.push(slug)
      console.log(`  ${tag} ✗ ${(err as Error).message}`)
    }

    if (networked) await sleep(cfg.rateLimitMs)
  }

  console.log(
    `\nacquire done — recipes: ${rawFetched} fetched / ${rawSkipped} cached · ` +
      `images: ${imgFetched} fetched · failed ${failed.length}`,
  )
  if (failed.length) console.log('failed slugs:', failed.join(', '))
}

main().catch((e) => { console.error(e); process.exit(1) })
