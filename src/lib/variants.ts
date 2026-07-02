import type { Recipe } from '../schema/recipe'
import type { VariantOverride } from '../schema/userData'

/** One dish: a lead card plus the variants that swap into it (protein / carb / side). */
export interface Dish {
  /** The card to display — the group's flagged lead, or the first member if the lead
   *  isn't in the input (e.g. it was filtered out by a search). */
  lead: Recipe
  /** Every variant of this dish present in the input, lead first. Length 1 for a
   *  standalone recipe. */
  variants: Recipe[]
}

const leadFirst = (members: Recipe[], lead: Recipe): Recipe[] => [
  lead,
  ...members.filter((m) => m.id !== lead.id),
]

/**
 * Resolve a recipe list into dishes, honouring user variant overrides on top of the
 * import-seeded grouping. A recipe named by an override joins that override's dish (led by
 * its `leadId`), leaving its import group. Every other recipe groups by `variantGroupKey`
 * (led by the `variantGroupLead` member), and a keyless recipe is its own dish. Input order
 * is preserved by each dish's first appearance, so a pre-sorted list stays sorted.
 */
export function resolveDishes(recipes: Recipe[], overrides: VariantOverride[]): Dish[] {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const overrideOf = new Map<string, VariantOverride>()
  for (const o of overrides) {
    for (const id of o.recipeIds) if (byId.has(id)) overrideOf.set(id, o)
  }

  // Bucket the un-overridden recipes by import key in one pass (keeps resolution O(n)).
  const unpinnedByKey = new Map<string, Recipe[]>()
  for (const r of recipes) {
    if (overrideOf.has(r.id) || !r.variantGroupKey) continue
    if (!unpinnedByKey.has(r.variantGroupKey)) unpinnedByKey.set(r.variantGroupKey, [])
    unpinnedByKey.get(r.variantGroupKey)!.push(r)
  }

  const dishes: Dish[] = []
  const emitted = new Set<string>()
  for (const r of recipes) {
    const o = overrideOf.get(r.id)
    if (o) {
      if (emitted.has(`o:${o.id}`)) continue
      emitted.add(`o:${o.id}`)
      const members = o.recipeIds
        .map((id) => byId.get(id))
        .filter((m): m is Recipe => m != null)
      if (!members.length) continue
      const lead = members.find((m) => m.id === o.leadId) ?? members[0]
      dishes.push({ lead, variants: leadFirst(members, lead) })
    } else if (r.variantGroupKey) {
      if (emitted.has(`k:${r.variantGroupKey}`)) continue
      emitted.add(`k:${r.variantGroupKey}`)
      const members = unpinnedByKey.get(r.variantGroupKey)!
      const lead = members.find((m) => m.variantGroupLead) ?? members[0]
      dishes.push({ lead, variants: leadFirst(members, lead) })
    } else {
      dishes.push({ lead: r, variants: [r] })
    }
  }
  return dishes
}

/**
 * Collapse a recipe list to one entry per dish by the import-seeded grouping only (no user
 * overrides). Thin wrapper over {@link resolveDishes}; used where overrides don't apply.
 */
export function collapseVariants(recipes: Recipe[]): Dish[] {
  return resolveDishes(recipes, [])
}

/** Map each recipe id to the number of variants in its dish — for a "N versions" badge. */
export function dishSizeByRecipe(dishes: Dish[]): Map<string, number> {
  const sizes = new Map<string, number>()
  for (const d of dishes) for (const v of d.variants) sizes.set(v.id, d.variants.length)
  return sizes
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
