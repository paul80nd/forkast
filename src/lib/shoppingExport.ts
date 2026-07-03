import type { ShoppingList, ShopLine } from './shopping'
import type { ExtraItem } from '../schema/userData'

/**
 * Render a shopping list as a plain-text checklist to paste into a notes app or an email:
 * one checkbox per aisle, its items indented beneath, ticked items shown ticked, and the
 * recipe-unit conversion (e.g. "(1 tsp)") kept just as the UI shows it. An aisle is ticked
 * only when all its items are.
 *
 *   Shopping list · Fri 3 Jul
 *
 *   - [ ] Produce
 *       - [ ] Spring onions x2
 *   - [ ] Pantry
 *       - [x] Dried chilli flakes 11g (1 tsp)
 */
export function shoppingListToText(
  list: ShoppingList,
  checked: ReadonlySet<string>,
  extras: readonly ExtraItem[] = [],
  opts: { title?: string } = {},
): string {
  const out: string[] = [opts.title ?? 'Shopping list', '']

  const groups = list.aisles.map((a) => ({ aisle: a.aisle, items: a.lines }))
  if (list.unmatched.length) groups.push({ aisle: 'Other', items: list.unmatched })

  for (const g of groups) {
    if (!g.items.length) continue
    out.push(`- ${box(g.items.every((l) => checked.has(l.key)))} ${g.aisle}`)
    for (const l of g.items) out.push(`    - ${box(checked.has(l.key))} ${itemText(l)}`)
  }

  if (extras.length) {
    out.push(`- ${box(extras.every((e) => e.checked))} Extras`)
    for (const e of extras) out.push(`    - ${box(e.checked)} ${cap(e.text)}`)
  }

  return out.join('\n')
}

const box = (checked: boolean) => (checked ? '[x]' : '[ ]')
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** "dried chilli flakes · 11 g" (+ detail "1 tsp") → "Dried chilli flakes 11g (1 tsp)".
 *  Reformats the name-first UI label into the compact "Name amount (detail)" line: count
 *  "× 2" → "x2", measured "11 g" → "11g", with the conversion breakdown in parentheses. */
function itemText(line: ShopLine): string {
  const sep = line.label.indexOf(' · ')
  const name = sep === -1 ? line.label : line.label.slice(0, sep)
  const rawAmount = sep === -1 ? '' : line.label.slice(sep + 3)
  const amount = rawAmount.startsWith('× ') ? `x${rawAmount.slice(2)}` : rawAmount.replace(' ', '')
  let text = cap(name)
  if (amount) text += ` ${amount}`
  if (line.detail) text += ` (${line.detail})`
  return text
}
