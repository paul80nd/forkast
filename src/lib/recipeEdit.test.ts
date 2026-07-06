import { describe, expect, it } from 'vitest'
import { normalizeRecipeEdit, normalizeStringList } from './recipeEdit'

describe('normalizeStringList', () => {
  it('trims, drops blanks, and de-dupes case-insensitively keeping the first spelling', () => {
    expect(normalizeStringList([' Speedy ', 'speedy', '   ', 'vegetarian'])).toEqual([
      'Speedy',
      'vegetarian',
    ])
  })

  it('returns an empty array unchanged', () => {
    expect(normalizeStringList([])).toEqual([])
  })
})

describe('normalizeRecipeEdit', () => {
  it('trims the provided fields', () => {
    expect(normalizeRecipeEdit({ title: '  Ragu  ', description: ' hearty ', recipeCode: ' R12 ' })).toEqual(
      { title: 'Ragu', description: 'hearty', recipeCode: 'R12' },
    )
  })

  it('omits a blank title so it never overwrites the real one', () => {
    expect(normalizeRecipeEdit({ title: '   ' })).toEqual({})
  })

  it('clears the card code when blank', () => {
    expect(normalizeRecipeEdit({ recipeCode: '   ' })).toEqual({ recipeCode: undefined })
  })

  it('allows an empty description', () => {
    expect(normalizeRecipeEdit({ description: '' })).toEqual({ description: '' })
  })

  it('leaves out fields absent from the patch', () => {
    expect(normalizeRecipeEdit({ title: 'Only title' })).toEqual({ title: 'Only title' })
  })

  it('normalises tags and allergens, keeping an empty array (a clear)', () => {
    expect(normalizeRecipeEdit({ tags: [' speedy ', 'speedy'], allergens: [] })).toEqual({
      tags: ['speedy'],
      allergens: [],
    })
  })
})
