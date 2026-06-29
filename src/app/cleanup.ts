// Application layer: the single path for deleting a recipe. Delete is real (no tombstones
// — see docs/groups-spec.md); the durable backup is the export. Deleting also cascades to
// variant groups so no group is left pointing at a recipe that no longer exists.

import { db } from '../db/db'
import { detachRecipeFromGroups } from './groups'

/**
 * Delete a recipe and cascade: remove it from its variant group, dissolving that group if
 * it drops below two members. Atomic across both tables. Curation keyed by `recipeId`
 * (stars, notes, cooked history) is left as-is — harmless without the recipe, and cheap to
 * resurrect if the recipe is ever re-imported.
 */
export async function deleteRecipe(recipeId: string): Promise<void> {
  await db.transaction('rw', db.recipes, db.variantGroups, async () => {
    await db.recipes.delete(recipeId)
    await detachRecipeFromGroups(recipeId)
  })
}

/** Delete several recipes (the ★-cleanup bulk action), each cascading to its group. */
export async function deleteRecipes(recipeIds: string[]): Promise<void> {
  await db.transaction('rw', db.recipes, db.variantGroups, async () => {
    for (const id of recipeIds) {
      await db.recipes.delete(id)
      await detachRecipeFromGroups(id)
    }
  })
}
