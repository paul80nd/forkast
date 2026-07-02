import { describe, it, expect } from 'vitest'
import { collapseVariants, variantCounts, variantLabel, ingredientDelta } from './variants'
import type { Recipe } from '../schema/recipe'

function recipe(over: Partial<Recipe> & { id: string }): Recipe {
  return {
    slug: over.id,
    title: over.id,
    description: '',
    image: '',
    cuisine: 'Other',
    tags: [],
    allergens: [],
    prepTime: 20,
    ingredients: [],
    basics: [],
    instructions: [],
    serves: 2,
    ...over,
  }
}

function ing(name: string): Recipe['ingredients'][number] {
  return { rawLabel: name, name }
}

describe('collapseVariants', () => {
  it('treats keyless recipes as standalone dishes, preserving order', () => {
    const list = [recipe({ id: 'a' }), recipe({ id: 'b' }), recipe({ id: 'c' })]
    const dishes = collapseVariants(list)
    expect(dishes.map((d) => d.lead.id)).toEqual(['a', 'b', 'c'])
    expect(dishes.every((d) => d.variants.length === 1)).toBe(true)
  })

  it('folds a shared key into one dish led by the flagged lead', () => {
    const list = [
      recipe({ id: 'brown', variantGroupKey: 'k' }),
      recipe({ id: 'white', variantGroupKey: 'k', variantGroupLead: true }),
      recipe({ id: 'cauli', variantGroupKey: 'k' }),
    ]
    const dishes = collapseVariants(list)
    expect(dishes).toHaveLength(1)
    expect(dishes[0].lead.id).toBe('white')
    // Lead first, remaining members in input order.
    expect(dishes[0].variants.map((v) => v.id)).toEqual(['white', 'brown', 'cauli'])
  })

  it('falls back to the first member when the lead is absent from the input', () => {
    const list = [
      recipe({ id: 'brown', variantGroupKey: 'k' }),
      recipe({ id: 'cauli', variantGroupKey: 'k' }),
    ]
    const dishes = collapseVariants(list)
    expect(dishes[0].lead.id).toBe('brown')
    expect(dishes[0].variants.map((v) => v.id)).toEqual(['brown', 'cauli'])
  })

  it('keeps each dish at its first appearance among standalone recipes', () => {
    const list = [
      recipe({ id: 'x' }),
      recipe({ id: 'brown', variantGroupKey: 'k' }),
      recipe({ id: 'y' }),
      recipe({ id: 'white', variantGroupKey: 'k', variantGroupLead: true }),
    ]
    const dishes = collapseVariants(list)
    expect(dishes.map((d) => d.lead.id)).toEqual(['x', 'white', 'y'])
  })
})

describe('variantLabel', () => {
  it('returns the words the variant adds over the lead (the swap)', () => {
    expect(variantLabel('Chicken Tikka Masala With Brown Rice', 'Chicken Tikka Masala With Rice'))
      .toBe('Brown')
    expect(variantLabel('Cheesy Black Bean Enchiladas & A Chicken Breast', 'Cheesy Black Bean Enchiladas'))
      .toBe('Chicken Breast')
  })

  it('falls back to the full title when nothing distinguishes it', () => {
    expect(variantLabel('Chicken Tikka Masala With Rice', 'Chicken Tikka Masala With Rice'))
      .toBe('Chicken Tikka Masala With Rice')
  })
})

describe('ingredientDelta', () => {
  it('reports names added and removed between two recipes', () => {
    const lead = recipe({ id: 'lead', ingredients: [ing('white rice'), ing('chicken')] })
    const variant = recipe({ id: 'v', ingredients: [ing('brown rice'), ing('chicken')] })
    expect(ingredientDelta(lead, variant)).toEqual({ added: ['brown rice'], removed: ['white rice'] })
  })

  it('is empty when the ingredient names match', () => {
    const a = recipe({ id: 'a', ingredients: [ing('chicken')] })
    const b = recipe({ id: 'b', ingredients: [ing('Chicken')] })
    expect(ingredientDelta(a, b)).toEqual({ added: [], removed: [] })
  })
})

describe('variantCounts', () => {
  it('counts members per key and ignores keyless recipes', () => {
    const counts = variantCounts([
      recipe({ id: 'a' }),
      recipe({ id: 'b', variantGroupKey: 'k' }),
      recipe({ id: 'c', variantGroupKey: 'k' }),
      recipe({ id: 'd', variantGroupKey: 'j' }),
    ])
    expect(counts.get('k')).toBe(2)
    expect(counts.get('j')).toBe(1)
    expect(counts.size).toBe(2)
  })
})
