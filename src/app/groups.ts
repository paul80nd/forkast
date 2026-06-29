// Application layer: recipe variant groups. Grouping is curation — it lives in its own
// user-data table and never mutates the re-importable recipe records. Two invariants are
// enforced here:
//   1. One group per recipe — adding a recipe to a group MOVES it out of any other.
//   2. At least two members — a group that would drop below two is dissolved.
// Membership lookup is in memory (groups are few); the table is the source of truth.

import { db } from '../db/db'
import type { VariantGroup } from '../schema/userData'

export interface GroupMemberInput {
  recipeId: string
  label: string
}

/** Keep the first occurrence of each recipeId, preserving order. */
function dedupeMembers(members: GroupMemberInput[]): GroupMemberInput[] {
  const seen = new Set<string>()
  return members.filter((m) => (seen.has(m.recipeId) ? false : seen.add(m.recipeId)))
}

/**
 * Remove a recipe from whatever group holds it, dissolving that group if it drops below
 * two members. **Must run inside a rw transaction over `variantGroups`** — callers wrap.
 * `exceptGroupId` leaves one group untouched (used when re-saving that same group).
 */
export async function detachRecipeFromGroups(
  recipeId: string,
  exceptGroupId?: string,
): Promise<void> {
  const groups = await db.variantGroups.toArray()
  for (const g of groups) {
    if (g.id === exceptGroupId) continue
    if (!g.members.some((m) => m.recipeId === recipeId)) continue
    const members = g.members.filter((m) => m.recipeId !== recipeId)
    if (members.length < 2) await db.variantGroups.delete(g.id)
    else await db.variantGroups.put({ ...g, members })
  }
}

/**
 * Create a group from two or more members. Any member already in another group is moved
 * here (and that group dissolved if it drops below two). Throws if fewer than two distinct
 * members are given.
 */
export async function createGroup(
  members: GroupMemberInput[],
  axis?: VariantGroup['axis'],
): Promise<VariantGroup> {
  const unique = dedupeMembers(members)
  if (unique.length < 2) throw new Error('A group needs at least two members')
  const group: VariantGroup = { id: crypto.randomUUID(), axis, members: unique }
  await db.transaction('rw', db.variantGroups, async () => {
    for (const m of unique) await detachRecipeFromGroups(m.recipeId)
    await db.variantGroups.add(group)
  })
  return group
}

/**
 * Replace a group's members (and axis). Members coming from other groups are moved in;
 * members dropped from this group become ungrouped. Throws if the group is unknown or the
 * new membership has fewer than two distinct members.
 */
export async function updateGroup(
  id: string,
  members: GroupMemberInput[],
  axis?: VariantGroup['axis'],
): Promise<VariantGroup> {
  const unique = dedupeMembers(members)
  if (unique.length < 2) throw new Error('A group needs at least two members')
  return db.transaction('rw', db.variantGroups, async () => {
    const existing = await db.variantGroups.get(id)
    if (!existing) throw new Error(`No such group: ${id}`)
    for (const m of unique) await detachRecipeFromGroups(m.recipeId, id)
    const updated: VariantGroup = { ...existing, axis, members: unique }
    await db.variantGroups.put(updated)
    return updated
  })
}

/** Disband a group entirely (its members become ungrouped). */
export async function deleteGroup(id: string): Promise<void> {
  await db.variantGroups.delete(id)
}

/** Remove a recipe from its group as a standalone action (wraps the in-tx detach). */
export async function removeRecipeFromGroup(recipeId: string): Promise<void> {
  await db.transaction('rw', db.variantGroups, () => detachRecipeFromGroups(recipeId))
}

/** The group a recipe belongs to, if any. */
export async function groupForRecipe(recipeId: string): Promise<VariantGroup | undefined> {
  const groups = await db.variantGroups.toArray()
  return groups.find((g) => g.members.some((m) => m.recipeId === recipeId))
}

export interface SeeAlsoItem {
  recipeId: string
  /** The sibling recipe's title (falls back to its id if the record is missing). */
  title: string
  /** The variant label within the group ("Rice", "Beef"). */
  label: string
}

/**
 * The sibling variants of a recipe — its group members minus itself — resolved to titles
 * for display. Empty when the recipe isn't grouped. Powers the detail page's "see also".
 */
export async function seeAlsoFor(recipeId: string): Promise<SeeAlsoItem[]> {
  const group = await groupForRecipe(recipeId)
  if (!group) return []
  const siblings = group.members.filter((m) => m.recipeId !== recipeId)
  const recipes = await db.recipes.bulkGet(siblings.map((m) => m.recipeId))
  return siblings.map((m, i) => ({
    recipeId: m.recipeId,
    title: recipes[i]?.title ?? m.recipeId,
    label: m.label,
  }))
}

/** Reverse index recipeId → group, built from the table (for "see also" rendering). */
export async function buildGroupIndex(): Promise<Map<string, VariantGroup>> {
  const index = new Map<string, VariantGroup>()
  for (const g of await db.variantGroups.toArray()) {
    for (const m of g.members) index.set(m.recipeId, g)
  }
  return index
}
