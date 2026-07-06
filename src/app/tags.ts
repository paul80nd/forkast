// Application layer: bulk tag/allergen maintenance across the whole collection — the seam the
// Config → Tags & allergens manager and the feature tests call. Like recipe editing, this mutates
// the `recipes` reference table in place (see docs/recipe-edit-spec.md): edits export with the
// backup; a re-import/re-seed can overwrite them. Pure rewriting lives in src/lib/tags.ts.

import { db } from '../db/db'
import { applyRelabel, type LabelKind } from '../lib/tags'

/**
 * Rename / merge / delete labels across every recipe: replace each label in `from` with `to`
 * (an empty `to` deletes them), on the given field. Rename = one `from`; merge = several `from`
 * with `to` the canonical spelling; delete = `to === ''`. Runs in one transaction and writes only
 * the recipes that actually change; returns how many were rewritten.
 */
export async function relabelRecipes(
  kind: LabelKind,
  from: string[],
  to: string,
): Promise<number> {
  const fromKeys = new Set(from.map((f) => f.trim().toLowerCase()).filter(Boolean))
  if (fromKeys.size === 0) return 0
  const target = to.trim()
  let changed = 0
  await db.transaction('rw', db.recipes, async () => {
    for (const recipe of await db.recipes.toArray()) {
      const next = applyRelabel(recipe[kind], fromKeys, target)
      // Only write when the list actually differs (order-sensitive equality is enough here).
      if (next.length === recipe[kind].length && next.every((v, i) => v === recipe[kind][i])) continue
      await db.recipes.put({ ...recipe, [kind]: next })
      changed++
    }
  })
  return changed
}
