import type { Recipe } from '../schema/recipe'
import {
  AISLE_ORDER,
  INGREDIENTS_BY_ID,
  pluralOf,
  type IngredientDef,
} from '../data/ingredients'
import { getUnit, convert, type Dimension } from './units'

export interface ShopLine {
  /** Stable key for tick-off persistence. */
  key: string
  label: string
  /** What the total is made of in recipe units, e.g. "3 tbsp" (when converted). */
  detail?: string
  aisle: string
  /** Normalised ingredient name for the lazy-bind flow (present on unmatched lines). */
  bindName?: string
  /** How many planned recipes contribute to this line — for spot-checking a merge. */
  recipeCount?: number
}

const EMPTY_BINDINGS: ReadonlyMap<string, string> = new Map()

/** The key ingredient bindings + the unmatched grouping use — case/space-insensitive name. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export interface ShoppingList {
  aisles: { aisle: string; lines: ShopLine[] }[]
  /** Lines we couldn't map to a canonical ingredient — listed verbatim. */
  unmatched: ShopLine[]
  /** Ingredients with no parseable quantity (e.g. "to taste"). */
  unquantified: string[]
  /** Store-cupboard basics, deduped — assumed in, listed for a glance. */
  basics: string[]
  /** Number of recipes actually contributing — the plan's meals, minus any stale ids. */
  mealCount: number
}

interface Acc {
  def: IngredientDef
  targetQty: number
  converted: boolean
  /** Recipe-unit amounts that went into the converted total, grouped by unit. */
  contributions: Map<string, number>
  /** Recipe-unit quantities that had no natural conversion to the buy unit. */
  leftovers: Map<string, number>
  /** Ids of the recipes that contributed to this ingredient. */
  recipeIds: Set<string>
}

/**
 * Merge the ingredients of the planned recipes into a shopping list, scaled to
 * `portions`. Each ingredient is summed in its purchase unit where a conversion
 * exists; otherwise the recipe-unit amount is kept as its own line.
 *
 * A line resolves to a canonical ingredient by its own `ingredientId` if set,
 * else by a lazy `bindings` entry (name → ingredientId) from shopping-time
 * binding; unresolved lines stay verbatim in `unmatched`. `dict` defaults to the
 * built-in seed dictionary so pure callers/tests need not thread it through.
 */
