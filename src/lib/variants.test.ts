import { describe, it, expect } from 'vitest'
import {
  collapseVariants,
  resolveDishes,
  dishSizeByRecipe,
  variantCounts,
  variantLabel,
  ingredientDelta,
} from './variants'
import type { Recipe } from '../schema/recipe'
import type { VariantOverride } from '../schema/userData'

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

describe('resolveDishes (with user overrides)', () => {
  const override = (id: string, recipeIds: string[], leadId: string): VariantOverride => ({
    id,
    recipeIds,
    leadId,
  })

  it('with no overrides matches the import-seeded grouping', () => {
    const list = [
      recipe({ id: 'white', variantGroupKey: 'k', variantGroupLead: true }),
      recipe({ id: 'brown', variantGroupKey: 'k' }),
    ]
    expect(resolveDishes(list, [])).toEqual(collapseVariants(list))
  })

  it('merges recipes from different import keys into one overridden dish', () => {
    const list = [
      recipe({ id: 'a', variantGroupKey: 'k1', variantGroupLead: true }),
      recipe({ id: 'b', variantGroupKey: 'k2', variantGroupLead: true }),
    ]
    const dishes = resolveDishes(list, [override('o1', ['a', 'b'], 'b')])
    expect(dishes).toHaveLength(1)
    expect(dishes[0].lead.id).toBe('b')
    expect(dishes[0].variants.map((v) => v.id)).toEqual(['b', 'a'])
  })

  it('re-leads an import group via an override without changing members', () => {
    const list = [
      recipe({ id: 'white', variantGroupKey: 'k', variantGroupLead: true }),
      recipe({ id: 'brown', variantGroupKey: 'k' }),
    ]
    const dishes = resolveDishes(list, [override('o1', ['white', 'brown'], 'brown')])
    expect(dishes).toHaveLength(1)
    expect(dishes[0].lead.id).toBe('brown')
  })

  it('detaches a recipe with a single-member override, leaving the rest grouped', () => {
    const list = [
      recipe({ id: 'white', variantGroupKey: 'k', variantGroupLead: true }),
      recipe({ id: 'brown', variantGroupKey: 'k' }),
      recipe({ id: 'cauli', variantGroupKey: 'k' }),
    ]
    const dishes = resolveDishes(list, [override('o1', ['cauli'], 'cauli')])
    // cauli stands alone; white+brown remain a dish led by the flagged lead.
    const standalone = dishes.find((d) => d.lead.id === 'cauli')
    const rest = dishes.find((d) => d.lead.id === 'white')
    expect(standalone?.variants.map((v) => v.id)).toEqual(['cauli'])
    expect(rest?.variants.map((v) => v.id)).toEqual(['white', 'brown'])
  })

  it('ignores override members that are not in the recipe list', () => {
    const list = [recipe({ id: 'a', variantGroupKey: 'k', variantGroupLead: true })]
    const dishes = resolveDishes(list, [override('o1', ['a', 'ghost'], 'a')])
    expect(dishes[0].variants.map((v) => v.id)).toEqual(['a'])
  })
})

describe('dishSizeByRecipe', () => {
  it('maps every recipe id to its dish size', () => {
    const list = [
      recipe({ id: 'white', variantGroupKey: 'k', variantGroupLead: true }),
      recipe({ id: 'brown', variantGroupKey: 'k' }),
      recipe({ id: 'solo' }),
    ]
    const sizes = dishSizeByRecipe(collapseVariants(list))
    expect(sizes.get('white')).toBe(2)
    expect(sizes.get('brown')).toBe(2)
    expect(sizes.get('solo')).toBe(1)
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
