import { describe, it, expect } from 'vitest'
import { parseQuantity } from './parseIngredient'

describe('parseQuantity', () => {
  it('reads a trailing parenthetical measure', () => {
    expect(parseQuantity('Diced chicken breast (250g)')).toEqual({ qty: 250, unit: 'g', kind: 'measured' })
    expect(parseQuantity('Coriander (5g)')).toEqual({ qty: 5, unit: 'g', kind: 'measured' })
    expect(parseQuantity('Soy sauce (8ml)')).toEqual({ qty: 8, unit: 'ml', kind: 'measured' })
    expect(parseQuantity('Ground cumin (2tsp)')).toEqual({ qty: 2, unit: 'tsp', kind: 'measured' })
  })

  it('reads a leading measure', () => {
    expect(parseQuantity('250g British diced chicken breast')).toEqual({ qty: 250, unit: 'g', kind: 'measured' })
    expect(parseQuantity('30ml rice vinegar')).toEqual({ qty: 30, unit: 'ml', kind: 'measured' })
    expect(parseQuantity('1 tbsp ras el hanout')).toEqual({ qty: 1, unit: 'tbsp', kind: 'measured' })
  })

  it('accepts decimal quantities', () => {
    expect(parseQuantity('Dried thyme (0.5tsp)')).toEqual({ qty: 0.5, unit: 'tsp', kind: 'measured' })
    expect(parseQuantity('Beef stock mix (5.5g)')).toEqual({ qty: 5.5, unit: 'g', kind: 'measured' })
  })

  it('maps "pcs" onto a count, kept as a measured per-pack amount', () => {
    expect(parseQuantity('Wholemeal pittas (2pcs)')).toEqual({ qty: 2, unit: 'each', kind: 'measured' })
    expect(parseQuantity('Egg noodle nests (2pcs)')).toEqual({ qty: 2, unit: 'each', kind: 'measured' })
  })

  it('treats a leading number with no unit as a stated count', () => {
    expect(parseQuantity('2 spring onions')).toEqual({ qty: 2, unit: 'each', kind: 'count' })
    expect(parseQuantity('1 little gem lettuce')).toEqual({ qty: 1, unit: 'each', kind: 'count' })
    expect(parseQuantity('4 white potatoes')).toEqual({ qty: 4, unit: 'each', kind: 'count' })
  })

  it('defaults a name-only label to a single implied count', () => {
    expect(parseQuantity('Shallot')).toEqual({ qty: 1, unit: 'each', kind: 'implied' })
    expect(parseQuantity('Red chilli')).toEqual({ qty: 1, unit: 'each', kind: 'implied' })
    expect(parseQuantity('Green pepper')).toEqual({ qty: 1, unit: 'each', kind: 'implied' })
  })

  it('ignores the trailing fulfilment marker', () => {
    expect(parseQuantity('Soy sauce (8ml) x0')).toEqual({ qty: 8, unit: 'ml', kind: 'measured' })
    expect(parseQuantity('Maple syrup (15g) x2')).toEqual({ qty: 15, unit: 'g', kind: 'measured' })
    expect(parseQuantity('Carrot x2')).toEqual({ qty: 1, unit: 'each', kind: 'implied' })
  })

  it('does not latch onto a number embedded in the name', () => {
    expect(parseQuantity('Chinese 5 spice (10g)')).toEqual({ qty: 10, unit: 'g', kind: 'measured' })
  })

  it('handles a missing label', () => {
    expect(parseQuantity('')).toEqual({})
  })
})
