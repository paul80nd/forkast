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

export async function removeFromPlan(recipeId: string): Promise<void> {
  const plan = await getOrCreatePlan()
  await db.plans.put({
    ...plan,
    recipeIds: plan.recipeIds.filter((id) => id !== recipeId),
  })
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
  await db.plans.put({ ...plan, recipeIds })
}

export async function setPortions(portions: number): Promise<void> {
  const plan = await getOrCreatePlan()
  await db.plans.put({ ...plan, portions })
}

/** Stamp today's cook and take the recipe off the current week (it's done). */
export async function markCooked(recipeId: string): Promise<void> {
  await db.cooked.add({ recipeId, date: todayISO() })
  await removeFromPlan(recipeId)
}
