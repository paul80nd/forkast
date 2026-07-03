import { describe, it, expect } from 'vitest'
import { shoppingListToText } from './shoppingExport'
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
  it('groups by aisle with indented items, compacting amounts and keeping conversions', () => {
    const text = shoppingListToText(list, new Set(), [], { title: 'Shopping list' })
    expect(text).toBe(
      [
        'Shopping list',
        '',
        '- [ ] Produce',
        '    - [ ] Spring onions x2',
        '- [ ] Pantry',
        '    - [ ] Dried chilli flakes 11g (1 tsp)',
        '    - [ ] Ground allspice 2.3g (1 tsp)',
        '- [ ] Other',
        '    - [ ] Fresh basil x1',
      ].join('\n'),
    )
  })

  it('ticks items that are checked, and the aisle when all of its items are', () => {
    const text = shoppingListToText(list, new Set(['chilli|g', 'allspice|g']), [])
    expect(text).toContain('- [x] Pantry')
    expect(text).toContain('    - [x] Dried chilli flakes 11g (1 tsp)')
    // Produce isn't fully ticked, so its header stays unticked.
    expect(text).toContain('- [ ] Produce')
  })

  it('appends manual extras as their own group', () => {
    const text = shoppingListToText(list, new Set(), [
      { text: 'foil', checked: false },
      { text: 'bin bags', checked: true },
    ])
    expect(text).toContain('- [ ] Extras')
    expect(text).toContain('    - [ ] Foil')
    expect(text).toContain('    - [x] Bin bags')
  })
})
