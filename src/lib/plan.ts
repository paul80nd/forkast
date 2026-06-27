import { db } from '../db/db'
import type { WeekPlan } from '../schema/userData'

// MVP: a single current week. Multi-week history can come later.
export const CURRENT_PLAN_ID = 'current'

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Whole days between an ISO date (yyyy-mm-dd) and today. */
export function daysSince(dateISO: string): number {
  const then = new Date(dateISO + 'T00:00:00').getTime()
  const now = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  return Math.round((now - then) / 86_400_000)
}

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

export async function removeFromPlan(recipeId: string): Promise<void> {
  const plan = await getOrCreatePlan()
  await db.plans.put({
    ...plan,
    recipeIds: plan.recipeIds.filter((id) => id !== recipeId),
  })
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