export function buildShoppingList(
  recipes: Recipe[],
  portions: number,
  dict: Map<string, IngredientDef> = INGREDIENTS_BY_ID,
  bindings: ReadonlyMap<string, string> = EMPTY_BINDINGS,
): ShoppingList {
  const matched = new Map<string, Acc>()
  const unmatchedMap = new Map<
    string,
    { qty: number; unitId: string; name: string; recipeIds: Set<string> }
  >()
  const unquantified = new Set<string>()
  const basics = new Set<string>()

  for (const r of recipes) {
    const factor = portions / (r.serves || 2)
    for (const b of r.basics) basics.add(b)

    for (const line of r.ingredients) {
      const unitId = line.unit ?? 'each'
      const scaled = line.qty == null ? null : line.qty * factor
      const boundId = line.ingredientId ?? bindings.get(normalizeName(line.name))
      const def = boundId ? dict.get(boundId) : undefined

      if (!def) {
        if (scaled == null) {
          unquantified.add(line.name)
          continue
        }
        const k = `${line.name}|${unitId}`
        const cur = unmatchedMap.get(k) ?? { qty: 0, unitId, name: line.name, recipeIds: new Set() }
        cur.qty += scaled
        cur.recipeIds.add(r.id)
        unmatchedMap.set(k, cur)
        continue
      }

      if (scaled == null) {
        unquantified.add(def.name)
        continue
      }

      let acc = matched.get(def.id)
      if (!acc) {
        acc = {
          def,
          targetQty: 0,
          converted: false,
          contributions: new Map(),
          leftovers: new Map(),
          recipeIds: new Set(),
        }
        matched.set(def.id, acc)
      }
      acc.recipeIds.add(r.id)
      const c = convert(scaled, unitId, def.purchaseUnit, def.densityGPerMl)
      if (c != null) {
        acc.targetQty += c
        acc.converted = true
        acc.contributions.set(unitId, (acc.contributions.get(unitId) ?? 0) + scaled)
      } else {
        acc.leftovers.set(unitId, (acc.leftovers.get(unitId) ?? 0) + scaled)
      }
    }
  }

  const byAisle = new Map<string, ShopLine[]>()
  const push = (aisle: string, line: ShopLine) => {
    const arr = byAisle.get(aisle) ?? []
    arr.push(line)
    byAisle.set(aisle, arr)
  }

  for (const acc of matched.values()) {
    const recipeCount = acc.recipeIds.size
    if (acc.converted) {
      const line = formatLine(acc.def, acc.targetQty, acc.def.purchaseUnit)
      line.detail = buildDetail(acc.contributions, acc.def.purchaseUnit)
      line.recipeCount = recipeCount
      push(acc.def.aisle, line)
    }
    for (const [unitId, qty] of acc.leftovers) {
      push(acc.def.aisle, { ...formatLine(acc.def, qty, unitId), recipeCount })
    }
  }

  const aisles = AISLE_ORDER.map((aisle) => ({
    aisle,
    lines: (byAisle.get(aisle) ?? []).sort((a, b) => a.label.localeCompare(b.label)),
  })).filter((a) => a.lines.length)
  for (const [aisle, lines] of byAisle) {
    if (!AISLE_ORDER.includes(aisle)) aisles.push({ aisle, lines })
  }

  const unmatched = [...unmatchedMap.values()]
    .map((u): ShopLine => {
      return {
        key: `x|${u.name}|${u.unitId}`,
        label: shopLabel(u.name, u.qty, u.unitId),
        aisle: 'Other',
        bindName: normalizeName(u.name),
        recipeCount: u.recipeIds.size,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  return {
    aisles,
    unmatched,
    unquantified: [...unquantified],
    basics: [...basics].sort(),
    mealCount: recipes.length,
  }
}

function formatLine(def: IngredientDef, qty: number, unitId: string): ShopLine {
  const unit = getUnit(unitId)
  // Only countable things pluralise ("spring onions"); measured-by-weight/volume names are
  // uncountable ("garam masala").
  const name = unit.dimension === 'count' && qty > 1 ? pluralOf(def) : def.name
  return { key: `${def.id}|${unitId}`, label: shopLabel(name, qty, unitId), aisle: def.aisle }
}

/** Name-first label, e.g. "dried chilli flakes · 11 g", "spring onions · × 2". */
function shopLabel(name: string, qty: number, unitId: string): string {
  const unit = getUnit(unitId)
  const q = formatQty(qty, unit.dimension)
  const amount = unit.dimension === 'count' ? `× ${q}` : `${q} ${unit.label}`
  return `${name} · ${amount}`
}

/** An amount without a name, e.g. "3 tbsp", "800 g", "5" — for the breakdown detail. */
function formatAmount(qty: number, unitId: string): string {
  const unit = getUnit(unitId)
  const q = formatQty(qty, unit.dimension)
  return unit.dimension === 'count' ? q : `${q} ${unit.label}`
}

/** Recipe-unit breakdown for a converted line; omitted when it'd just restate it. */
function buildDetail(
  contributions: Map<string, number>,
  purchaseUnit: string,
): string | undefined {
  const entries = [...contributions.entries()]
  if (entries.length === 1 && entries[0][0] === purchaseUnit) return undefined
  return entries.map(([unitId, qty]) => formatAmount(qty, unitId)).join(' + ')
}

function formatQty(qty: number, dim: Dimension): string {
  // You buy whole countable things; round those up.
  if (dim === 'count') return String(Math.max(1, Math.ceil(qty)))
  const rounded = Math.round(qty * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
