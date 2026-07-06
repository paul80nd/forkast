import { db } from '../db/db'
import { AISLE_ORDER } from '../data/ingredients'
import {
  addToOrder,
  renameInOrder,
  removeFromOrder,
  moveInOrder,
  orderedAisles,
} from '../lib/aisles'

// Aisle management (Config → Ingredients): the ordered aisle list that groups the shopping list,
// persisted as a single `settings` row so it rides along in the backup snapshot (no schema bump).
// The pure list maths lives in src/lib/aisles.ts; this seam adds the Dexie reads/writes — and the
// dictionary rewrite a rename needs, so bound lines keep their (renamed) aisle.

const KEY = 'aisleOrder'

/** The saved aisle order, falling back to the built-in default when the user hasn't customised it. */
export async function getAisleOrder(): Promise<string[]> {
  const row = await db.settings.get(KEY)
  return Array.isArray(row?.value) ? (row.value as string[]) : [...AISLE_ORDER]
}

async function saveAisleOrder(order: string[]): Promise<void> {
  await db.settings.put({ key: KEY, value: order })
}

/** The effective list: the saved order plus any aisle a dictionary entry still references. */
export async function getEffectiveAisles(): Promise<string[]> {
  const [order, dict] = await Promise.all([getAisleOrder(), db.dictionary.toArray()])
  return orderedAisles(
    order,
    dict.map((d) => d.aisle),
  )
}

/** Add a new (empty) aisle so it's available in pickers and takes a slot in the shop order. */
export async function addAisle(name: string): Promise<void> {
  const order = await getEffectiveAisles()
  const next = addToOrder(order, name)
  if (next !== order) await saveAisleOrder(next)
}

/** Nudge an aisle one slot up (-1) or down (+1) in the shop order. */
export async function moveAisle(name: string, delta: number): Promise<void> {
  const order = await getEffectiveAisles()
  const next = moveInOrder(order, name, delta)
  if (next !== order) await saveAisleOrder(next)
}

/**
 * Rename an aisle everywhere: rewrite the dictionary entries that use it, then the order list.
 * If the target already exists this is a merge — the entries fold into it. Returns how many
 * dictionary entries moved.
 */
export async function renameAisle(from: string, to: string): Promise<number> {
  const target = to.trim()
  if (!target) return 0
  let moved = 0
  await db.transaction('rw', db.dictionary, db.settings, async () => {
    const order = await getEffectiveAisles()
    const affected = await db.dictionary.filter((d) => d.aisle === from).toArray()
    for (const d of affected) await db.dictionary.put({ ...d, aisle: target })
    moved = affected.length
    await saveAisleOrder(renameInOrder(order, from, target))
  })
  return moved
}

/**
 * Delete an aisle — only when no dictionary entry uses it (else its lines would lose their
 * grouping). Returns false (a no-op) if any ingredient still sits in it.
 */
export async function deleteAisle(name: string): Promise<boolean> {
  const used = await db.dictionary.filter((d) => d.aisle === name).count()
  if (used > 0) return false
  const order = await getEffectiveAisles()
  await saveAisleOrder(removeFromOrder(order, name))
  return true
}
