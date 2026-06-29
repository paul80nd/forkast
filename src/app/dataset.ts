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
 * How an import treats recipes already in the store:
 * - `additive` (default) — upsert by id: new recipes added, existing refreshed, and
 *   recipes the file doesn't mention kept. This is how you re-expand the collection.
 * - `replace` — clear every recipe first, then load the file.
 */
export type ImportMode = 'additive' | 'replace'

/**
 * Import a recipe dataset and mark the store as user-owned so the first-run demo seed
 * never overwrites it. Accepts the raw JSON text, the parsed wrapper, or a bare recipe
 * array. User curation (stars, plans, cooked history, groups) lives in other tables and
 * is left untouched by both modes.
 *
 * Additive only preserves existing *user* recipes: if the store is currently demo-seeded
 * (or empty), even an additive import clears first, so demo placeholders never mix into a
 * real import.
 */
export async function importRecipeDataset(
  input: unknown,
  mode: ImportMode = 'additive',
): Promise<ImportResult> {
  const { recipes, errors, skipped } = parseRecipeDataset(input)

  await db.transaction('rw', db.recipes, db.settings, async () => {
    const source = (await db.settings.get('dataSource'))?.value
    if (mode === 'replace' || source !== 'user') {
      await db.recipes.clear()
    }
    await db.recipes.bulkPut(recipes)
    await db.settings.put({ key: 'dataSource', value: 'user' })
  })

  return { imported: recipes.length, skipped, errors }
}
