// Deduplicate the private image cache by content hash, using hardlinks. Variant recipes
// share a byte-identical hero image, so a large fraction of the files are redundant copies.
// This replaces every duplicate with a hardlink to one shared inode: the data blocks are
// stored once, while every filename stays exactly where it is.
//
// Why hardlinks (not rename/delete): the app resolves images by their bare filename
// (recipes.json `image` → the /recipe-images route). Leaving filenames untouched means
// recipes.json, the in-app import, and transform.ts are all unaffected — and a future
// re-transform still finds every <slug> image. Only disk usage changes.
//
// Source-agnostic and names no provider, so it lives in committed scripts/ alongside
// acquire.ts / prune-private.ts.
//
// Idempotent: files already sharing an inode are left alone, so re-running is a no-op.
// Dry-run by default (reports what it would link); pass --confirm to relink. Each relink
// is done link-to-temp-then-rename, so an interruption can never lose an image.
//
// Assumes images are immutable (a recipe photo never changes in place). Hardlinks share
// storage, so editing one file would edit all its links — don't hand-edit this folder.
// Note: copying the folder with a tool that doesn't preserve hardlinks (Finder, plain zip)
// re-expands it to full size; `du -sh` shows the real on-disk usage.
//
// Run with native Node (>=22 strips TS types — no build step):
//   node scripts/dedupe-images.ts [--dir data/private/images] [--confirm]

import { readdir, readFile, stat, link, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

function parseArgs(argv: string[]): { flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) { flags[key] = next; i++ }
    else flags[key] = true
  }
  return { flags }
}

const mb = (n: number) => `${(n / 1048576).toFixed(0)} MB`

interface Entry { name: string; ino: number; size: number }

async function main() {
  const { flags } = parseArgs(process.argv.slice(2))
  const dir = (flags.dir as string) ?? 'data/private/images'
  const confirm = Boolean(flags.confirm)

  const names = (await readdir(dir)).filter((f) => !f.startsWith('.'))
  console.log(`Scanning ${names.length} files in ${dir} …`)

  // Group by content hash. Each entry keeps its inode (to spot already-linked files) and
  // size (all files in a hash group are byte-identical, hence the same size).
  const byHash = new Map<string, Entry[]>()
  let totalBytes = 0
  for (const name of names) {
    const p = join(dir, name)
    const s = await stat(p)
    if (!s.isFile()) continue
    totalBytes += s.size
    const hash = createHash('md5').update(await readFile(p)).digest('hex')
    const g = byHash.get(hash)
    if (g) g.push({ name, ino: s.ino, size: s.size })
    else byHash.set(hash, [{ name, ino: s.ino, size: s.size }])
  }

  // Plan the relinks: in each multi-file group, pick a canonical file (lowest name) and
  // relink every member that doesn't already share its inode. Reclaimable bytes per group
  // = (distinct inodes − 1) × size, since dedup collapses the group to a single inode.
  const plan: { from: string; to: string }[] = []
  let reclaim = 0
  let alreadyOptimal = 0
  let dupGroups = 0
  for (const group of byHash.values()) {
    if (group.length < 2) continue
    const inos = new Set(group.map((e) => e.ino))
    if (inos.size === 1) { alreadyOptimal++; continue }
    dupGroups++
    reclaim += (inos.size - 1) * group[0].size
    const canonical = [...group].sort((a, b) => a.name.localeCompare(b.name))[0]
    for (const e of group) {
      if (e.ino !== canonical.ino) plan.push({ from: canonical.name, to: e.name })
    }
  }

  console.log(`\n  files:            ${names.length}`)
  console.log(`  distinct images:  ${byHash.size}`)
  console.log(`  on disk now:      ${mb(totalBytes)}`)
  console.log(`  redundant copies: ${plan.length} across ${dupGroups} groups` +
    (alreadyOptimal ? ` (${alreadyOptimal} groups already linked)` : ''))
  console.log(`  reclaimable:      ${mb(reclaim)}  →  ${mb(totalBytes - reclaim)} after`)

  if (!plan.length) {
    console.log('\nNothing to do — the image cache is already deduplicated.')
    return
  }
  if (!confirm) {
    console.log(`\nDRY RUN — nothing changed. Re-run with --confirm to relink ${plan.length} file(s).`)
    return
  }

  let linked = 0
  for (const { from, to } of plan) {
    // Link the canonical file to a temp name, then atomically rename over the duplicate.
    // The canonical is never touched, so an interruption leaves every image intact.
    const tmp = join(dir, `${to}.dedupe-tmp`)
    await link(join(dir, from), tmp)
    await rename(tmp, join(dir, to)).catch(async (err) => { await unlink(tmp); throw err })
    linked++
  }
  console.log(`\nDeduplicated — relinked ${linked} file(s), reclaimed ${mb(reclaim)}.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
