// Application layer: the duplicate-finder use-case for Refine. Reuses the pure similarity
// scorer with the tight DUPLICATE_OPTS preset, fed the currently **ungrouped** recipes
// (grouped ones are already curated-as-keep, so they're left out — same pool the group
// suggester uses). Never deletes anything itself: the Refine UI confirms which members to
// remove and calls deleteRecipes. The scoring is pure (src/lib/similarity.ts) and tested.

import { db } from '../db/db'
import { resolveDishes } from '../lib/variants'
import { suggestGroups, DUPLICATE_OPTS, type CandidateCluster } from '../lib/similarity'

/**
 * Suggest clusters of near-identical recipes from the ungrouped collection, best first.
 * "Ungrouped" = standalone in the effective variant grouping (recipes already collected into
 * a multi-variant dish are curated-as-keep, so they're left out). The caller picks a keeper
 * and deletes the rest.
 */
export async function suggestDuplicateCandidates(): Promise<CandidateCluster[]> {
  const [recipes, overrides] = await Promise.all([
    db.recipes.toArray(),
    db.variantOverrides.toArray(),
  ])
  const grouped = new Set<string>()
  for (const d of resolveDishes(recipes, overrides)) {
    if (d.variants.length > 1) for (const v of d.variants) grouped.add(v.id)
  }
  const input = recipes
    .filter((r) => !grouped.has(r.id))
    .map((r) => ({ id: r.id, title: r.title, ingredientNames: r.ingredients.map((i) => i.name) }))
  return suggestGroups(input, DUPLICATE_OPTS)
}
