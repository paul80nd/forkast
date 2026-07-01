import type { IngredientDef } from '../data/ingredients'
import { tokenize, jaccard } from './similarity'

// "Did you mean…?" ranking for the lazy-bind flow: given the name written on a recipe line,
// rank the dictionary for the closest canonical ingredient(s). Pure and dependency-light so
// it's unit-testable; the dictionary is small, so a linear scan is fine.

export interface IngredientMatch {
  def: IngredientDef
  /** Confidence in 0..1 (1 = same normalised name). */
  score: number
}

/**
 * Rank `defs` by how well each matches `name`. Token-set overlap (singularised, stopwords
 * dropped), with an exact-name match scoring 1 and a full substring containment floored at
 * 0.85 so "chicken" still surfaces "chicken breast". Non-matches (score 0) are dropped.
 */
export function matchIngredient(
  name: string,
  defs: IngredientDef[],
  limit = 5,
): IngredientMatch[] {
  const q = tokenize(name)
  if (q.size === 0) return []
  const nq = [...q].sort().join(' ')

  const scored: IngredientMatch[] = []
  for (const def of defs) {
    const d = tokenize(def.name)
    if (d.size === 0) continue
    const nd = [...d].sort().join(' ')
    let score = jaccard(q, d)
    if (nq === nd) score = 1
    else if (nd.includes(nq) || nq.includes(nd)) score = Math.max(score, 0.85)
    if (score > 0) scored.push({ def, score })
  }

  scored.sort((a, b) => b.score - a.score || a.def.name.localeCompare(b.def.name))
  return scored.slice(0, limit)
}
