import { db } from '../db/db'
import { CURRENT_PLAN_ID } from '../lib/plan'
import { buildShoppingList, normalizeName, type ShoppingList } from '../lib/shopping'
import { INGREDIENTS_BY_ID, type IngredientDef } from '../data/ingredients'
import type { Recipe } from '../schema/recipe'
import type { ShoppingState } from '../schema/userData'

/** Load a plan's recipes + the ingredient dictionary (falling back to the built-in one). */
async function loadPlanContext(planId: string): Promise<{
  recipes: Recipe[]
  portions: number
  dict: Map<string, IngredientDef>
}> {
  const plan = await db.plans.get(planId)
  const ids = plan?.recipeIds ?? []
  const [recipeRows, dictRows] = await Promise.all([
    Promise.all(ids.map((id) => db.recipes.get(id))),
    db.dictionary.toArray(),
  ])
  return {
    recipes: recipeRows.filter((r): r is Recipe => r != null),
    portions: plan?.portions ?? 2,
    dict: dictRows.length ? new Map(dictRows.map((d) => [d.id, d])) : INGREDIENTS_BY_ID,
  }
}

// The Shop app layer: the derived-list seam plus per-plan tick-off / manual extras. The list
// itself is computed by the pure `buildShoppingList`; everything here touches Dexie.

/**
 * Assemble the shopping list for a plan from the store — its recipes scaled to its portions,
 * merged via the pure builder, resolving ingredients through the Dexie dictionary + lazy
 * name bindings. Falls back to the built-in dictionary if the table is empty (e.g. right
 * after restoring a pre-dictionary backup, before the startup reseed runs).
 */
export async function getPlanShoppingList(planId: string = CURRENT_PLAN_ID): Promise<ShoppingList> {
  const [{ recipes, portions, dict }, bindingRows] = await Promise.all([
    loadPlanContext(planId),
    db.bindings.toArray(),
  ])
  const bindings = new Map(bindingRows.map((b) => [normalizeName(b.name), b.ingredientId]))
  return buildShoppingList(recipes, portions, dict, bindings)
}

// --- Lazy ingredient binding (at shopping time) ---

/** Bind an ingredient name to a dictionary entry, so its lines merge across the plan. */
export async function setBinding(name: string, ingredientId: string): Promise<void> {
  await db.bindings.put({ name: normalizeName(name), ingredientId })
}

/** Drop a binding — the name's lines fall back to verbatim (unmerged). */
export async function unbind(name: string): Promise<void> {
  await db.bindings.delete(normalizeName(name))
}

/** URL/id-safe slug from a name, e.g. "Chicken Thighs" → "chicken-thighs". */
function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/**
 * Create a dictionary entry (for the "create new" path of the bind flow) and return it. The
 * id is derived from the name, made unique against the existing dictionary.
 */
export async function createIngredient(
  input: Omit<IngredientDef, 'id'> & { id?: string },
): Promise<IngredientDef> {
  const base = input.id?.trim() || slugify(input.name) || 'ingredient'
  let id = base
  for (let n = 2; await db.dictionary.get(id); n++) id = `${base}-${n}`
  const def: IngredientDef = { ...input, id }
  await db.dictionary.put(def)
  return def
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
