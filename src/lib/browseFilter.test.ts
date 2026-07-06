import { describe, expect, it } from 'vitest'
import {
  EMPTY_BROWSE_FILTER,
  browseCards,
  deepLinkFilter,
  filterRecipes,
  matchesRating,
  sortRecipes,
  type BrowseFilter,
} from './browseFilter'
import { makeRecipe } from '../../test/factories'
import type { Stars } from '../schema/userData'

const f = (over: Partial<BrowseFilter> = {}): BrowseFilter => ({ ...EMPTY_BROWSE_FILTER, ...over })
const ids = (list: { id: string }[]) => list.map((r) => r.id)

// A small catalogue with distinct cuisines, tags, allergens, times and titles.
const r1 = makeRecipe({
  id: 'r1',
  title: 'Chicken Curry',
  cuisine: 'Indian',
  tags: ['speedy', 'vegetarian'],
  allergens: ['gluten'],
  prepTime: 20,
  ingredients: [{ rawLabel: 'chicken', name: 'chicken' }],
})
const r2 = makeRecipe({
  id: 'r2',
  title: 'Veg Soup',
  cuisine: 'Italian',
  tags: ['vegetarian'],
  allergens: ['celery'],
  prepTime: 40,
  ingredients: [{ rawLabel: 'carrot', name: 'carrot' }],
})
const r3 = makeRecipe({
  id: 'r3',
  title: 'Beef Stew',
  cuisine: 'Indian',
  tags: [],
  allergens: [],
  prepTime: 60,
  ingredients: [{ rawLabel: 'beef', name: 'beef' }],
})
const recipes = [r1, r2, r3]
const stars = new Map<string, Stars>([
  ['r1', 5],
  ['r2', 3],
])

describe('matchesRating', () => {
  it('covers every rating band', () => {
    expect(matchesRating(undefined, 'all')).toBe(true)
    expect(matchesRating(undefined, 'unrated')).toBe(true)
    expect(matchesRating(3, 'unrated')).toBe(false)
    expect(matchesRating(5, '5')).toBe(true)
    expect(matchesRating(4, '5')).toBe(false)
    expect(matchesRating(4, '4plus')).toBe(true)
    expect(matchesRating(3, '4plus')).toBe(false)
    expect(matchesRating(3, '3plus')).toBe(true)
    expect(matchesRating(undefined, '3plus')).toBe(false)
  })
})

describe('filterRecipes', () => {
  it('matches the query against title, description and ingredient names', () => {
    expect(ids(filterRecipes(recipes, f({ query: 'chicken' }), stars))).toEqual(['r1'])
    expect(ids(filterRecipes(recipes, f({ query: 'carrot' }), stars))).toEqual(['r2'])
    expect(ids(filterRecipes(recipes, f({ query: 'stew' }), stars))).toEqual(['r3'])
  })

  it('filters by cuisine', () => {
    expect(ids(filterRecipes(recipes, f({ cuisine: 'Indian' }), stars))).toEqual(['r1', 'r3'])
  })

  it('requires all selected tags (AND)', () => {
    expect(ids(filterRecipes(recipes, f({ tags: ['vegetarian'] }), stars))).toEqual(['r1', 'r2'])
    expect(ids(filterRecipes(recipes, f({ tags: ['speedy', 'vegetarian'] }), stars))).toEqual(['r1'])
  })

  it('avoids or shows allergens by mode', () => {
    expect(ids(filterRecipes(recipes, f({ allergens: ['gluten'], allergenMode: 'avoid' }), stars))).toEqual([
      'r2',
      'r3',
    ])
    expect(ids(filterRecipes(recipes, f({ allergens: ['gluten'], allergenMode: 'only' }), stars))).toEqual([
      'r1',
    ])
  })

  it('filters by max time and rating', () => {
    expect(ids(filterRecipes(recipes, f({ maxTime: 30 }), stars))).toEqual(['r1'])
    expect(ids(filterRecipes(recipes, f({ rating: '4plus' }), stars))).toEqual(['r1'])
    expect(ids(filterRecipes(recipes, f({ rating: 'unrated' }), stars))).toEqual(['r3'])
  })

  it('combines filters (all must hold)', () => {
    expect(
      ids(filterRecipes(recipes, f({ cuisine: 'Indian', tags: ['vegetarian'] }), stars)),
    ).toEqual(['r1'])
  })

  it('returns everything under the empty filter', () => {
    expect(ids(filterRecipes(recipes, f(), stars))).toEqual(['r1', 'r2', 'r3'])
  })
})

describe('sortRecipes', () => {
  it('sorts by name, time, and rating (unrated last)', () => {
    expect(ids(sortRecipes(recipes, 'name', stars))).toEqual(['r3', 'r1', 'r2'])
    expect(ids(sortRecipes(recipes, 'time', stars))).toEqual(['r1', 'r2', 'r3'])
    expect(ids(sortRecipes(recipes, 'rating', stars))).toEqual(['r1', 'r2', 'r3'])
  })
})

describe('browseCards', () => {
  // A dish (d1 lead + d2) sharing an import key, plus a standalone.
  const d1 = makeRecipe({ id: 'd1', title: 'Aaa', variantGroupKey: 'k', variantGroupLead: true })
  const d2 = makeRecipe({ id: 'd2', title: 'Bbb', variantGroupKey: 'k', tags: ['swap'] })
  const s1 = makeRecipe({ id: 's1', title: 'Zzz' })
  const cat = [d1, d2, s1]
  const noStars = new Map<string, Stars>()

  it('collapses each dish to its lead when grouping', () => {
    const cards = browseCards(cat, [], f(), { groupVariants: true, sort: 'name' }, noStars)
    expect(ids(cards)).toEqual(['d1', 's1'])
  })

  it('keeps every variant when not grouping', () => {
    const cards = browseCards(cat, [], f(), { groupVariants: false, sort: 'name' }, noStars)
    expect(ids(cards)).toEqual(['d1', 'd2', 's1'])
  })

  it('surfaces a dish when only a non-lead variant matches the filter', () => {
    const cards = browseCards(cat, [], f({ tags: ['swap'] }), { groupVariants: true, sort: 'name' }, noStars)
    expect(ids(cards)).toEqual(['d2'])
  })
})

describe('deepLinkFilter', () => {
  it('focuses a tag', () => {
    expect(deepLinkFilter('vegetarian', null)).toEqual({ ...EMPTY_BROWSE_FILTER, tags: ['vegetarian'] })
  })

  it('focuses an allergen in "only" mode', () => {
    expect(deepLinkFilter(null, 'gluten')).toEqual({
      ...EMPTY_BROWSE_FILTER,
      allergens: ['gluten'],
      allergenMode: 'only',
    })
  })

  it('prefers a tag when both are present, and is null when neither is', () => {
    expect(deepLinkFilter('t', 'a')?.tags).toEqual(['t'])
    expect(deepLinkFilter(null, null)).toBeNull()
  })
})
