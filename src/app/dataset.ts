// Application layer: dataset import use-case. This is the seam the UI and the
// feature tests both drive — pages stay thin shells over these calls, and the
// Gherkin steps exercise the real Dexie code paths (against fake-indexeddb) here,
// just below the React layer. Pure shaping/validation lives in src/lib/dataset.ts.

import { db } from '../db/db'
import { parseRecipeDataset } from '../lib/dataset'

export interface ImportResult {
  /** Recipes written to the working store. */
  imported: number
  /** Records dropped as unusable. */
  skipped: number
  /** Reasons for each dropped record. */
  errors: string[]
}

/**
 * Replace the reference recipe set with an imported dataset and mark the store as
 * user-owned so the first-run demo seed never overwrites it. Accepts the raw JSON
 * text, the parsed wrapper, or a bare recipe array. User curation (stars, plans,
 * cooked history) lives in other tables and is left untouched.
 */
export async function importRecipeDataset(input: unknown): Promise<ImportResult> {
  const { recipes, errors, skipped } = parseRecipeDataset(input)

  await db.transaction('rw', db.recipes, db.settings, async () => {
    await db.recipes.clear()
    await db.recipes.bulkPut(recipes)
    await db.settings.put({ key: 'dataSource', value: 'user' })
  })

  return { imported: recipes.length, skipped, errors }
}
