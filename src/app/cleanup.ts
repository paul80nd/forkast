// Application layer: the single path for deleting a recipe. Delete is real and total (no
// tombstones — see docs/groups-spec.md): the durable backup is the export, and re-importing
// a deleted recipe brings it back as a clean slate. So deleting a recipe also purges its
// associated user data — there's no point "hearing of it again".

import { db } from '../db/db'

/**
 * Delete recipes and everything tied to them, atomically:
 * - the recipe records,
 * - their place in any variant override (dissolving one left under two members),
 * - their curation (stars/notes/tags in `userData`) and `cooked` history,
 * - their place in any plan's `recipeIds`.
 *
 * Shopping tick state isn't per-recipe (it's plan-derived) and is left alone — stale keys
 * are ignored. Re-importing a deleted recipe later starts it fresh, with no old rating.
 */
export async function deleteRecipes(recipeIds: string[]): Promise<void> {
  if (recipeIds.length === 0) return
  const ids = new Set(recipeIds)
  await db.transaction(
    'rw',
    db.recipes,
    db.variantOverrides,
    db.userData,
    db.cooked,
    db.plans,
    async () => {
      for (const id of recipeIds) {
        await db.recipes.delete(id)
        await db.userData.delete(id)
        await db.cooked.where('recipeId').equals(id).delete()
      }
      // Drop the deleted recipes from any variant override they're named in.
      for (const o of await db.variantOverrides.toArray()) {
        const kept = o.recipeIds.filter((rid) => !ids.has(rid))
        if (kept.length === o.recipeIds.length) continue
        if (kept.length < 2) await db.variantOverrides.delete(o.id)
        else await db.variantOverrides.put({ ...o, recipeIds: kept, leadId: kept.includes(o.leadId) ? o.leadId : kept[0] })
      }
      // Drop the deleted recipes from any plan they're sitting in.
      for (const plan of await db.plans.toArray()) {
        if (plan.recipeIds.some((rid) => ids.has(rid))) {
          await db.plans.put({ ...plan, recipeIds: plan.recipeIds.filter((rid) => !ids.has(rid)) })
        }
      }
    },
  )
}

/** Delete a single recipe (and everything tied to it). */
export async function deleteRecipe(recipeId: string): Promise<void> {
  await deleteRecipes([recipeId])
}
