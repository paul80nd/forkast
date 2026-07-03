import type { ShoppingList, ShopLine } from './shopping'
import type { ExtraItem } from '../schema/userData'

// Two renderings of a shopping list for sharing:
//  - shoppingListToText: clean plain text (aisle headers, tab-indented items). Apple Notes
//    can't import a checklist from text (it only *exports* the "- [ ]" markdown, never parses
//    it), so we emit no checkbox markers — paste it, select all, tap Notes' checklist button
//    and every line becomes a tidy (nested) checkbox with no literal cruft. Ticked items get
//    a trailing ✓ since a pasted list can't arrive pre-checked.
//  - shoppingListToHtml: styled HTML for a "copy rich → paste into a new email" flow (mailto
//    bodies are plain-text only), with ticked items struck through. Also pastes into Notes as
//    a formatted list.

interface OutItem {
  text: string
  checked: boolean
}
interface OutGroup {
  aisle: string
  items: OutItem[]
}

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

/** Normalise a list + tick state + extras into aisle groups with per-item ticked flags. */
function toGroups(
  list: ShoppingList,
  checked: ReadonlySet<string>,
  extras: readonly ExtraItem[],
): OutGroup[] {
  const groups: OutGroup[] = list.aisles
    .filter((a) => a.lines.length)
    .map((a) => ({
      aisle: a.aisle,
      items: a.lines.map((l) => ({ text: itemText(l), checked: checked.has(l.key) })),
    }))
  if (list.unmatched.length) {
    groups.push({
      aisle: 'Other',
      items: list.unmatched.map((l) => ({ text: itemText(l), checked: checked.has(l.key) })),
    })
  }
  if (extras.length) {
    groups.push({ aisle: 'Extras', items: extras.map((e) => ({ text: cap(e.text), checked: e.checked })) })
  }
  return groups
}

/**
 * Plain-text checklist for pasting into a notes app or an email body. Aisle on its own line,
 * items tab-indented beneath; ticked items marked with a trailing ✓. No "- [ ]" markers, so
 * Apple Notes' "select all → checklist" turns it into clean checkboxes.
 */
export function shoppingListToText(
  list: ShoppingList,
  checked: ReadonlySet<string>,
  extras: readonly ExtraItem[] = [],
  opts: { title?: string } = {},
): string {
  const out: string[] = [opts.title ?? 'Shopping list', '']
  for (const g of toGroups(list, checked, extras)) {
    out.push(g.aisle)
    for (const it of g.items) out.push(`\t${it.text}${it.checked ? ' ✓' : ''}`)
  }
  return out.join('\n')
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Styled HTML rendering — bold title, bold aisle headers, bulleted items, ticked items
 * struck through and muted. For copying as rich text into a new email (or Notes).
 */
export function shoppingListToHtml(
  list: ShoppingList,
  checked: ReadonlySet<string>,
  extras: readonly ExtraItem[] = [],
  opts: { title?: string } = {},
): string {
  const font = 'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif'
  const parts: string[] = [
    `<div style="${font};font-size:14px;line-height:1.5">`,
    `<div style="font-size:18px;font-weight:600;margin-bottom:8px">${esc(opts.title ?? 'Shopping list')}</div>`,
  ]
  for (const g of toGroups(list, checked, extras)) {
    parts.push(`<div style="font-weight:600;margin-top:10px">${esc(g.aisle)}</div>`)
    parts.push('<ul style="margin:2px 0 0;padding-left:22px">')
    for (const it of g.items) {
      const style = it.checked ? 'color:#a8a29e;text-decoration:line-through' : ''
      parts.push(`<li style="${style}">${esc(it.text)}</li>`)
    }
    parts.push('</ul>')
  }
  parts.push('</div>')
  return parts.join('')
}
