import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RELATED_CONFIG,
  rankDifferent,
  rankSimilar,
  recipeSimilarity,
  toFeatures,
  type RelatedCandidate,
  type RelatedFeatures,
} from './relatedRecipes'
import { makeRecipe } from '../../test/factories'

// A features object with sensible, populated defaults; override per test.
function feat(over: Partial<RelatedFeatures> & { id: string }): RelatedFeatures {
  return {
    ingredients: new Set(['chicken', 'rice']),
    tags: new Set(['speedy']),
    cuisine: 'thai',
    mainProtein: 'chicken',
    band: 'quick',
    ...over,
  }
}

const cand = (f: RelatedFeatures, stars?: number): RelatedCandidate => ({ features: f, stars })

describe('toFeatures', () => {
  it('projects a recipe to its comparable feature sets', () => {
    const f = toFeatures(
      makeRecipe({
        id: 'r1',
        cuisine: 'Thai',
        tags: ['Speedy', 'Vegetarian'],
        prepTime: 20,
        mainProtein: 'Chicken',
        ingredients: [
          { rawLabel: '2 chicken thighs', name: 'chicken thighs' },
          { rawLabel: '1 cup rice', name: 'rice' },
        ],
      }),
    )
    expect(f.cuisine).toBe('thai')
    expect(f.mainProtein).toBe('chicken')
    expect(f.band).toBe('quick') // 20 ≤ 25
    expect(f.tags.has('speedy')).toBe(true)
    expect([...f.ingredients].some((k) => k.includes('rice'))).toBe(true)
  })
})

describe('recipeSimilarity', () => {
  it('is 1 for identical features and 0 for wholly disjoint ones', () => {
    const a = feat({ id: 'a' })
    expect(recipeSimilarity(a, feat({ id: 'b' }))).toBeCloseTo(1)
    const far = feat({
      id: 'c',
      ingredients: new Set(['beef', 'pasta']),
      tags: new Set(['slow']),
      cuisine: 'italian',
      mainProtein: 'beef',
      band: 'long',
    })
    expect(recipeSimilarity(a, far)).toBe(0)
  })

  it('lets shared ingredients dominate over a shared cuisine alone', () => {
    const anchor = feat({ id: 'anchor' })
    // Same ingredients, everything else different.
    const sameIngredients = feat({
      id: 'ing',
      cuisine: 'italian',
      mainProtein: 'beef',
      band: 'long',
      tags: new Set(['slow']),
    })
    // Same cuisine only, different ingredients/protein/band/tags.
    const sameCuisine = feat({
      id: 'cui',
      ingredients: new Set(['beef', 'pasta']),
      mainProtein: 'beef',
      band: 'long',
      tags: new Set(['slow']),
    })
    expect(recipeSimilarity(anchor, sameIngredients)).toBeGreaterThan(
      recipeSimilarity(anchor, sameCuisine),
    )
  })

  it('renormalises over present axes when protein/nutrition are absent', () => {
    // Neither carries protein or nutrition; identical on the axes they do have ⇒ still 1.
    const a = feat({ id: 'a', mainProtein: undefined })
    const b = feat({ id: 'b', mainProtein: undefined })
    expect(recipeSimilarity(a, b)).toBeCloseTo(1)
  })
})

describe('rankSimilar', () => {
  it('orders by descending similarity and never returns the anchor', () => {
    const anchor = feat({ id: 'anchor' })
    const candidates = [
      cand(feat({ id: 'anchor' })), // self — must be dropped
      cand(feat({ id: 'twin' })), // identical
      cand(feat({ id: 'cousin', ingredients: new Set(['chicken', 'noodles']) })), // partial
      cand(
        feat({
          id: 'stranger',
          ingredients: new Set(['beef']),
          tags: new Set(['slow']),
          cuisine: 'italian',
          mainProtein: 'beef',
          band: 'long',
        }),
      ),
    ]
    const out = rankSimilar(anchor, candidates)
    expect(out.map((r) => r.id)).toEqual(['twin', 'cousin', 'stranger'])
    expect(out.map((r) => r.id)).not.toContain('anchor')
  })

  it('caps at the configured limit', () => {
    const anchor = feat({ id: 'anchor' })
    const many = Array.from({ length: 20 }, (_, i) => cand(feat({ id: `r${i}` })))
    expect(rankSimilar(anchor, many)).toHaveLength(DEFAULT_RELATED_CONFIG.limit)
  })
})

describe('rankDifferent', () => {
  const anchor = feat({ id: 'anchor' })

  it('offers only keepers (★3+), excluding binned and unrated', () => {
    const candidates = [
      cand(feat({ id: 'binned', cuisine: 'italian', ingredients: new Set(['beef']) }), 2),
      cand(feat({ id: 'unrated', cuisine: 'mexican', ingredients: new Set(['pork']) })),
      cand(feat({ id: 'keeper', cuisine: 'indian', ingredients: new Set(['lentil']) }), 4),
    ]
    expect(rankDifferent(anchor, candidates).map((r) => r.id)).toEqual(['keeper'])
  })

  it('favours a great recipe unlike the anchor over a good one that is similar', () => {
    const differentGreat = cand(
      feat({
        id: 'different-great',
        ingredients: new Set(['beef', 'pasta']),
        tags: new Set(['slow']),
        cuisine: 'italian',
        mainProtein: 'beef',
        band: 'long',
      }),
      5,
    )
    const similarGood = cand(feat({ id: 'similar-good' }), 4) // nearly identical to anchor
    const out = rankDifferent(anchor, [similarGood, differentGreat])
    expect(out[0].id).toBe('different-great')
  })
})
