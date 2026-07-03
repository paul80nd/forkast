import { describe, it, expect } from 'vitest'
import { shoppingListToText, shoppingListToHtml } from './shoppingExport'
import type { ShoppingList } from './shopping'

const list: ShoppingList = {
  aisles: [
    { aisle: 'Produce', lines: [{ key: 'onion|each', label: 'spring onions · × 2', aisle: 'Produce' }] },
    {
      aisle: 'Pantry',
      lines: [
        { key: 'chilli|g', label: 'dried chilli flakes · 11 g', detail: '1 tsp', aisle: 'Pantry' },
        { key: 'allspice|g', label: 'ground allspice · 2.3 g', detail: '1 tsp', aisle: 'Pantry' },
      ],
    },
  ],
  unmatched: [
    { key: 'x|fresh basil|each', label: 'fresh basil · × 1', aisle: 'Other', bindName: 'fresh basil' },
  ],
  unquantified: [],
  basics: [],
  mealCount: 2,
}

describe('shoppingListToText', () => {
  it('renders clean tab-indented lines (no checkbox markers) with compacted amounts + conversions', () => {
    const text = shoppingListToText(list, new Set(), [], { title: 'Shopping list' })
    expect(text).toBe(
      [
        'Shopping list',
        '',
        'Produce',
        '\tSpring onions x2',
        'Pantry',
        '\tDried chilli flakes 11g (1 tsp)',
        '\tGround allspice 2.3g (1 tsp)',
        'Other',
        '\tFresh basil x1',
      ].join('\n'),
    )
  })

  it('marks ticked items with a trailing ✓', () => {
    const text = shoppingListToText(list, new Set(['chilli|g']), [])
    expect(text).toContain('\tDried chilli flakes 11g (1 tsp) ✓')
    expect(text).toContain('\tGround allspice 2.3g (1 tsp)')
    expect(text).not.toContain('Ground allspice 2.3g (1 tsp) ✓')
  })

  it('appends manual extras as their own group', () => {
    const text = shoppingListToText(list, new Set(), [
      { text: 'foil', checked: false },
      { text: 'bin bags', checked: true },
    ])
    expect(text).toContain('Extras')
    expect(text).toContain('\tFoil')
    expect(text).toContain('\tBin bags ✓')
  })
})

describe('shoppingListToHtml', () => {
  it('renders bold aisle headers, bulleted items, and strikes ticked ones', () => {
    const html = shoppingListToHtml(list, new Set(['chilli|g']), [], { title: 'Shopping list' })
    expect(html).toContain('>Produce<')
    expect(html).toContain('<li style="">Spring onions x2</li>')
    expect(html).toContain('line-through">Dried chilli flakes 11g (1 tsp)</li>')
  })

  it('escapes HTML in item names', () => {
    const dodgy: ShoppingList = {
      ...list,
      aisles: [{ aisle: 'Other', lines: [{ key: 'k', label: 'a & b <x> · × 1', aisle: 'Other' }] }],
      unmatched: [],
    }
    const html = shoppingListToHtml(dodgy, new Set(), [])
    expect(html).toContain('A &amp; b &lt;x&gt; x1')
  })
})
