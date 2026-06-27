import { db } from '../db/db'
import type { Stars } from '../schema/userData'

/** The household's sticky-note meaning for each star tier. */
export const STAR_LABELS: Record<Stars, string> = {
  5: 'Favourite',
  4: 'Nice',
  3: 'Only for variety',
  2: 'Bin it',
  1: 'Bin it',
}

/**
 * Set (or clear, with `undefined`) a recipe's star rating, preserving any notes
 * or tags already on the row. Clearing a row that has nothing else removes it.
 */
export async function setStars(
  recipeId: string,
  stars: Stars | undefined,
): Promise<void> {
  const existing = await db.userData.get(recipeId)
  if (stars === undefined) {
    if (existing && (existing.notes || existing.userTags?.length)) {
      await db.userData.put({ ...existing, stars: undefined })
    } else if (existing) {
      await db.userData.delete(recipeId)
    }
    return
  }
  await db.userData.put({ ...(existing ?? { recipeId }), recipeId, stars })
}
