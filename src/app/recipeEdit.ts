// Application layer: edit a recipe's scalar text fields (title, description, card code) in place.
// Recipes are otherwise reference data, but — like deleteRecipe (see src/app/cleanup.ts) — these
// edits mutate the `recipes` table directly. That's durable: the backup snapshot carries `recipes`,
// so edits export and restore. The trade-off is that a fresh re-import or a DEMO_VERSION re-seed can
// overwrite them, exactly as it would resurrect a deleted recipe. Bigger fields (ingredients, method)
// stay read-only for now. The pure cleaning lives in src/lib/recipeEdit.ts.

import { db } from '../db/db'
import { normalizeRecipeEdit, type RecipeEdit } from '../lib/recipeEdit'

/**
 * Merge cleaned `patch` fields onto a recipe and persist. A no-op if the recipe is missing or the
 * patch is empty. Blank titles are dropped by `normalizeRecipeEdit`, so the title never goes empty.
 */
export async function updateRecipeDetails(recipeId: string, patch: RecipeEdit): Promise<void> {
  const clean = normalizeRecipeEdit(patch)
  if (Object.keys(clean).length === 0) return
  const existing = await db.recipes.get(recipeId)
  if (!existing) return
  await db.recipes.put({ ...existing, ...clean })
}
