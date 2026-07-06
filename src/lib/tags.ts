// Pure helpers for the free-label lists on recipes (`tags` and `allergens`): collecting the
// distinct set across the collection (for autocomplete) and tallying usage (for the manager).
// No Dexie/I-O here — the app layer feeds these `db.recipes.toArray()`.

import type { Recipe } from '../schema/recipe'
import { normalizeStringList } from './recipeEdit'

/** Which free-label field of a recipe we're operating on. */
export type LabelKind = 'tags' | 'allergens'

/**
 * Rewrite one recipe's label list for a rename / merge / delete: every entry whose folded value
 * is in `fromKeys` becomes `to`, then the list is normalised (trimmed, blanks dropped, de-duped).
 * An empty `to` therefore deletes the matched labels; merging into an existing label collapses the
 * duplicate. `fromKeys` holds lower-cased spellings. Pure — the app layer maps this over recipes.
 */
export function applyRelabel(labels: string[], fromKeys: Set<string>, to: string): string[] {
  const mapped = labels.map((l) => (fromKeys.has(l.trim().toLowerCase()) ? to : l))
  return normalizeStringList(mapped)
}

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

/**
 * Does a recipe's label list satisfy a filter selection? Empty `selected` always matches (the
 * filter is off). Case-insensitive. Modes: `all` — carries every selected label (tag AND filter);
 * `any` — carries at least one (allergen "only"); `none` — carries none (allergen "avoid").
 */
export function matchesLabels(
  labels: string[],
  selected: string[],
  mode: 'all' | 'any' | 'none',
): boolean {
  if (selected.length === 0) return true
  const have = new Set(labels.map((l) => l.trim().toLowerCase()))
  const want = selected.map((s) => s.trim().toLowerCase())
  if (mode === 'all') return want.every((w) => have.has(w))
  const anyPresent = want.some((w) => have.has(w))
  return mode === 'any' ? anyPresent : !anyPresent
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
