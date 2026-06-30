// Pure curation vocabulary — labels and orderings, no I/O. The Dexie writes that act on
// these (setStars / setRotation / clearCuration) live in src/app/curation.ts.

import type { Rotation, Stars } from '../schema/userData'

/** The household's opinionated verdict for each star tier (shown beside the stars). */
export const STAR_LABELS: Record<Stars, string> = {
  5: 'Yum Yum',
  4: 'Like it',
  3: "I'd eat it",
  2: 'Rather not',
  1: 'Yuk',
}

/** How often you'd want this in rotation, 1–5 with 3 as the neutral middle. */
export const ROTATION_LABELS: Record<Rotation, string> = {
  5: 'On repeat',
  4: 'Often',
  3: 'Now & then',
  2: 'Occasionally',
  1: 'Rarely',
}
