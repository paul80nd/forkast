import { describe, it, expect } from 'vitest'
import {
  tokenize,
  jaccard,
  ingredientSet,
  suggestGroups,
  inferAxis,
  DUPLICATE_OPTS,
  type SimilarityInput,
} from './similarity'

describe('tokenize', () => {
  it('lowercases, drops stopwords and short tokens, and singularises', () => {
    expect([...tokenize('Sweet Potato Chips & Dip')]).toEqual(['sweet', 'potato', 'chip', 'dip'])
    expect([...tokenize('Chicken with the Rice')]).toEqual(['chicken', 'rice'])
  })
})

describe('jaccard', () => {
  it('is intersection over union, 0 when either side is empty', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3)
    expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1)
    expect(jaccard(new Set(), new Set(['a']))).toBe(0)
  })
})

describe('ingredientSet', () => {
  it('normalises so plural/wording variants collapse', () => {
    const s = ingredientSet(['Spring Onions', 'spring onion', 'Soy Sauce'])
    expect(s.size).toBe(2)
    expect(s.has('onion spring')).toBe(true)
  })
})

describe('suggestGroups', () => {
  const burger = (id: string, protein: string): SimilarityInput => ({
    id,
    title: `Kung Pao ${protein} Burger with Sweet Potato Chips`,
    ingredientNames: [protein, 'burger bun', 'sweet potato', 'peanuts', 'soy sauce'],
  })

  it('clusters same-dish protein swaps and excludes unrelated recipes', () => {
    const recipes = [
      burger('chicken', 'Chicken'),
      burger('beef', 'Beef'),
      { id: 'pizza', title: 'Margherita Pizza', ingredientNames: ['pizza base', 'mozzarella', 'tomato', 'basil'] },
    ]
    const clusters = suggestGroups(recipes)
    expect(clusters).toHaveLength(1)
    expect(clusters[0].recipeIds.sort()).toEqual(['beef', 'chicken'])
    expect(clusters[0].score).toBeGreaterThan(0.55)
  })

  it('grows a cluster across more than two variants', () => {
    const clusters = suggestGroups([
      burger('chicken', 'Chicken'),
      burger('beef', 'Beef'),
      burger('tofu', 'Tofu'),
    ])
    expect(clusters).toHaveLength(1)
    expect(clusters[0].recipeIds.sort()).toEqual(['beef', 'chicken', 'tofu'])
  })

  it('drops clusters above the size cap (likely over-merges)', () => {
    const clusters = suggestGroups(
      [burger('chicken', 'Chicken'), burger('beef', 'Beef'), burger('tofu', 'Tofu')],
      { maxClusterSize: 2 },
    )
    expect(clusters).toEqual([])
  })

  it('drops clusters below the score floor', () => {
    const clusters = suggestGroups([burger('chicken', 'Chicken'), burger('beef', 'Beef')], {
      minClusterScore: 0.99,
    })
    expect(clusters).toEqual([])
  })

  describe('DUPLICATE_OPTS (tight duplicate preset)', () => {
    it('flags near-identical recipes (same title words + ingredients) as duplicates', () => {
      const ingredients = ['chicken', 'burger bun', 'sweet potato', 'peanuts', 'soy sauce']
      const clusters = suggestGroups(
        [
          { id: 'a', title: 'Kung Pao Chicken Burger with Sweet Potato Chips', ingredientNames: ingredients },
          { id: 'b', title: 'Sweet Potato Chip Kung Pao Chicken Burger', ingredientNames: ingredients },
        ],
        DUPLICATE_OPTS,
      )
      expect(clusters).toHaveLength(1)
      expect(clusters[0].recipeIds.sort()).toEqual(['a', 'b'])
    })

    it('does NOT flag a protein swap as a duplicate — its title differs on the swapped word', () => {
      const clusters = suggestGroups(
        [burger('chicken', 'Chicken'), burger('beef', 'Beef')],
        DUPLICATE_OPTS,
      )
      expect(clusters).toEqual([])
    })
  })
})

describe('inferAxis', () => {
  it('reads distinct mainProtein values as a protein swap', () => {
    expect(
      inferAxis([
        { mainProtein: 'chicken', ingredientNames: ['chicken', 'rice'] },
        { mainProtein: 'beef', ingredientNames: ['beef', 'rice'] },
      ]),
    ).toBe('protein')
  })

  it('reads a differing carb (same protein) as a carb swap', () => {
    expect(
      inferAxis([
        { mainProtein: 'chicken', ingredientNames: ['chicken thigh', 'rice', 'soy sauce'] },
        { mainProtein: 'chicken', ingredientNames: ['chicken thigh', 'chips', 'soy sauce'] },
      ]),
    ).toBe('carb')
  })

  it('falls back to ingredient protein words when mainProtein is absent', () => {
    expect(
      inferAxis([
        { ingredientNames: ['chicken breast', 'broccoli', 'garlic'] },
        { ingredientNames: ['tofu', 'broccoli', 'garlic'] },
      ]),
    ).toBe('protein')
  })

  it('returns mixed when both a protein and a carb differ', () => {
    expect(
      inferAxis([
        { mainProtein: 'chicken', ingredientNames: ['chicken', 'rice', 'garlic'] },
        { mainProtein: 'chicken', ingredientNames: ['tofu', 'chips', 'garlic'] },
      ]),
    ).toBe('mixed')
  })

  it('returns mixed when nothing recognisable differs', () => {
    expect(
      inferAxis([
        { mainProtein: 'chicken', ingredientNames: ['chicken', 'tomato', 'basil'] },
        { mainProtein: 'chicken', ingredientNames: ['chicken', 'tomato', 'oregano'] },
      ]),
    ).toBe('mixed')
  })
})
