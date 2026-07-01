import { db } from '../db/db'
import { CURRENT_PLAN_ID } from '../lib/plan'
import { buildShoppingList, type ShoppingList } from '../lib/shopping'
import type { Recipe } from '../schema/recipe'
import type { ShoppingState } from '../schema/userData'

// The Shop app layer: the derived-list seam plus per-plan tick-off / manual extras. The list
// itself is computed by the pure `buildShoppingList`; everything here touches Dexie.

/**
 * Assemble the shopping list for a plan from the store — its recipes scaled to its portions,
 * merged via the pure builder. (Ingredient dictionary + lazy bindings are threaded in a later
 * slice; for now the builder falls back to the built-in seed dictionary.)
 */
export async function getPlanShoppingList(planId: string = CURRENT_PLAN_ID): Promise<ShoppingList> {
  const plan = await db.plans.get(planId)
  const portions = plan?.portions ?? 2
  const ids = plan?.recipeIds ?? []
  const recipes = (await Promise.all(ids.map((id) => db.recipes.get(id)))).filter(
    (r): r is Recipe => r != null,
  )
  return buildShoppingList(recipes, portions)
}

// Tick-off + manual extras are scoped to the current plan.
async function getState(planId: string = CURRENT_PLAN_ID): Promise<ShoppingState> {
  return (await db.shopping.get(planId)) ?? { id: planId, checked: [], extras: [] }
}

export async function toggleChecked(key: string): Promise<void> {
  const s = await getState()
  const checked = s.checked.includes(key)
    ? s.checked.filter((k) => k !== key)
    : [...s.checked, key]
  await db.shopping.put({ ...s, checked })
}

export async function clearChecked(): Promise<void> {
  const s = await getState()
  await db.shopping.put({ ...s, checked: [] })
}

export async function addExtra(text: string): Promise<void> {
  const t = text.trim()
  if (!t) return
  const s = await getState()
  await db.shopping.put({ ...s, extras: [...s.extras, { text: t, checked: false }] })
}

export async function toggleExtra(index: number): Promise<void> {
  const s = await getState()
  const extras = s.extras.map((e, i) => (i === index ? { ...e, checked: !e.checked } : e))
  await db.shopping.put({ ...s, extras })
}

export async function removeExtra(index: number): Promise<void> {
  const s = await getState()
  await db.shopping.put({ ...s, extras: s.extras.filter((_, i) => i !== index) })
}
