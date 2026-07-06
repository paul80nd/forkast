import { describe, expect, it } from 'vitest'
import { distinctLabels, labelUsage } from './tags'
import { makeRecipe } from '../../test/factories'

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
