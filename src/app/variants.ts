// Application layer: user variant overrides — edits layered over the import-seeded
// grouping (Recipe.variantGroupKey/variantGroupLead). The seam the Refine UI and the
// feature tests call. Pure resolution lives in src/lib/variants.ts.

import { db } from '../db/db'
import type { Recipe } from '../schema/recipe'
import type { VariantOverride } from '../schema/userData'
import type { Dish } from '../lib/variants'

const newId = () => crypto.randomUUID()

export function getOverrides(): Promise<VariantOverride[]> {
  return db.variantOverrides.toArray()
}

/**
 * The effective dish (lead + variants, lead first) for one recipe, honouring user
 * overrides. An overriding entry wins; otherwise the recipe's import-key siblings that
 * aren't pinned by some override, led by the `variantGroupLead` member; else itself.
 */
export async function dishForRecipe(recipeId: string): Promise<Dish | null> {
  const recipe = await db.recipes.get(recipeId)
  if (!recipe) return null
  const overrides = await db.variantOverrides.toArray()

  const own = overrides.find((o) => o.recipeIds.includes(recipeId))
  if (own) {
    const members = (await db.recipes.bulkGet(own.recipeIds)).filter(
      (r): r is Recipe => r != null,
    )
    if (!members.length) return { lead: recipe, variants: [recipe] }
    const lead = members.find((m) => m.id === own.leadId) ?? members[0]
    return { lead, variants: [lead, ...members.filter((m) => m.id !== lead.id)] }
  }

  if (recipe.variantGroupKey) {
    const pinned = new Set(overrides.flatMap((o) => o.recipeIds))
    const siblings = (
      await db.recipes.where('variantGroupKey').equals(recipe.variantGroupKey).toArray()
    ).filter((r) => !pinned.has(r.id))
    const lead = siblings.find((m) => m.variantGroupLead) ?? siblings[0] ?? recipe
    return { lead, variants: [lead, ...siblings.filter((m) => m.id !== lead.id)] }
  }

  return { lead: recipe, variants: [recipe] }
}

/**
 * Save a variant override for a set of recipes with a chosen lead. Enforces one override
 * per recipe: the given recipes are stripped from every other override first (an override
 * emptied that way is deleted; one whose lead was taken re-leads to a remaining member).
 * A single-recipe set detaches that recipe from its import group.
 */
export async function setVariantOverride(recipeIds: string[], leadId: string): Promise<void> {
  const ids = [...new Set(recipeIds)]
  if (ids.length === 0) return
  const lead = ids.includes(leadId) ? leadId : ids[0]
  await db.transaction('rw', db.variantOverrides, async () => {
    const claim = new Set(ids)
    for (const o of await db.variantOverrides.toArray()) {
      const kept = o.recipeIds.filter((id) => !claim.has(id))
      if (kept.length === o.recipeIds.length) continue
      if (kept.length === 0) await db.variantOverrides.delete(o.id)
      else await db.variantOverrides.put({ ...o, recipeIds: kept, leadId: kept.includes(o.leadId) ? o.leadId : kept[0] })
    }
    await db.variantOverrides.put({ id: newId(), recipeIds: ids, leadId: lead })
  })
}

/** Re-designate the lead of an existing override. No-op if the id/lead don't match. */
export async function setOverrideLead(overrideId: string, leadId: string): Promise<void> {
  const o = await db.variantOverrides.get(overrideId)
  if (!o || !o.recipeIds.includes(leadId)) return
  await db.variantOverrides.put({ ...o, leadId })
}

/** Remove one recipe from an override's dish, detaching it. Dissolves the override if that
 *  leaves fewer than two members (the remainder falls back to import grouping). */
export async function removeFromOverride(overrideId: string, recipeId: string): Promise<void> {
  const o = await db.variantOverrides.get(overrideId)
  if (!o) return
  const kept = o.recipeIds.filter((id) => id !== recipeId)
  await db.transaction('rw', db.variantOverrides, async () => {
    if (kept.length < 2) await db.variantOverrides.delete(o.id)
    else await db.variantOverrides.put({ ...o, recipeIds: kept, leadId: kept.includes(o.leadId) ? o.leadId : kept[0] })
    // Pin the removed recipe alone so it doesn't rejoin its import group.
    await db.variantOverrides.put({ id: newId(), recipeIds: [recipeId], leadId: recipeId })
  })
}

/** Dissolve an override entirely — its members fall back to the import-seeded grouping. */
export async function dissolveOverride(overrideId: string): Promise<void> {
  await db.variantOverrides.delete(overrideId)
}
