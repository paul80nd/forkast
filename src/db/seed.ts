import { db } from './db'
import { resolveAsset } from '../lib/assets'
import { INGREDIENTS } from '../data/ingredients'
import type { RecipeDataset } from '../schema/recipe'

// Bump when the bundled demo dataset changes so demo users auto-refresh.
const DEMO_VERSION = 3

async function importDemo(): Promise<void> {
  const res = await fetch(resolveAsset('demo/recipes.json'))
  if (!res.ok) throw new Error(`Failed to load demo dataset: ${res.status}`)
  const dataset = (await res.json()) as RecipeDataset

  await db.transaction('rw', db.recipes, db.settings, async () => {
    await db.recipes.clear()
    await db.recipes.bulkPut(dataset.recipes)
    await db.settings.put({ key: 'dataSource', value: 'demo' })
    await db.settings.put({ key: 'demoVersion', value: DEMO_VERSION })
  })
}

/**
 * First run loads the bundled demo dataset. Demo data also refreshes when the
 * bundled version changes — but a user's own imported data is never touched.
 */
export async function seedDemoIfEmpty(): Promise<void> {
  const count = await db.recipes.count()
  if (count === 0) {
    await importDemo()
    return
  }
  const source = (await db.settings.get('dataSource'))?.value
  if (source === 'user') return
  const version = (await db.settings.get('demoVersion'))?.value
  if (version !== DEMO_VERSION) await importDemo()
}

/**
 * Seed the ingredient dictionary with the built-in defaults on first run. The dictionary is
 * generic knowledge (no provider data) and grows in-app via lazy binding, so seed only when
 * empty — never clobber a grown or restored dictionary.
 */
export async function seedDictionaryIfEmpty(): Promise<void> {
  if ((await db.dictionary.count()) === 0) {
    await db.dictionary.bulkPut(INGREDIENTS)
  }
}
