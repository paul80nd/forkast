import type { Recipe } from '../schema/recipe'

/** One dish: a lead card plus the variants that swap into it (protein / carb / side). */
export interface Dish {
  /** The card to display — the group's flagged lead, or the first member if the lead
   *  isn't in the input (e.g. it was filtered out by a search). */
  lead: Recipe
  /** Every variant of this dish present in the input, lead first. Length 1 for a
   *  standalone recipe. */
  variants: Recipe[]
}

/**
 * Collapse a recipe list to one entry per dish. Recipes sharing a `variantGroupKey` fold
 * into a single {@link Dish} led by the member flagged `variantGroupLead` (falling back to
 * the first member when the lead isn't present). Recipes without a key are standalone
 * dishes. Input order is preserved by each dish's first appearance, so a pre-sorted list
 * stays sorted.
 */
export function collapseVariants(recipes: Recipe[]): Dish[] {
  const groups = new Map<string, Recipe[]>()
  const order: string[] = []
  for (const r of recipes) {
    // Standalone recipes get a unique key so they never merge with each other.
    const key = r.variantGroupKey ?? `@${r.id}`
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(r)
  }

  return order.map((key) => {
    const members = groups.get(key)!
    const leadIdx = members.findIndex((m) => m.variantGroupLead)
    if (leadIdx <= 0) return { lead: members[0], variants: members }
    const lead = members[leadIdx]
    return { lead, variants: [lead, ...members.filter((_, i) => i !== leadIdx)] }
  })
}

/** Total number of variants per `variantGroupKey` across a full recipe set — for a
 *  "N versions" badge that reflects the whole dish even when the list is filtered. */
export function variantCounts(recipes: Recipe[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const r of recipes) {
    if (!r.variantGroupKey) continue
    counts.set(r.variantGroupKey, (counts.get(r.variantGroupKey) ?? 0) + 1)
  }
  return counts
}

/** A short chip label for a variant: the words in its title that the lead's title lacks
 *  (the swap — "Brown Rice", "Chicken Breast"). Falls back to the full title when nothing
 *  distinguishes it (e.g. the lead itself, or a same-title variant). */
export function variantLabel(title: string, leadTitle: string): string {
  const stop = new Set(['a', 'an', 'the', 'with', 'and', 'of', 'in', '&'])
  const leadWords = new Set(leadTitle.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
  const extra = title
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .filter((w) => !leadWords.has(w.toLowerCase()) && !stop.has(w.toLowerCase()))
  return extra.join(' ') || title
}

/** Ingredient-name changes from one recipe to another (by name, case-insensitive) — the
 *  swap made visible: what the target adds and what it drops versus the source. */
export function ingredientDelta(
  from: Recipe,
  to: Recipe,
): { added: string[]; removed: string[] } {
  const norm = (n: string) => n.trim().toLowerCase()
  const fromNames = new Set(from.ingredients.map((i) => norm(i.name)))
  const toNames = new Set(to.ingredients.map((i) => norm(i.name)))
  return {
    added: to.ingredients.filter((i) => !fromNames.has(norm(i.name))).map((i) => i.name),
    removed: from.ingredients.filter((i) => !toNames.has(norm(i.name))).map((i) => i.name),
  }
}
