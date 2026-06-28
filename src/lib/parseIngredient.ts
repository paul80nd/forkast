// Parsing a source ingredient label into a structured quantity + unit.
//
// Source labels pack the quantity and name into one human string. We extract
// ONLY the quantity and unit here; the canonical name comes from the source's
// own (already-clean) name field, not from re-parsing the label — that keeps
// this generic and avoids the classic "where does the name start" guesswork.
//
// Three label shapes cover real data:
//   "Diced chicken breast (250g)"   trailing parenthetical measure (most common)
//   "250g British diced chicken"    leading measure
//   "Spring onion"                  name only → a single count
//
// A trailing " xN" marker is fulfilment noise (how a source packs a box), not a
// human quantity — it is stripped and ignored. The authoritative pack count for
// a recipe comes from its portion data, applied by the caller, not from here.

// Explicit .ts extension so the native-Node import CLI can resolve this shared
// module too (tsconfig sets allowImportingTsExtensions; Vite handles it as well).
import { UNITS } from './units.ts'

/**
 * How the quantity was expressed — lets a caller decide pack-scaling:
 *  - `measured`: a number + recognised unit, e.g. "(250g)" — a per-pack amount.
 *  - `count`: a bare leading number, e.g. "4 white potatoes" — a stated total.
 *  - `implied`: name only, e.g. "Spring onion" — a single item.
 */
export type QuantityKind = 'measured' | 'count' | 'implied'

export interface ParsedQuantity {
  /** Numeric quantity, e.g. 250. Absent when the label carries no quantity. */
  qty?: number
  /** Unit id from the unit system (see units.ts), e.g. "g", "ml", "each". */
  unit?: string
  /** How the quantity was expressed (absent when the label is blank). */
  kind?: QuantityKind
}

/** Source unit spellings that map onto a canonical unit id. */
const UNIT_ALIASES: Record<string, string> = { pcs: 'each', pc: 'each' }

/** Resolve a label token to a known unit id, or undefined if it isn't a unit. */
function resolveUnit(token: string): string | undefined {
  const t = token.toLowerCase()
  if (UNIT_ALIASES[t]) return UNIT_ALIASES[t]
  return UNITS[t] ? t : undefined
}

const NUMBER_THEN_WORD = /(\d+(?:\.\d+)?)\s*([A-Za-z]+)/g
const LEADING_NUMBER = /^(\d+(?:\.\d+)?)\b/

/**
 * Extract `{ qty, unit }` from a single ingredient label. Returns an empty
 * object only when the label is blank; otherwise always yields a quantity
 * (defaulting a name-only label to a single count).
 */
export function parseQuantity(label: string): ParsedQuantity {
  if (!label) return {}
  // Drop the fulfilment marker (" x0", " x2", …) and surrounding whitespace.
  const core = label.replace(/\s*x\d+\s*$/i, '').trim()
  if (!core) return {}

  // 1) A number immediately followed by a *known unit*, anywhere in the label.
  //    Scanning all matches avoids latching onto a number inside the name
  //    (e.g. "Chinese 5 spice (10g)" → 10g, not "5 spice").
  NUMBER_THEN_WORD.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = NUMBER_THEN_WORD.exec(core))) {
    const unit = resolveUnit(m[2])
    if (unit) return { qty: parseFloat(m[1]), unit, kind: 'measured' }
  }

  // 2) A leading count with no unit, e.g. "2 spring onions".
  const lead = core.match(LEADING_NUMBER)
  if (lead) return { qty: parseFloat(lead[1]), unit: 'each', kind: 'count' }

  // 3) Name only → one count.
  return { qty: 1, unit: 'each', kind: 'implied' }
}
