// Pure recipe-to-recipe relatedness — no Dexie, no I/O. Given an anchor recipe and a pool of
// candidates, score how *similar* each is (for "more like this") and rank a *different-but-good*
// set (for "something different"). Structured-feature similarity, not text embeddings: a weighted
// blend over ingredients / tags / cuisine / main protein / effort band / nutrition, each axis
// contributing only when both recipes carry it (so a missing feature doesn't drag the score down).
//
// Reuses the token/Jaccard primitives from ./similarity (the group suggester) and ./suggest's
// effort banding — this module is the broader "related recipes" view, whereas similarity.ts is
// deliberately narrow near-duplicate/variant detection. Design + rationale:
// docs/related-recipes-spec.md. The Dexie reads that assemble candidates live in src/app/.

import type { Nutrition, Recipe } from '../schema/recipe'
import { ingredientSet, jaccard, tokenize } from './similarity'
import { timeBand } from './suggest'

/** The comparable feature projection of a recipe. Missing optionals = the source lacked them. */
export interface RelatedFeatures {
  id: string
  /** Normalised ingredient-name keys (works on unbound lines — most real data). */
  ingredients: Set<string>
  /** Tokenised tag words. */
  tags: Set<string>
  /** Lowercased cuisine facet, '' when absent. */
  cuisine: string
  /** Lowercased centre-of-plate, undefined when the source didn't provide one. */
  mainProtein?: string
  /** quick / medium / long effort band. */
  band: string
  /** Per-portion macros, when the source provides them. */
  nutrition?: Nutrition
}

/** A candidate to rank against the anchor: its features, ★ (for the "different" keeper gate). */
export interface RelatedCandidate {
  features: RelatedFeatures
  /** ★ rating (1–5); undefined = unrated. Only used by rankDifferent's keeper gate. */
  stars?: number
}

/** A ranked result: the recipe id and its 0–1 relatedness / change score. */
export interface Ranked {
  id: string
  score: number
}

export interface RelatedConfig {
  /** Per-axis weights for `recipeSimilarity`; renormalised over the axes actually present. */
  weights: {
    ingredients: number
    tags: number
    cuisine: number
    protein: number
    band: number
    nutrition: number
  }
  /** "Something different" offers only keepers at or above this ★ (bin/unrated excluded). */
  minStars: number
  /** "Different" score blend: reward being unlike the anchor (novelty) and being good (quality). */
  different: { novelty: number; quality: number }
  /** Default max results per list. */
  limit: number
}

// First-guess tuning (see spec). Ingredients dominate — sharing what you cook with is the most
// cook-meaningful notion of "alike"; cuisine and tags next; protein / effort / nutrition are
// lighter nudges. One place to turn the dials.
export const DEFAULT_RELATED_CONFIG: RelatedConfig = {
  weights: { ingredients: 0.45, tags: 0.15, cuisine: 0.15, protein: 0.1, band: 0.05, nutrition: 0.1 },
  minStars: 3,
  different: { novelty: 0.7, quality: 0.3 },
  limit: 6,
}

// Rough per-portion magnitudes used to put the macros on a comparable scale before cosine, so
// nutrition similarity compares the *profile* rather than being dominated by kcal's raw size.
const NUTRITION_SCALE: Nutrition = {
  kcal: 600, protein: 30, fat: 30, saturates: 12, carbs: 70, sugars: 20, fibre: 10, salt: 2.5,
}
const NUTRITION_KEYS = Object.keys(NUTRITION_SCALE) as (keyof Nutrition)[]

/** Project a recipe to its comparable features. */
export function toFeatures(recipe: Recipe): RelatedFeatures {
  return {
    id: recipe.id,
    ingredients: ingredientSet(recipe.ingredients.map((i) => i.name)),
    tags: tokenize(recipe.tags.join(' ')),
    cuisine: recipe.cuisine.trim().toLowerCase(),
    mainProtein: recipe.mainProtein?.trim().toLowerCase() || undefined,
    band: timeBand(recipe.prepTime),
    nutrition: recipe.nutrition,
  }
}

