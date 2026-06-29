// Application layer: the Save/Open backup use-case. Save snapshots every table into a
// self-contained envelope; Open wipes all data and restores it wholesale — a true
// restore point that needs no matching recipes.json and preserves in-app deletions
// (there are no tombstones, so the curated recipe set itself is the record of what was
// kept). Pure validation lives in src/lib/backup.ts; this is the seam the UI and the
// feature tests both drive.

import { db } from '../db/db'
import { parseBackup } from '../lib/backup'
import type { BackupSnapshot } from '../schema/userData'

/**
 * Read every table into a self-contained snapshot. `exportedAt` is injectable so tests
 * are deterministic; in the app it defaults to now.
 */
export async function exportBackup(
  exportedAt: string = new Date().toISOString(),
): Promise<BackupSnapshot> {
  const [recipes, userData, cooked, plans, shopping, variantGroups, settings] =
    await db.transaction(
      'r',
      [db.recipes, db.userData, db.cooked, db.plans, db.shopping, db.variantGroups, db.settings],
      () =>
        Promise.all([
          db.recipes.toArray(),
          db.userData.toArray(),
          db.cooked.toArray(),
          db.plans.toArray(),
          db.shopping.toArray(),
          db.variantGroups.toArray(),
          db.settings.toArray(),
        ]),
    )

  return {
    version: 2,
    exportedAt,
    recipes,
    userData,
    cooked,
    plans,
    shopping,
    variantGroups,
    settings,
  }
}

export interface RestoreResult {
  /** Recipes loaded from the snapshot. */
  recipes: number
  /** Non-fatal validation issues from the file. */
  warnings: string[]
}

/**
 * Restore a backup: validate, wipe every table, then load the snapshot. Accepts the raw
 * JSON text or the parsed object. Throws (without touching the store) when the file isn't
 * a recognisable backup.
 */
export async function importBackup(input: unknown): Promise<RestoreResult> {
  const { snapshot, warnings } = parseBackup(input)

  await db.transaction(
    'rw',
    [db.recipes, db.userData, db.cooked, db.plans, db.shopping, db.variantGroups, db.settings],
    async () => {
      await Promise.all([
        db.recipes.clear(),
        db.userData.clear(),
        db.cooked.clear(),
        db.plans.clear(),
        db.shopping.clear(),
        db.variantGroups.clear(),
        db.settings.clear(),
      ])
      await Promise.all([
        db.recipes.bulkPut(snapshot.recipes),
        db.userData.bulkPut(snapshot.userData),
        db.cooked.bulkPut(snapshot.cooked),
        db.plans.bulkPut(snapshot.plans),
        db.shopping.bulkPut(snapshot.shopping),
        db.variantGroups.bulkPut(snapshot.variantGroups),
        db.settings.bulkPut(snapshot.settings),
      ])
      // A restored snapshot with recipes is the user's own data; guard against the demo
      // seed clobbering it if the file happened to lack the marker.
      if (snapshot.recipes.length && !snapshot.settings.some((s) => s.key === 'dataSource')) {
        await db.settings.put({ key: 'dataSource', value: 'user' })
      }
    },
  )

  return { recipes: snapshot.recipes.length, warnings }
}
