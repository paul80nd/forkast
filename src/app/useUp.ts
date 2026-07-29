// Application layer: the "use up ingredients" list and its recipe suggestions. The list is a
// single `settings` row (like the aisle order), so it needs no schema table and rides along in
// the backup. The pure matching/ranking lives in src/lib/useUp.ts; here we assemble its inputs
// from Dexie (recipes, bindings, ★, the current plan). Design: docs/use-up-spec.md.

import { db } from '../db/db'
import { NOGO_ALLERGENS } from '../data/nogo'
import { CURRENT_PLAN_ID } from '../lib/plan'
import { normalizeName } from '../lib/shopping'
import { planCoverage, rankUseUpRecipes, type UseUpMatch } from '../lib/useUp'
import type { UseUpItem } from '../schema/userData'

const KEY = 'useUp'

/** The saved use-up list (empty when never set). */
export async function getUseUp(): Promise<UseUpItem[]> {
  const row = await db.settings.get(KEY)
  return Array.isArray(row?.value) ? (row.value as UseUpItem[]) : []
}

async function saveUseUp(items: UseUpItem[]): Promise<void> {
  await db.settings.put({ key: KEY, value: items })
}

/** Replace the whole list (used by the panel after an edit). */
export async function setUseUp(items: UseUpItem[]): Promise<void> {
  await saveUseUp(items)
}

/** Add an ingredient, de-duplicated by normalised name (a later add can attach an id). */
export async function addUseUpItem(item: UseUpItem): Promise<void> {
  const items = await getUseUp()
  const key = normalizeName(item.name)
  if (!key) return
  const without = items.filter((i) => normalizeName(i.name) !== key)
  await saveUseUp([...without, { name: item.name.trim(), ingredientId: item.ingredientId }])
}

/** Drop an ingredient by (normalised) name. */
export async function removeUseUpItem(name: string): Promise<void> {
  const items = await getUseUp()
  const key = normalizeName(name)
  await saveUseUp(items.filter((i) => normalizeName(i.name) !== key))
}

async function loadBindings(): Promise<Map<string, string>> {
  const rows = await db.bindings.toArray()
  return new Map(rows.map((b) => [normalizeName(b.name), b.ingredientId]))
}

/** Each list item plus whether the current plan already uses it (unused = not used). */
export async function getUseUpStatus(): Promise<{ item: UseUpItem; usedByPlan: boolean }[]> {
  const [items, recipes, plan, bindings] = await Promise.all([
    getUseUp(),
    db.recipes.toArray(),
    db.plans.get(CURRENT_PLAN_ID),
    loadBindings(),
  ])
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const planned = (plan?.recipeIds ?? []).map((id) => byId.get(id)).filter((r) => r != null)
  return planCoverage(items, planned, bindings)
}

/** A suggestion: the recipe id, the names it covers, and its ★ (0 = unrated). */
export interface UseUpSuggestion {
  recipeId: string
  matched: string[]
  stars: number
}

/**
 * Recipes across the whole collection that use the **unused** items (those the current plan
 * doesn't already cover), ranked by coverage then ★. Already-planned recipes and no-gos are
 * excluded. Returns [] when the list is empty or the plan already covers everything.
 */
export async function suggestUseUpRecipes({ limit = 20 }: { limit?: number } = {}): Promise<
  UseUpSuggestion[]
> {
  const [recipes, userData, plan, bindings] = await Promise.all([
    db.recipes.toArray(),
    db.userData.toArray(),
    db.plans.get(CURRENT_PLAN_ID),
    loadBindings(),
  ])
  const items = await getUseUp()
  if (items.length === 0) return []

  const byId = new Map(recipes.map((r) => [r.id, r]))
  const plannedIds = plan?.recipeIds ?? []
  const planned = plannedIds.map((id) => byId.get(id)).filter((r) => r != null)

  // Target only what the plan doesn't already burn down.
  const unused = planCoverage(items, planned, bindings)
    .filter((s) => !s.usedByPlan)
    .map((s) => s.item)
  if (unused.length === 0) return []

  const starsById = new Map<string, number>()
  for (const u of userData) if (u.stars) starsById.set(u.recipeId, u.stars)

  const ranked: UseUpMatch[] = rankUseUpRecipes(recipes, unused, {
    bindings,
    starsById,
    excludeIds: new Set(plannedIds),
    noGoAllergens: NOGO_ALLERGENS,
  })

  return ranked.slice(0, limit).map((m) => ({
    recipeId: m.recipe.id,
    matched: m.matched.map((i) => i.name),
    stars: m.stars,
  }))
}