/** Cosine of two scale-normalised macro vectors → 0–1 (all macros are non-negative). */
function nutritionSimilarity(a: Nutrition, b: Nutrition): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const k of NUTRITION_KEYS) {
    const s = NUTRITION_SCALE[k]
    const va = a[k] / s
    const vb = b[k] / s
    dot += va * vb
    na += va * va
    nb += vb * vb
  }
  if (na === 0 || nb === 0) return 0
  return dot / Math.sqrt(na * nb)
}

/**
 * How alike two recipes are, 0 (nothing in common) … 1 (identical on every shared axis). Each
 * axis contributes only when **both** recipes carry it, and the weights are renormalised over the
 * present axes — so comparing two recipes that both lack nutrition/protein simply weights the
 * axes they do share, rather than penalising the absence.
 */
export function recipeSimilarity(
  a: RelatedFeatures,
  b: RelatedFeatures,
  cfg: RelatedConfig = DEFAULT_RELATED_CONFIG,
): number {
  let wsum = 0
  let ssum = 0
  const add = (weight: number, present: boolean, score: number): void => {
    if (!present) return
    wsum += weight
    ssum += weight * score
  }
  add(cfg.weights.ingredients, a.ingredients.size > 0 && b.ingredients.size > 0, jaccard(a.ingredients, b.ingredients))
  add(cfg.weights.tags, a.tags.size > 0 && b.tags.size > 0, jaccard(a.tags, b.tags))
  add(cfg.weights.cuisine, !!a.cuisine && !!b.cuisine, a.cuisine === b.cuisine ? 1 : 0)
  add(cfg.weights.band, !!a.band && !!b.band, a.band === b.band ? 1 : 0)
  add(cfg.weights.protein, !!a.mainProtein && !!b.mainProtein, a.mainProtein === b.mainProtein ? 1 : 0)
  add(cfg.weights.nutrition, !!a.nutrition && !!b.nutrition, a.nutrition && b.nutrition ? nutritionSimilarity(a.nutrition, b.nutrition) : 0)
  return wsum ? ssum / wsum : 0
}

/**
 * "More like this": candidates ranked by descending similarity to the anchor. The anchor itself
 * is dropped; the caller is responsible for excluding the anchor's variant siblings (they live in
 * the recipe page's Versions swapper) by collapsing dishes before passing candidates in.
 */
export function rankSimilar(
  anchor: RelatedFeatures,
  candidates: RelatedCandidate[],
  cfg: RelatedConfig = DEFAULT_RELATED_CONFIG,
): Ranked[] {
  return candidates
    .filter((c) => c.features.id !== anchor.id)
    .map((c) => ({ id: c.features.id, score: recipeSimilarity(anchor, c.features, cfg) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, cfg.limit)
}

/**
 * "Something different": a change of pace that's still worth cooking. Only **keepers** (★ ≥
 * minStars) are offered, scored by a blend of *novelty* (how unlike the anchor) and *quality* (★),
 * so the list favours good recipes that break the anchor's cuisine / protein / effort pattern
 * rather than the mathematically-farthest oddities. Anchor dropped; siblings excluded upstream.
 */
export function rankDifferent(
  anchor: RelatedFeatures,
  candidates: RelatedCandidate[],
  cfg: RelatedConfig = DEFAULT_RELATED_CONFIG,
): Ranked[] {
  return candidates
    .filter((c) => c.features.id !== anchor.id && (c.stars ?? 0) >= cfg.minStars)
    .map((c) => {
      const novelty = 1 - recipeSimilarity(anchor, c.features, cfg)
      const quality = ((c.stars ?? cfg.minStars) - 2) / 3 // ★3→0.33 … ★5→1
      return { id: c.features.id, score: cfg.different.novelty * novelty + cfg.different.quality * quality }
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, cfg.limit)
}
