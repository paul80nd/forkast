// Pure normalisation for the in-app recipe editor (title, description, card code). The Dexie
// write lives in src/app/recipeEdit.ts; keep this side-effect-free and unit-tested.

import type { Recipe } from '../schema/recipe'

/** The recipe fields the full-view editor can change — scalar text plus the tag/allergen lists. */
export type RecipeEdit = Partial<
  Pick<Recipe, 'title' | 'description' | 'recipeCode' | 'tags' | 'allergens'>
>

/**
 * Tidy a free-typed chip list: trim each entry, drop the blanks, and de-duplicate
 * case-insensitively (first spelling wins), preserving order. Used for `tags` and `allergens`.
 */
export function normalizeStringList(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const item = raw.trim()
    if (!item) continue
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/**
 * Clean a user edit before it's merged onto a recipe:
 * - trims every provided scalar;
 * - **omits** `title` when it trims to empty (a blank title must never overwrite the real one);
 * - maps a blank `recipeCode` to `undefined` (an empty card code clears the field);
 * - keeps `description` as its trimmed value (empty is allowed);
 * - normalises `tags`/`allergens` via `normalizeStringList` (an empty array clears them).
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
  if (patch.tags !== undefined) {
    clean.tags = normalizeStringList(patch.tags)
  }
  if (patch.allergens !== undefined) {
    clean.allergens = normalizeStringList(patch.allergens)
  }
  return clean
}
