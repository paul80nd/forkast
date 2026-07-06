import { describe, it, expect } from 'vitest'
import { defaultPurchaseUnit } from './units'

describe('defaultPurchaseUnit', () => {
  it('keeps a recipe unit that is directly purchasable', () => {
    expect(defaultPurchaseUnit('g')).toBe('g')
    expect(defaultPurchaseUnit('kg')).toBe('kg')
    expect(defaultPurchaseUnit('ml')).toBe('ml')
    expect(defaultPurchaseUnit('l')).toBe('l')
    expect(defaultPurchaseUnit('each')).toBe('each')
  })

  it('maps a non-purchasable unit to its dimension base', () => {
    expect(defaultPurchaseUnit('tbsp')).toBe('ml') // volume
    expect(defaultPurchaseUnit('tsp')).toBe('ml')
  })

  it('defaults a missing/unknown unit to a count', () => {
    expect(defaultPurchaseUnit(undefined)).toBe('each')
    expect(defaultPurchaseUnit('bunch')).toBe('each')
  })
})
