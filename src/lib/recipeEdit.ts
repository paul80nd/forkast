// Pure normalisation for the in-app recipe editor (title, description, card code). The Dexie
// write lives in src/app/recipeEdit.ts; keep this side-effect-free and unit-tested.

import type { Recipe } from '../schema/recipe'

/** The scalar recipe fields the full-view editor can change. */
export type RecipeEdit = Partial<Pick<Recipe, 'title' | 'description' | 'recipeCode'>>

/**
 * Clean a user edit before it's merged onto a recipe:
 * - trims every provided field;
 * - **omits** `title` when it trims to empty (a blank title must never overwrite the real one);
 * - maps a blank `recipeCode` to `undefined` (an empty card code clears the field);
 * - keeps `description` as its trimmed value (empty is allowed).
 * Fields absent from the patch stay absent, so the caller preserves whatever the recipe had.
 */
export function normalizeRecipeEdit(patch: RecipeEdit): RecipeEdit {
  const clean: RecipeEdit = {}
  if (patch.title !== undefined) {
    const title = patch.title.trim()
    if (title) clean.title = title
  }
  if (patch.description !== undefined) {
    clean.description = patch.description.trim()
  }
  if (patch.recipeCode !== undefined) {
    const code = patch.recipeCode.trim()
    clean.recipeCode = code || undefined
  }
  return clean
}
