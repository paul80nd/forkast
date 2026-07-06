// Pure Browse pipeline: filter → collapse variants → sort, plus the deep-link param mapping.
// Kept out of the page so the filtering logic (where bugs hide) is unit-tested without React.
// Browse feeds these the live recipes/overrides and a recipeId→★ map.

import type { Recipe } from '../schema/recipe'
import type { Stars, VariantOverride } from '../schema/userData'
import { matchesLabels } from './tags'
import { resolveDishes } from './variants'

export type SortKey = 'rating' | 'time' | 'name'
export type RatingFilter = 'all' | 'unrated' | '5' | '4plus' | '3plus'
export type AllergenMode = 'avoid' | 'only'

/** The full set of Browse filter selections. */
export interface BrowseFilter {
  query: string
  cuisine: string // 'all' or a specific cuisine
  tags: string[] // must carry all (AND)
  allergens: string[]
  allergenMode: AllergenMode // avoid = hide any-of; only = show those that contain any-of
  maxTime: number // 0 = any
  rating: RatingFilter
}

/** The neutral filter — nothing narrowed. */
export const EMPTY_BROWSE_FILTER: BrowseFilter = {
  query: '',
  cuisine: 'all',
  tags: [],
  allergens: [],
  allergenMode: 'avoid',
  maxTime: 0,
  rating: 'all',
}

/** Whether a recipe's ★ rating satisfies the rating filter. */
export function matchesRating(stars: Stars | undefined, rating: RatingFilter): boolean {
  switch (rating) {
    case 'all':
      return true
    case 'unrated':
      return stars === undefined
    case '5':
      return stars === 5
    case '4plus':
      return stars !== undefined && stars >= 4
    case '3plus':
      return stars !== undefined && stars >= 3
  }
}

/** Apply every active filter to the flat recipe list (pure). */
export function filterRecipes(
  recipes: Recipe[],
  f: BrowseFilter,
  starsById: Map<string, Stars>,
): Recipe[] {
  const q = f.query.trim().toLowerCase()
  return recipes.filter((r) => {
    if (
      q &&
      !(
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(q))
      )
    )
      return false
    if (f.cuisine !== 'all' && r.cuisine !== f.cuisine) return false
    if (!matchesLabels(r.tags, f.tags, 'all')) return false
    if (!matchesLabels(r.allergens, f.allergens, f.allergenMode === 'only' ? 'any' : 'none'))
      return false
    if (f.maxTime > 0 && r.prepTime > f.maxTime) return false
    if (!matchesRating(starsById.get(r.id), f.rating)) return false
    return true
  })
}

/** Sort a copy of the list by the chosen key (rating uses our ★; unrated sorts last). */
export function sortRecipes(
  recipes: Recipe[],
  sort: SortKey,
  starsById: Map<string, Stars>,
): Recipe[] {
  return [...recipes].sort((a, b) => {
    if (sort === 'name') return a.title.localeCompare(b.title)
    if (sort === 'time') return a.prepTime - b.prepTime
    return (starsById.get(b.id) ?? 0) - (starsById.get(a.id) ?? 0)
  })
}

/**
 * The whole Browse pipeline: filter, optionally collapse each dish's variants to its lead card,
 * then sort. Collapsing runs on the *filtered* set, so a dish surfaces whenever any of its variants
 * matches (its lead card standing in for the dish).
 */
export function browseCards(
  recipes: Recipe[],
  overrides: VariantOverride[],
  f: BrowseFilter,
  opts: { groupVariants: boolean; sort: SortKey },
  starsById: Map<string, Stars>,
): Recipe[] {
  const filtered = filterRecipes(recipes, f, starsById)
  const list = opts.groupVariants
    ? resolveDishes(filtered, overrides).map((d) => d.lead)
    : filtered
  return sortRecipes(list, opts.sort, starsById)
}

/**
 * Map a Config click-through to a fresh, focused filter: `?tag=` shows recipes carrying that tag;
 * `?allergen=` shows recipes that contain it (allergen "only" mode). Returns `null` when neither
 * param is present. Starts from `EMPTY_BROWSE_FILTER`, so the broad filters are cleared for a clean
 * landing.
 */
export function deepLinkFilter(tag: string | null, allergen: string | null): BrowseFilter | null {
  if (tag) return { ...EMPTY_BROWSE_FILTER, tags: [tag] }
  if (allergen) return { ...EMPTY_BROWSE_FILTER, allergens: [allergen], allergenMode: 'only' }
  return null
}
