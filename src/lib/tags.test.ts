import { describe, expect, it } from 'vitest'
import { applyRelabel, distinctLabels, labelUsage } from './tags'
import { makeRecipe } from '../../test/factories'

describe('applyRelabel', () => {
  const keys = (...vals: string[]) => new Set(vals.map((v) => v.toLowerCase()))

  it('renames a label, matching case-insensitively', () => {
    expect(applyRelabel(['Speedy', 'vegetarian'], keys('speedy'), 'quick')).toEqual([
      'quick',
      'vegetarian',
    ])
  })

  it('merges several spellings, collapsing into an existing label', () => {
    expect(applyRelabel(['veggie', 'vegetarian', 'egg'], keys('veggie', 'vegetarian'), 'vegetarian')).toEqual(
      ['vegetarian', 'egg'],
    )
  })

  it('deletes matched labels when `to` is empty', () => {
    expect(applyRelabel(['gluten', 'egg'], keys('egg'), '')).toEqual(['gluten'])
  })

  it('is a no-op when nothing matches', () => {
    expect(applyRelabel(['gluten'], keys('egg'), 'dairy')).toEqual(['gluten'])
  })
})

const recipes = [
  makeRecipe({ id: 'r1', tags: ['speedy', 'Vegetarian'], allergens: ['gluten'] }),
  makeRecipe({ id: 'r2', tags: ['vegetarian', ' speedy '], allergens: ['egg', 'gluten'] }),
  makeRecipe({ id: 'r3', tags: [], allergens: [] }),
]

describe('distinctLabels', () => {
  it('folds case-insensitively (first spelling wins) and sorts alphabetically', () => {
    expect(distinctLabels(recipes, 'tags')).toEqual(['speedy', 'Vegetarian'])
    expect(distinctLabels(recipes, 'allergens')).toEqual(['egg', 'gluten'])
  })
})

describe('labelUsage', () => {
  it('counts each recipe once per label, folded case-insensitively', () => {
    expect(labelUsage(recipes, 'tags')).toEqual([
      { value: 'speedy', count: 2 },
      { value: 'Vegetarian', count: 2 },
    ])
    expect(labelUsage(recipes, 'allergens')).toEqual([
      { value: 'egg', count: 1 },
      { value: 'gluten', count: 2 },
    ])
  })
})
