import { db } from './db'
import { resolveAsset } from '../lib/assets'
import type { RecipeDataset } from '../schema/recipe'

// On first run (no recipes yet) load the bundled demo dataset so the app shows
// something without an import. Once the user imports their own data this is a
// no-op. Recipes are re-importable, so we never overwrite an existing set.
export async function seedDemoIfEmpty(): Promise<void> {
  const count = await db.recipes.count()
  if (count > 0) return

  const res = await fetch(resolveAsset('demo/recipes.json'))
  if (!res.ok) throw new Error(`Failed to load demo dataset: ${res.status}`)

  const dataset = (await res.json()) as RecipeDataset
  await db.recipes.bulkPut(dataset.recipes)
}
