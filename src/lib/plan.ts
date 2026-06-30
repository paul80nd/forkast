// Pure plan helpers — identity + date maths, no I/O. The Dexie writes that act on the plan
// (addToPlan / removeFromPlan / setPortions / markCooked) live in src/app/plan.ts.

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
