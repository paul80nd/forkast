// Pure curation vocabulary — labels and orderings, no I/O. The Dexie writes that act on
// these (setStars / setRotation) live in src/app/curation.ts.

import type { Rotation, Stars } from '../schema/userData'

/** The household's sticky-note meaning for each star tier. */
export const STAR_LABELS: Record<Stars, string> = {
  5: 'Favourite',
  4: 'Nice',
  3: 'Only for variety',
  2: 'Bin it',
  1: 'Very bin it',
}

/** Rotation tiers, most-wanted → rarest (display order). */
export const ROTATIONS: Rotation[] = ['weekly', 'often', 'occasional', 'treat']

/** Human label for each rotation tier. */
export const ROTATION_LABELS: Record<Rotation, string> = {
  weekly: 'Weekly',
  often: 'Often',
  occasional: 'Occasional',
  treat: 'Treat',
}
