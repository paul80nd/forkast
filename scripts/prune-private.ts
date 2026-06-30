// Prune the private file cache to match a Save/Open export. After refining the
// collection in-app (deletions/groups/stars) and exporting a backup, the local
// raw/clean/image folders still hold the orphans of every deleted recipe. This
// reconciles them: keep only the files the export still references, delete the rest.
//
// Source-agnostic and manifest-driven (the export is the manifest), so it names no
// provider and lives in committed `scripts/` alongside acquire.ts.
//
// Mapping (verified against the data): the export's `recipes[]` carry `slug` and
// `image` (a bare filename). Keep `raw/<slug>.json` + `clean/<slug>.json` for every
// kept slug, keep `images/<recipe.image>` for every kept image filename — images use
// the slug basename but the extension varies (.jpg/.jpeg/.png), so we match the
// literal `image` field, not `<slug>.jpg`. Everything else in those three folders is
// an orphan.
//
// DESTRUCTIVE: dry-run by default (lists orphans + counts). Pass --confirm to unlink.
//
// Run with native Node (>=22 strips TS types — no build step):
//   node scripts/prune-private.ts <export.json> [--dir data/private] [--confirm]

import { readFile, readdir, unlink, access } from 'node:fs/promises'
import { join, basename } from 'node:path'

function parseArgs(argv: string[]): { positionals: string[]; flags: Record<string, string | boolean> } {
  const positionals: string[] = []
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) { positionals.push(a); continue }
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) { flags[key] = next; i++ }
    else flags[key] = true
  }
  return { positionals, flags }
}

const exists = (p: string) => access(p).then(() => true, () => false)

interface ExportedRecipe {
  slug?: string
  image?: string
}

/** Pull the recipe array out of a backup snapshot or a bare recipes dataset. */
function readRecipes(data: unknown): ExportedRecipe[] {
  if (Array.isArray(data)) return data as ExportedRecipe[]
  if (data && typeof data === 'object' && Array.isArray((data as any).recipes)) {
    return (data as any).recipes as ExportedRecipe[]
  }
  throw new Error('no recipes[] found — is this a Forkast export (backup or recipes.json)?')
}

/** Files to keep in a folder, and the orphans (everything else) to delete. */
async function planFolder(dir: string, keep: Set<string>): Promise<{ files: string[]; orphans: string[] }> {
  if (!(await exists(dir))) return { files: [], orphans: [] }
  const files = (await readdir(dir, { withFileTypes: true }))
    .filter((d) => d.isFile() && !d.name.startsWith('.'))
    .map((d) => d.name)
  const orphans = files.filter((f) => !keep.has(f))
  return { files, orphans }
}

function preview(names: string[], n = 5): string {
  if (names.length === 0) return ''
  const head = names.slice(0, n).join(', ')
  return names.length > n ? `${head}, … (+${names.length - n} more)` : head
}

async function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2))
  const exportPath = (flags.export as string) ?? positionals[0]
  const privateDir = (flags.dir as string) ?? 'data/private'
  const confirm = flags.confirm === true

  if (!exportPath) {
    console.error('Usage: node scripts/prune-private.ts <export.json> [--dir data/private] [--confirm]')
    process.exit(2)
  }

  const raw = await readFile(exportPath, 'utf8').catch(() => {
    throw new Error(`cannot read export: ${exportPath}`)
  })
  const recipes = readRecipes(JSON.parse(raw))
  if (recipes.length === 0) {
    throw new Error('export has 0 recipes — refusing to prune (this would delete everything)')
  }

  // Kept-file sets, one per folder.
  const keptSlugJson = new Set<string>()
  const keptImages = new Set<string>()
  for (const r of recipes) {
    if (typeof r.slug === 'string' && r.slug) keptSlugJson.add(`${r.slug}.json`)
    if (typeof r.image === 'string' && r.image) keptImages.add(basename(r.image))
  }

  const rawDir = join(privateDir, 'raw')
  const cleanDir = join(privateDir, 'clean')
  const imageDir = join(privateDir, 'images')

  const rawPlan = await planFolder(rawDir, keptSlugJson)
  const cleanPlan = await planFolder(cleanDir, keptSlugJson)
  const imagePlan = await planFolder(imageDir, keptImages)

  console.log(`Export:  ${exportPath}`)
  console.log(`Recipes kept: ${recipes.length} (${keptSlugJson.size} slugs, ${keptImages.size} image names)`)
  console.log('')
  const report = (label: string, plan: { files: string[]; orphans: string[] }) => {
    const kept = plan.files.length - plan.orphans.length
    console.log(`  ${label.padEnd(7)} ${String(plan.files.length).padStart(5)} files — keep ${kept}, delete ${plan.orphans.length}`)
    if (plan.orphans.length) console.log(`          orphans: ${preview(plan.orphans)}`)
  }
  report('raw/', rawPlan)
  report('clean/', cleanPlan)
  report('images/', imagePlan)
  console.log('')

  const totalOrphans = rawPlan.orphans.length + cleanPlan.orphans.length + imagePlan.orphans.length
  if (totalOrphans === 0) {
    console.log('Nothing to prune — the private cache already matches the export.')
    return
  }

  if (!confirm) {
    console.log(`DRY RUN — ${totalOrphans} orphan(s) across 3 folders, nothing deleted.`)
    console.log('Re-run with --confirm to delete them.')
    return
  }

  const unlinkAll = async (dir: string, names: string[]) => {
    for (const name of names) await unlink(join(dir, name))
  }
  await unlinkAll(rawDir, rawPlan.orphans)
  await unlinkAll(cleanDir, cleanPlan.orphans)
  await unlinkAll(imageDir, imagePlan.orphans)
  console.log(`Deleted ${totalOrphans} orphan(s): raw ${rawPlan.orphans.length}, clean ${cleanPlan.orphans.length}, images ${imagePlan.orphans.length}.`)
}

main().catch((err) => {
  console.error(`Error: ${(err as Error).message}`)
  process.exit(1)
})
