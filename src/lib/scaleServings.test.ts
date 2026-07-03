import { describe, expect, it } from 'vitest'
import { formatScaledQty, scaledIngredientLabel, servingFactor } from './scaleServings'
import type { Ingredient } from '../schema/recipe'

const ing = (over: Partial<Ingredient>): Ingredient => ({
  rawLabel: '320g chicken thighs',
  name: 'chicken thighs',
  qty: 320,
  unit: 'g',
  ...over,
})

describe('servingFactor', () => {
  it('is the ratio of chosen to base', () => {
    expect(servingFactor(4, 2)).toBe(2)
    expect(servingFactor(2, 2)).toBe(1)
    expect(servingFactor(6, 4)).toBe(1.5)
  })
  it('guards a zero base', () => {
    expect(servingFactor(4, 0)).toBe(1)
  })
})

describe('formatScaledQty', () => {
  it('keeps whole numbers whole and rounds the rest to 1dp', () => {
    expect(formatScaledQty(320)).toBe('320')
    expect(formatScaledQty(1.5)).toBe('1.5')
    expect(formatScaledQty(0.3333333)).toBe('0.3')
    expect(formatScaledQty(159.999999)).toBe('160')
  })
})

describe('scaledIngredientLabel', () => {
  it('keeps the original label at factor 1', () => {
    expect(scaledIngredientLabel(ing({}), 1)).toBe('320g chicken thighs')
  })
  it('rebuilds from parsed parts when scaled', () => {
    expect(scaledIngredientLabel(ing({}), 2)).toBe('640 g chicken thighs')
    expect(scaledIngredientLabel(ing({}), 0.5)).toBe('160 g chicken thighs')
  })
  it('handles a unitless count', () => {
    expect(scaledIngredientLabel(ing({ rawLabel: '2 limes', name: 'limes', qty: 2, unit: undefined }), 2)).toBe(
      '4 limes',
    )
  })
  it('leaves an unparsed line (no qty) verbatim even when scaled', () => {
    expect(
      scaledIngredientLabel(ing({ rawLabel: 'salt, to taste', name: 'salt', qty: undefined, unit: undefined }), 2),
    ).toBe('salt, to taste')
  })
})
