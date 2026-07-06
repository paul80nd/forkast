// Pure "use up ingredients" logic — no Dexie, no I/O. Given a use-up list (ingredients you
// want to cook down) it answers two things: which listed ingredients the current plan already
// uses (so the rest are "unused"), and which recipes across the collection use those unused
// ingredients, ranked by coverage. Matching works on **unbound** recipe lines too — that's most
// of them — by comparing ingredient names, so it's useful before any shopping-time binding.
//
// Design + rationale: docs/use-up-spec.md. The Dexie reads live in src/app/useUp.ts.

import type { Recipe, Ingredient } from '../schema/recipe'
import type { UseUpItem } from '../schema/userData'
import { normalizeName } from './shopping'
import { tokenize } from './similarity'

/**
 * Do two ingredient names refer to the same thing? True when one name's tokens (lowercased,
 * singularised, stopwords dropped) are a **subset** of the other's — so "chicken" matches
 * "chicken thighs" and "onion" matches "spring onions", while "pea" does not match "peach"
 * (token subset, never character substring). Deliberately inclusive: a use-up list wants to
 * catch every recipe that could burn the ingredient down.
 */
export function namesMatch(a: string, b: string): boolean {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 || tb.size === 0) return false
  const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta]
  for (const t of small) if (!large.has(t)) return false
  return true
}

/** Does a single recipe line satisfy a use-up item — by canonical id, existing binding, or name? */
export function lineMatchesItem(
  line: Ingredient,
  item: UseUpItem,
  bindings: ReadonlyMap<string, string>,
): boolean {
  if (item.ingredientId) {
    if (line.ingredientId === item.ingredientId) return true
    if (bindings.get(normalizeName(line.name)) === item.ingredientId) return true
  }
  return namesMatch(line.name, item.name)
}

/** Does any of a recipe's lines satisfy the item? */
export function recipeUsesItem(
  recipe: Recipe,
  item: UseUpItem,
  bindings: ReadonlyMap<string, string>,
): boolean {
  return recipe.ingredients.some((line) => lineMatchesItem(line, item, bindings))
}

/** The subset of `items` a recipe covers (uses at least one line for). */
export function coverageFor(
  recipe: Recipe,
  items: UseUpItem[],
  bindings: ReadonlyMap<string, string>,
): UseUpItem[] {
  return items.filter((item) => recipeUsesItem(recipe, item, bindings))
}

/** Per-item plan status: an item is "unused" when no planned recipe uses it. */
export function planCoverage(
  items: UseUpItem[],
  plannedRecipes: Recipe[],
  bindings: ReadonlyMap<string, string>,
): { item: UseUpItem; usedByPlan: boolean }[] {
  return items.map((item) => ({
    item,
    usedByPlan: plannedRecipes.some((r) => recipeUsesItem(r, item, bindings)),
  }))
}

/** A ranked suggestion: a recipe plus which use-up items it covers and its ★ (0 = unrated). */
export interface UseUpMatch {
  recipe: Recipe
  matched: UseUpItem[]
  stars: number
}

export interface RankOptions {
  bindings: ReadonlyMap<string, string>
  /** ★ by recipe id (missing = unrated, treated as 0 so it sorts below any rating). */
  starsById: ReadonlyMap<string, number>
  /** Recipes to leave out — typically the already-planned ids. */
  excludeIds?: ReadonlySet<string>
  /** Allergens that hard-exclude a recipe (household no-gos, e.g. "fish"). */
  noGoAllergens?: readonly string[]
}

/**
 * Rank the collection by how many of `items` each recipe uses. Drops recipes covering none,
 * the excluded ids, and any carrying a no-go allergen. Orders by coverage (most first), then ★
 * (favourites first, so unrated/binned sink), then title — deterministic, no randomness.
 */
export function rankUseUpRecipes(
  recipes: Recipe[],
  items: UseUpItem[],
  { bindings, starsById, excludeIds, noGoAllergens = [] }: RankOptions,
): UseUpMatch[] {
  if (items.length === 0) return []
  const out: UseUpMatch[] = []
  for (const recipe of recipes) {
    if (excludeIds?.has(recipe.id)) continue
    if (recipe.allergens.some((a) => noGoAllergens.includes(a))) continue
    const matched = coverageFor(recipe, items, bindings)
    if (matched.length === 0) continue
    out.push({ recipe, matched, stars: starsById.get(recipe.id) ?? 0 })
  }
  out.sort(
    (a, b) =>
      b.matched.length - a.matched.length ||
      b.stars - a.stars ||
      a.recipe.title.localeCompare(b.recipe.title),
  )
  return out
}
