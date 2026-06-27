// The measurement system: units belong to a dimension (count / volume / mass)
// and convert via that dimension's base unit (each / ml / g). Cross-dimension
// conversion (volume<->mass) needs a per-ingredient density and is optional.

export type Dimension = 'count' | 'volume' | 'mass'

export interface Unit {
  id: string
  /** Shown before the name, e.g. "g", "tbsp". Empty for counts. */
  label: string
  dimension: Dimension
  /** How many base units (each / ml / g) equal one of this unit. */
  perBase: number
}

export const UNITS: Record<string, Unit> = {
  each: { id: 'each', label: '', dimension: 'count', perBase: 1 },
  g: { id: 'g', label: 'g', dimension: 'mass', perBase: 1 },
  kg: { id: 'kg', label: 'kg', dimension: 'mass', perBase: 1000 },
  ml: { id: 'ml', label: 'ml', dimension: 'volume', perBase: 1 },
  l: { id: 'l', label: 'l', dimension: 'volume', perBase: 1000 },
  tsp: { id: 'tsp', label: 'tsp', dimension: 'volume', perBase: 5 },
  tbsp: { id: 'tbsp', label: 'tbsp', dimension: 'volume', perBase: 15 },
}

/** Resolve a unit id, defaulting a missing/unknown unit to a count. */
export function getUnit(id: string | undefined): Unit {
  return (id && UNITS[id]) || UNITS.each
}

/**
 * Convert `qty` from one unit to another. Same-dimension conversions always
 * work; volume<->mass works only with a density (grams per ml). Returns null
 * when there's no natural conversion — the caller then keeps the recipe unit.
 */
export function convert(
  qty: number,
  fromId: string,
  toId: string,
  densityGPerMl?: number,
): number | null {
  const from = getUnit(fromId)
  const to = getUnit(toId)
  if (from.dimension === to.dimension) {
    return (qty * from.perBase) / to.perBase
  }
  if (densityGPerMl) {
    if (from.dimension === 'volume' && to.dimension === 'mass') {
      return (qty * from.perBase * densityGPerMl) / to.perBase
    }
    if (from.dimension === 'mass' && to.dimension === 'volume') {
      return (qty * from.perBase) / densityGPerMl / to.perBase
    }
  }
  return null
}
