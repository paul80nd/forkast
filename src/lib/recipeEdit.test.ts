import { describe, expect, it } from 'vitest'
import { normalizeRecipeEdit } from './recipeEdit'

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
})
