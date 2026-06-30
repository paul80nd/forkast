// Per-recipe curation writes (stars + rotation) against IndexedDB. The app-layer seam the
// UI and the feature tests both call; the pure vocabulary lives in src/lib/curation.ts.

import { db } from '../db/db'
import type { Rotation, Stars } from '../schema/userData'

/** True when the row carries curation other than `stars` — so clearing stars keeps the row. */
function hasOtherCuration(row: { rotation?: Rotation; notes?: string; userTags?: string[] }) {
  return Boolean(row.rotation || row.notes || row.userTags?.length)
}

/**
 * Set (or clear, with `undefined`) a recipe's star rating, preserving any rotation, notes
 * or tags already on the row. Clearing a row that has nothing else removes it.
 */
export async function setStars(
  recipeId: string,
  stars: Stars | undefined,
): Promise<void> {
  const existing = await db.userData.get(recipeId)
  if (stars === undefined) {
    if (existing && hasOtherCuration(existing)) {
      await db.userData.put({ ...existing, stars: undefined })
    } else if (existing) {
      await db.userData.delete(recipeId)
    }
    return
  }
  await db.userData.put({ ...(existing ?? { recipeId }), recipeId, stars })
}

/**
 * Set (or clear, with `undefined`) a recipe's desired rotation, preserving any stars, notes
 * or tags already on the row. Clearing a row that has nothing else removes it.
 */
export async function setRotation(
  recipeId: string,
  rotation: Rotation | undefined,
): Promise<void> {
  const existing = await db.userData.get(recipeId)
  if (rotation === undefined) {
    if (existing && (existing.stars || existing.notes || existing.userTags?.length)) {
      await db.userData.put({ ...existing, rotation: undefined })
    } else if (existing) {
      await db.userData.delete(recipeId)
    }
    return
  }
  await db.userData.put({ ...(existing ?? { recipeId }), recipeId, rotation })
}

/**
 * Clear a recipe's rating *and* rotation in one read-modify-write, sending it back to the
 * unrated triage backlog. Notes/tags are kept (the row survives if it has them). Done as a
 * single operation deliberately: calling setStars + setRotation concurrently would race on
 * the same row, with the second write resurrecting the value the first cleared.
 */
export async function clearCuration(recipeId: string): Promise<void> {
  const existing = await db.userData.get(recipeId)
  if (!existing) return
  if (existing.notes || existing.userTags?.length) {
    await db.userData.put({ ...existing, stars: undefined, rotation: undefined })
  } else {
    await db.userData.delete(recipeId)
  }
}
