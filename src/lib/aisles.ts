// Aisle-order helpers: pure list operations over the ordered aisle names that group the shopping
// list. The order is persisted as a settings row (seeded from AISLE_ORDER when unset); these
// functions never touch Dexie. Matching is case-insensitive on the trimmed name, but the chosen
// display spelling is preserved.

const norm = (s: string) => s.trim().toLowerCase()

/** Append a new aisle if not already present (case-insensitive). Blank names are ignored. */
export function addToOrder(order: string[], name: string): string[] {
  const t = name.trim()
  if (!t || order.some((a) => norm(a) === norm(t))) return order
  return [...order, t]
}

/**
 * Rename `from` to `to`. If `to` already exists elsewhere it's a **merge**: the `from` slot is
 * dropped and the existing `to` keeps its position. A no-op if `from` is absent or `to` is blank.
 * A casing-only change (same normalised name) re-spells in place.
 */
export function renameInOrder(order: string[], from: string, to: string): string[] {
  const t = to.trim()
  if (!t || !order.some((a) => norm(a) === norm(from))) return order
  const mergeIntoExisting = order.some((a) => norm(a) === norm(t) && norm(a) !== norm(from))
  const out: string[] = []
  for (const a of order) {
    if (norm(a) === norm(from)) {
      if (!mergeIntoExisting) out.push(t) // straight rename keeps the slot
      // else drop this slot — the entries fold into the existing target
    } else {
      out.push(a)
    }
  }
  return out
}

/** Remove an aisle from the order (case-insensitive). */
export function removeFromOrder(order: string[], name: string): string[] {
  return order.filter((a) => norm(a) !== norm(name))
}

/** Move an aisle one slot up (delta -1) or down (delta +1); clamped, case-insensitive match. */
export function moveInOrder(order: string[], name: string, delta: number): string[] {
  const i = order.findIndex((a) => norm(a) === norm(name))
  if (i < 0) return order
  const j = i + delta
  if (j < 0 || j >= order.length) return order
  const out = [...order]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

/**
 * The effective aisle list: the saved order, then any *used* aisle not already in it (in
 * first-seen order). Used aisles come from dictionary entries whose aisle isn't in the saved
 * order yet — this keeps the shopping list and pickers showing them without a persisted slot.
 */
export function orderedAisles(order: string[], used: Iterable<string>): string[] {
  const out = [...order]
  for (const a of used) {
    const t = a.trim()
    if (t && !out.some((x) => norm(x) === norm(t))) out.push(t)
  }
  return out
}
