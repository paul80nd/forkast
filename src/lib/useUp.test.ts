import { describe, it, expect } from 'vitest'
import {
  namesMatch,
  lineMatchesItem,
  recipeUsesItem,
  coverageFor,
  planCoverage,
  rankUseUpRecipes,
} from './useUp'
import { makeRecipe } from '../../test/factories'
import type { Ingredient } from '../schema/recipe'
import type { UseUpItem } from '../schema/userData'

const line = (name: string, over: Partial<Ingredient> = {}): Ingredient => ({
  rawLabel: name,
  name,
  ...over,
})

const noBindings = new Map<string, string>()

describe('namesMatch', () => {
  it('matches on a token subset (either direction)', () => {
    expect(namesMatch('chicken', 'chicken thighs')).toBe(true)
    expect(namesMatch('spring onions', 'onion')).toBe(true) // singularised
    expect(namesMatch('cherry tomatoes', 'tomato')).toBe(true)
  })

  it('does not match on a mere character substring', () => {
    expect(namesMatch('pea', 'peach')).toBe(false)
    expect(namesMatch('cod', 'cider')).toBe(false)
  })

  it('does not match unrelated names', () => {
    expect(namesMatch('spinach', 'chorizo')).toBe(false)
  })
})

describe('lineMatchesItem', () => {
  it('matches an unbound line by name', () => {
    const l = line('baby spinach')
    expect(lineMatchesItem(l, { name: 'spinach' }, noBindings)).toBe(true)
  })

  it('matches by canonical id when the line is bound', () => {
    const l = line('leafy greens', { ingredientId: 'spinach' })
    expect(lineMatchesItem(l, { name: 'spinach', ingredientId: 'spinach' }, noBindings)).toBe(true)
  })

  it('matches via an existing name→id binding', () => {
    const bindings = new Map([['leafy greens', 'spinach']])
    const l = line('leafy greens') // name alone would not match "spinach"
    expect(lineMatchesItem(l, { name: 'spinach', ingredientId: 'spinach' }, bindings)).toBe(true)
    expect(lineMatchesItem(l, { name: 'spinach', ingredientId: 'spinach' }, noBindings)).toBe(false)
  })
})

describe('coverageFor / recipeUsesItem', () => {
  const items: UseUpItem[] = [{ name: 'spinach' }, { name: 'feta' }, { name: 'harissa' }]
  const recipe = makeRecipe({
    id: 'greek',
    ingredients: [line('baby spinach'), line('feta cheese'), line('olive oil')],
  })

  it('reports the covered subset', () => {
    const covered = coverageFor(recipe, items, noBindings).map((i) => i.name)
    expect(covered.sort()).toEqual(['feta', 'spinach'])
  })

  it('recipeUsesItem is true only for covered items', () => {
    expect(recipeUsesItem(recipe, { name: 'spinach' }, noBindings)).toBe(true)
    expect(recipeUsesItem(recipe, { name: 'harissa' }, noBindings)).toBe(false)
  })
})

describe('planCoverage', () => {
  it('flags an item used by a planned recipe, leaving the rest unused', () => {
    const planned = [makeRecipe({ id: 'p', ingredients: [line('feta cheese')] })]
    const status = planCoverage([{ name: 'feta' }, { name: 'spinach' }], planned, noBindings)
    expect(status).toEqual([
      { item: { name: 'feta' }, usedByPlan: true },
      { item: { name: 'spinach' }, usedByPlan: false },
    ])
  })
})

describe('rankUseUpRecipes', () => {
  const items: UseUpItem[] = [{ name: 'spinach' }, { name: 'harissa' }]
  const twoHit = makeRecipe({
    id: 'both',
    title: 'Harissa spinach stew',
    ingredients: [line('spinach'), line('harissa paste')],
  })
  const oneHit = makeRecipe({
    id: 'one',
    title: 'Spinach dal',
    ingredients: [line('spinach'), line('lentils')],
  })
  const noHit = makeRecipe({ id: 'none', ingredients: [line('beef mince')] })
  const stars = new Map([['one', 5]]) // 'both' unrated

  it('ranks by coverage first, then stars, and drops zero-coverage recipes', () => {
    const ranked = rankUseUpRecipes([oneHit, noHit, twoHit], items, {
      bindings: noBindings,
      starsById: stars,
    })
    expect(ranked.map((m) => m.recipe.id)).toEqual(['both', 'one'])
    expect(ranked[0].matched).toHaveLength(2)
  })

  it('breaks a coverage tie by ★ (favourites first)', () => {
    const rated = makeRecipe({ id: 'rated', title: 'A', ingredients: [line('spinach')] })
    const unrated = makeRecipe({ id: 'unrated', title: 'B', ingredients: [line('spinach')] })
    const ranked = rankUseUpRecipes([unrated, rated], items, {
      bindings: noBindings,
      starsById: new Map([['rated', 4]]),
    })
    expect(ranked.map((m) => m.recipe.id)).toEqual(['rated', 'unrated'])
  })

  it('excludes already-planned ids and no-go allergens', () => {
    const fishy = makeRecipe({
      id: 'fishy',
      ingredients: [line('spinach')],
      allergens: ['fish'],
    })
    const ranked = rankUseUpRecipes([oneHit, twoHit, fishy], items, {
      bindings: noBindings,
      starsById: stars,
      excludeIds: new Set(['both']),
      noGoAllergens: ['fish'],
    })
    expect(ranked.map((m) => m.recipe.id)).toEqual(['one'])
  })

  it('returns nothing for an empty list', () => {
    expect(rankUseUpRecipes([twoHit], [], { bindings: noBindings, starsById: stars })).toEqual([])
  })
})
