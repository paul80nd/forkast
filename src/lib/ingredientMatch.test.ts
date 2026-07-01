import { describe, it, expect } from 'vitest'
import { matchIngredient } from './ingredientMatch'
import { INGREDIENTS } from '../data/ingredients'

describe('matchIngredient', () => {
  it('scores an exact name match as 1 and ranks it first', () => {
    const [top] = matchIngredient('lime', INGREDIENTS)
    expect(top.def.id).toBe('lime')
    expect(top.score).toBe(1)
  })

  it('matches across singular/plural', () => {
    expect(matchIngredient('limes', INGREDIENTS)[0].def.id).toBe('lime')
  })

  it('prefers the more specific entry when extra words are given', () => {
    // "red onion" should beat plain "onion".
    expect(matchIngredient('red onions', INGREDIENTS)[0].def.id).toBe('red-onion')
  })

  it('surfaces a partial match via substring containment', () => {
    // "chicken" contains no exact entry, but "chicken breast" should surface.
    const top = matchIngredient('chicken', INGREDIENTS)[0]
    expect(top.def.id).toBe('chicken-breast')
    expect(top.score).toBeGreaterThanOrEqual(0.85)
  })

  it('returns nothing for an unknown ingredient', () => {
    expect(matchIngredient('dragonfruit', INGREDIENTS)).toEqual([])
  })

  it('respects the result limit', () => {
    expect(matchIngredient('onion', INGREDIENTS, 1)).toHaveLength(1)
  })
})
