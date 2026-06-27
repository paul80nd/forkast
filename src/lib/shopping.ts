import type { Recipe } from '../schema/recipe'
import {
  AISLE_ORDER,
  INGREDIENTS_BY_ID,
  type IngredientDef,
} from '../data/ingredients'
import { getUnit, convert, type Dimension } from './units'

export interface ShopLine {
  /** Stable key for tick-off persistence. */
  key: string
  label: string
  aisle: string
}

export interface ShoppingList {
  aisles: { aisle: string; lines: ShopLine[] }[]
  /** Lines we couldn't map to a canonical ingredient — listed verbatim. */
  unmatched: ShopLine[]
  /** Ingredients with no parseable quantity (e.g. "to taste"). */
  unquantified: string[]
  /** Store-cupboard basics, deduped — assumed in, listed for a glance. */
  basics: string[]
}

interface Acc {
  def: IngredientDef
  targetQty: number
  converted: boolean
  /** Recipe-unit quantities that had no natural conversion to the buy unit. */
  leftovers: Map<string, number>
}

/**
 * Merge the ingredients of the planned recipes into a shopping list, scaled to
 * `portions`. Each ingredient is summed in its purchase unit where a conversion
 * exists; otherwise the recipe-unit amount is kept as its own line.
 */
export function buildShoppingList(recipes: Recipe[], portions: number): ShoppingList {
  const matched = new Map<string, Acc>()
  const unmatchedMap = new Map<string, { qty: number; unitId: string; name: string }>()
  const unquantified = new Set<string>()
  const basics = new Set<string>()

  for (const r of recipes) {
    const factor = portions / (r.serves || 2)
    for (const b of r.basics) basics.add(b)

    for (const line of r.ingredients) {
      const unitId = line.unit ?? 'each'
      const scaled = line.qty == null ? null : line.qty * factor
      const def = line.ingredientId
        ? INGREDIENTS_BY_ID.get(line.ingredientId)
        : undefined

      if (!def) {
        if (scaled == null) {
          unquantified.add(line.name)
          continue
        }
        const k = `${line.name}|${unitId}`
        const cur = unmatchedMap.get(k) ?? { qty: 0, unitId, name: line.name }
        cur.qty += scaled
        unmatchedMap.set(k, cur)
        continue
      }

      if (scaled == null) {
        unquantified.add(def.name)
        continue
      }

      let acc = matched.get(def.id)
      if (!acc) {
        acc = { def, targetQty: 0, converted: false, leftovers: new Map() }
        matched.set(def.id, acc)
      }
      const c = convert(scaled, unitId, def.purchaseUnit, def.densityGPerMl)
      if (c != null) {
        acc.targetQty += c
        acc.converted = true
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
    if (acc.converted) push(acc.def.aisle, formatLine(acc.def, acc.targetQty, acc.def.purchaseUnit))
    for (const [unitId, qty] of acc.leftovers) {
      push(acc.def.aisle, formatLine(acc.def, qty, unitId))
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
      const unit = getUnit(u.unitId)
      const q = formatQty(u.qty, unit.dimension)
      const label =
        unit.dimension === 'count' ? `${q} ${u.name}` : `${q} ${unit.label} ${u.name}`
      return { key: `x|${u.name}|${u.unitId}`, label, aisle: 'Other' }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  return { aisles, unmatched, unquantified: [...unquantified], basics: [...basics].sort() }
}

function formatLine(def: IngredientDef, qty: number, unitId: string): ShopLine {
  const unit = getUnit(unitId)
  const q = formatQty(qty, unit.dimension)
  const name =
    unit.dimension === 'count' ? (qty <= 1 ? def.name : def.plural) : def.plural
  const label =
    unit.dimension === 'count' ? `${q} ${name}` : `${q} ${unit.label} ${name}`
  return { key: `${def.id}|${unitId}`, label, aisle: def.aisle }
}

function formatQty(qty: number, dim: Dimension): string {
  // You buy whole countable things; round those up.
  if (dim === 'count') return String(Math.max(1, Math.ceil(qty)))
  const rounded = Math.round(qty * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
