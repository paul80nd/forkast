// Serving-scaler maths for the recipe page: recompute ingredient quantities for a chosen
// portion count. Pure + unit-tested; the same `qty * factor` the shopping merge uses, with a
// light format so a cook sees "160 g", not "159.99999 g".

import type { Ingredient } from '../schema/recipe'

/** Scale factor from a recipe's base servings to a chosen count. */
export function servingFactor(chosen: number, base: number): number {
  return base > 0 ? chosen / base : 1
}

/**
 * Round a scaled amount to at most one decimal place, trimming float noise (mirrors the
 * shopping list's measured-unit rounding). Whole results stay whole.
 */
export function formatScaledQty(qty: number): string {
  const rounded = Math.round(qty * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * The ingredient's display label at a serving factor. At factor 1 — or for an unparsed line
 * (no numeric qty, e.g. "to taste") — the original human label is kept verbatim. Otherwise the
 * line is rebuilt from its parsed parts with the scaled quantity.
 */
export function scaledIngredientLabel(ing: Ingredient, factor: number): string {
  if (factor === 1 || ing.qty == null) return ing.rawLabel
  const qty = formatScaledQty(ing.qty * factor)
  return `${qty}${ing.unit ? ` ${ing.unit}` : ''} ${ing.name}`
}
