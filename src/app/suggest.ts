// Application layer: assemble the suggester's candidate pool from Dexie and run the pure
// scorer (src/lib/suggest.ts). Reads recipes + curation + cooked history + variant groups +
// the current plan; the pure logic does the scoring/selection. Design: docs/plan-suggest-spec.md.

import { db } from '../db/db'
import { CURRENT_PLAN_ID, daysSince } from '../lib/plan'
import {
  suggestWeek,
  type BasketItem,
  type Candidate,
  type Suggestion,
  type SuggestConfig,
} from '../lib/suggest'
import type { Recipe } from '../schema/recipe'

// Household no-go allergens — also excluded upstream when the dataset is built; this is the
// belt-and-braces runtime filter (mirrors the manual Plan picker).
const NOGO_ALLERGENS = ['fish']

export interface SuggestWeekParams {
  /** Target total meals for the week (the current plan counts toward it). */
  count: number
  /** Seed for the weighted-random selection — fresh per UI run, fixed in tests. */
  seed: number
  config?: Partial<SuggestConfig>
}

/**
 * Suggest meals to fill the current week from the rated collection. Returns the **newly
 * chosen** recipes (the already-planned ones aren't echoed back). The caller accepts them with
 * `addRecipesToPlan` (src/app/plan.ts). Non-destructive: this only reads.
 */
export async function suggestWeekPlan({ count, seed, config }: SuggestWeekParams): Promise<Suggestion[]> {
  const [recipes, userData, cooked, groups, plan] = await Promise.all([
    db.recipes.toArray(),
    db.userData.toArray(),
    db.cooked.toArray(),
    db.variantGroups.toArray(),
    db.plans.get(CURRENT_PLAN_ID),
  ])

  const starsById = new Map<string, number>()
  const rotationById = new Map<string, number>()
  for (const u of userData) {
    if (u.stars) starsById.set(u.recipeId, u.stars)
    if (u.rotation) rotationById.set(u.recipeId, u.rotation)
  }

  // Most-recent cook per recipe → days since (undefined = never cooked).
  const lastCookedById = new Map<string, string>()
  for (const c of cooked) {
    const prev = lastCookedById.get(c.recipeId)
    if (!prev || c.date > prev) lastCookedById.set(c.recipeId, c.date)
  }
  const daysSinceCookedFor = (id: string): number | undefined => {
    const d = lastCookedById.get(id)
    return d ? daysSince(d) : undefined
  }

  const groupByRecipe = new Map<string, string>()
  for (const g of groups) for (const m of g.members) groupByRecipe.set(m.recipeId, g.id)

  const recipeById = new Map(recipes.map((r) => [r.id, r]))
  const plannedIds = new Set(plan?.recipeIds ?? [])

  const toCandidate = (r: Recipe): Candidate => ({
    id: r.id,
    stars: starsById.get(r.id) ?? 0,
    rotation: rotationById.get(r.id),
    cuisine: r.cuisine,
    mainProtein: r.mainProtein,
    prepTime: r.prepTime,
    daysSinceCooked: daysSinceCookedFor(r.id),
    groupId: groupByRecipe.get(r.id),
  })

  // Eligible: keepers (★3+), not a no-go, not already planned. (Cooldown lives in the scorer.)
  const eligible = recipes.filter((r) => {
    const s = starsById.get(r.id)
    if (!s || s < 3) return false
    if (r.allergens.some((a) => NOGO_ALLERGENS.includes(a))) return false
    if (plannedIds.has(r.id)) return false
    return true
  })

  // Collapse each variant group to a single representative — highest ★, then rotation, then
  // least-recently cooked — so a group is offered once; the UI can swap to a sibling.
  const representativeRank = (r: Recipe): [number, number, number] => [
    starsById.get(r.id) ?? 0,
    rotationById.get(r.id) ?? 0,
    daysSinceCookedFor(r.id) ?? Number.POSITIVE_INFINITY,
  ]
  const grouped = new Map<string, Recipe[]>()
  const candidates: Candidate[] = []
  for (const r of eligible) {
    const gid = groupByRecipe.get(r.id)
    if (!gid) candidates.push(toCandidate(r))
    else grouped.set(gid, [...(grouped.get(gid) ?? []), r])
  }
  for (const members of grouped.values()) {
    const rep = members.reduce((best, r) =>
      compareRank(representativeRank(r), representativeRank(best)) > 0 ? r : best,
    )
    candidates.push(toCandidate(rep))
  }

  // Basket = already-planned meals: they seed the variety axes and block their groups.
  const basket: BasketItem[] = (plan?.recipeIds ?? [])
    .map((id) => recipeById.get(id))
    .filter((r): r is Recipe => r != null)
    .map((r) => ({
      id: r.id,
      cuisine: r.cuisine,
      mainProtein: r.mainProtein,
      prepTime: r.prepTime,
      groupId: groupByRecipe.get(r.id),
    }))

  return suggestWeek({ candidates, basket, count, seed, config })
}

/** Lexicographic compare of representative-rank tuples (higher is better). */
function compareRank(a: [number, number, number], b: [number, number, number]): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}
