// Application layer: assemble the "related recipes" lists for the recipe page from Dexie and run
// the pure rankers (src/lib/relatedRecipes.ts). Reads recipes + ★ + variant overrides; collapses
// each dish to one card (the lead), drops the anchor's own dish (its siblings live in the page's
// Versions swapper) and household no-gos, then ranks. Design: docs/related-recipes-spec.md.

import { db } from '../db/db'
import { NOGO_ALLERGENS } from '../data/nogo'
import {
  DEFAULT_RELATED_CONFIG,
  rankRelated,
  toFeatures,
  type Ranked,
  type RelatedCandidate,
  type RelatedConfig,
} from '../lib/relatedRecipes'
import { resolveDishes } from '../lib/variants'
import type { Recipe } from '../schema/recipe'

/** One related recipe for display: the dish's lead card, its ★ (if rated), and its score. */
export interface RelatedResult {
  recipe: Recipe
  stars?: number
  score: number
}

export interface RelatedRecipes {
  /** "More like this" — most alike first. */
  similar: RelatedResult[]
  /** "Something different" — a good recipe unlike the anchor, best first. */
  different: RelatedResult[]
}

export interface GetRelatedParams {
  /** Max results per list (defaults to the config's limit). */
  limit?: number
  config?: Partial<RelatedConfig>
}

/**
 * The similar / different lists for an anchor recipe. Non-destructive: reads only. Returns empty
 * lists when the anchor id isn't found (e.g. mid-navigation).
 */
export async function getRelatedRecipes(
  anchorId: string,
  { limit, config }: GetRelatedParams = {},
): Promise<RelatedRecipes> {
  const [recipes, userData, overrides] = await Promise.all([
    db.recipes.toArray(),
    db.userData.toArray(),
    db.variantOverrides.toArray(),
  ])

  const anchor = recipes.find((r) => r.id === anchorId)
  if (!anchor) return { similar: [], different: [] }

  const cfg: RelatedConfig = {
    ...DEFAULT_RELATED_CONFIG,
    ...config,
    weights: { ...DEFAULT_RELATED_CONFIG.weights, ...config?.weights },
    different: { ...DEFAULT_RELATED_CONFIG.different, ...config?.different },
    limit: limit ?? config?.limit ?? DEFAULT_RELATED_CONFIG.limit,
  }

  const starsById = new Map<string, number>()
  for (const u of userData) if (u.stars) starsById.set(u.recipeId, u.stars)

  // One card per dish (import grouping + user overrides), excluding the anchor's own dish.
  const dishes = resolveDishes(recipes, overrides)
  const anchorDish = dishes.find((d) => d.variants.some((v) => v.id === anchorId))

  // A dish counts as a keeper if any of its variants is rated one — so a good dish isn't hidden
  // by an unrated lead. Display ★ stays the lead's own rating.
  const dishStars = (variants: Recipe[]): number =>
    variants.reduce((best, v) => Math.max(best, starsById.get(v.id) ?? 0), 0)

  const leadById = new Map<string, Recipe>()
  const candidates: RelatedCandidate[] = []
  for (const d of dishes) {
    if (d === anchorDish) continue
    if (d.lead.allergens.some((a) => NOGO_ALLERGENS.includes(a))) continue
    leadById.set(d.lead.id, d.lead)
    const stars = dishStars(d.variants)
    candidates.push({ features: toFeatures(d.lead), stars: stars || undefined })
  }

  const anchorFeatures = toFeatures(anchor)
  const toResults = (ranked: Ranked[]): RelatedResult[] =>
    ranked
      .map((r): RelatedResult | null => {
        const recipe = leadById.get(r.id)
        return recipe ? { recipe, stars: starsById.get(r.id), score: r.score } : null
      })
      .filter((x): x is RelatedResult => x != null)

  const { similar, different } = rankRelated(anchorFeatures, candidates, cfg)
  return { similar: toResults(similar), different: toResults(different) }
}
