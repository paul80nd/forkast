// Pure helpers for the free-label lists on recipes (`tags` and `allergens`): collecting the
// distinct set across the collection (for autocomplete) and tallying usage (for the manager).
// No Dexie/I-O here — the app layer feeds these `db.recipes.toArray()`.

import type { Recipe } from '../schema/recipe'

/** Which free-label field of a recipe we're operating on. */
export type LabelKind = 'tags' | 'allergens'

/**
 * Distinct label values across `recipes`, folded to one spelling per case-insensitive key
 * (first seen wins) and sorted alphabetically. Used to populate add-box autocomplete.
 */
export function distinctLabels(recipes: Recipe[], kind: LabelKind): string[] {
  const seen = new Map<string, string>()
  for (const r of recipes) {
    for (const raw of r[kind]) {
      const value = raw.trim()
      if (!value) continue
      const key = value.toLowerCase()
      if (!seen.has(key)) seen.set(key, value)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

/** A label and how many recipes carry it. */
export interface LabelUsage {
  value: string
  count: number
}

/**
 * Every distinct label with a count of the recipes carrying it (each recipe counted once per
 * label). Folded case-insensitively like {@link distinctLabels}; sorted alphabetically.
 */
export function labelUsage(recipes: Recipe[], kind: LabelKind): LabelUsage[] {
  const tally = new Map<string, LabelUsage>()
  for (const r of recipes) {
    const seenInRecipe = new Set<string>()
    for (const raw of r[kind]) {
      const value = raw.trim()
      if (!value) continue
      const key = value.toLowerCase()
      if (seenInRecipe.has(key)) continue
      seenInRecipe.add(key)
      const existing = tally.get(key)
      if (existing) existing.count++
      else tally.set(key, { value, count: 1 })
    }
  }
  return [...tally.values()].sort((a, b) => a.value.localeCompare(b.value))
}
