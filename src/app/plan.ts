// Application layer: the current week plan's Dexie writes. The seam the UI and feature tests
// both call; pure helpers (CURRENT_PLAN_ID, todayISO, daysSince) live in src/lib/plan.ts.

import { db } from '../db/db'
import type { WeekPlan } from '../schema/userData'
import { CURRENT_PLAN_ID, todayISO } from '../lib/plan'

async function getOrCreatePlan(): Promise<WeekPlan> {
  const existing = await db.plans.get(CURRENT_PLAN_ID)
  if (existing) return existing
  const plan: WeekPlan = { id: CURRENT_PLAN_ID, portions: 2, recipeIds: [] }
  await db.plans.put(plan)
  return plan
}

export async function addToPlan(recipeId: string): Promise<void> {
  const plan = await getOrCreatePlan()
  if (!plan.recipeIds.includes(recipeId)) {
    await db.plans.put({ ...plan, recipeIds: [...plan.recipeIds, recipeId] })
  }
}

/** Add several recipes to the plan in one write, skipping any already on it (order preserved). */
export async function addRecipesToPlan(recipeIds: string[]): Promise<void> {
  const plan = await getOrCreatePlan()
  const have = new Set(plan.recipeIds)
  const added = recipeIds.filter((id) => !have.has(id))
  if (added.length === 0) return
  await db.plans.put({ ...plan, recipeIds: [...plan.recipeIds, ...added] })
}

/** Return a copy of `overrides` without `id`, or the same value if it wasn't present. */
function withoutOverride(
  overrides: Record<string, number> | undefined,
  id: string,
): Record<string, number> | undefined {
  if (!overrides || !(id in overrides)) return overrides
  const next = { ...overrides }
  delete next[id]
  return next
}

export async function removeFromPlan(recipeId: string): Promise<void> {
  const plan = await getOrCreatePlan()
  await db.plans.put({
    ...plan,
    recipeIds: plan.recipeIds.filter((id) => id !== recipeId),
    // Drop any per-meal portions override with the meal, so it can't linger or resurface.
    portionOverrides: withoutOverride(plan.portionOverrides, recipeId),
  })
}

/**
 * Re-insert a recipe at a given slot (index clamped to the current length), skipping if it's
 * already on the plan. Backs the "undo" of a remove/cook, restoring the meal to its slot.
 */
export async function insertIntoPlanAt(recipeId: string, index: number): Promise<void> {
  const plan = await getOrCreatePlan()
  if (plan.recipeIds.includes(recipeId)) return
  const at = Math.max(0, Math.min(index, plan.recipeIds.length))
  const recipeIds = [...plan.recipeIds]
  recipeIds.splice(at, 0, recipeId)
  await db.plans.put({ ...plan, recipeIds })
}

/**
 * Swap a planned meal for one of its variants, keeping its slot position. Used by the
 * Plan-page version picker. No-op when the recipe isn't planned, the target is identical,
 * or the target is already on the plan (so a swap never creates a duplicate).
 */
export async function swapPlanRecipe(fromId: string, toId: string): Promise<void> {
  if (fromId === toId) return
  const plan = await getOrCreatePlan()
  const i = plan.recipeIds.indexOf(fromId)
  if (i === -1 || plan.recipeIds.includes(toId)) return
  const recipeIds = [...plan.recipeIds]
  recipeIds[i] = toId
  // Carry any per-meal portions override across the swap — same slot, same "cooking for N".
  let portionOverrides = plan.portionOverrides
  if (portionOverrides && fromId in portionOverrides) {
    portionOverrides = { ...portionOverrides, [toId]: portionOverrides[fromId] }
    delete portionOverrides[fromId]
  }
  await db.plans.put({ ...plan, recipeIds, portionOverrides })
}

export async function setPortions(portions: number): Promise<void> {
  const plan = await getOrCreatePlan()
  await db.plans.put({ ...plan, portions })
}

/**
 * Override one meal's portions (guests, or batch-cook for lunches) while the rest stay at the
 * plan default. Passing `undefined` — or a value equal to the plan-wide `portions` — clears the
 * override so the meal follows the default again. No-op for a recipe not on the plan.
 */
export async function setMealPortions(
  recipeId: string,
  portions: number | undefined,
): Promise<void> {
  const plan = await getOrCreatePlan()
  if (!plan.recipeIds.includes(recipeId)) return
  const portionOverrides =
    portions == null || portions === plan.portions
      ? withoutOverride(plan.portionOverrides, recipeId)
      : { ...plan.portionOverrides, [recipeId]: portions }
  await db.plans.put({ ...plan, portionOverrides })
}

/**
 * Stamp today's cook and take the recipe off the current week (it's done). Returns the new
 * cooked-entry id so the caller can undo the stamp (see `unmarkCooked`).
 */
export async function markCooked(recipeId: string): Promise<number> {
  const cookedId = await db.cooked.add({ recipeId, date: todayISO() })
  await removeFromPlan(recipeId)
  return cookedId
}

/** Delete a single cooked-history entry by id — the inverse of one `markCooked` stamp. */
export async function unmarkCooked(cookedId: number): Promise<void> {
  await db.cooked.delete(cookedId)
}
