import { describe, it, expect } from 'vitest'
import { parseRecipeDataset, isRecipeDataset } from './dataset'

// A minimal well-formed raw recipe; spread + override per case.
function raw(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'beef-noodles',
    slug: 'beef-noodles',
    title: 'Beef Noodles',
    description: 'Quick noodles.',
    image: 'beef-noodles.jpg',
    cuisine: 'Asian',
    tags: ['speedy'],
    allergens: ['gluten'],
    prepTime: 10,
    ingredients: [{ rawLabel: 'Beef mince (250g)', name: 'beef mince', qty: 250, unit: 'g' }],
    basics: ['oil'],
    instructions: [{ order: 1, text: 'Cook.' }],
    serves: 2,
    ...over,
  }
}

describe('parseRecipeDataset', () => {
  it('accepts a { version, recipes } wrapper and returns normalised recipes', () => {
    const r = parseRecipeDataset({ version: 1, recipes: [raw()] })
    expect(r.skipped).toBe(0)
    expect(r.errors).toEqual([])
    expect(r.recipes).toHaveLength(1)
    expect(r.recipes[0]).toMatchObject({ id: 'beef-noodles', title: 'Beef Noodles', serves: 2 })
  })

  it('accepts a JSON string', () => {
    const r = parseRecipeDataset(JSON.stringify({ version: 1, recipes: [raw()] }))
    expect(r.recipes).toHaveLength(1)
  })

  it('accepts a bare array of recipes', () => {
    const r = parseRecipeDataset([raw(), raw({ id: 'b', slug: 'b' })])
    expect(r.recipes).toHaveLength(2)
  })

  it('reports a clear error for invalid JSON', () => {
    const r = parseRecipeDataset('{ not json')
    expect(r.recipes).toHaveLength(0)
    expect(r.errors[0]).toMatch(/not valid JSON/)
  })

  it('reports a clear error when there is no recipes array', () => {
    const r = parseRecipeDataset({ version: 1 })
    expect(r.recipes).toHaveLength(0)
    expect(r.errors).toEqual(['dataset has no recipes array'])
  })

  it('skips a recipe missing its title but keeps the valid ones', () => {
    const r = parseRecipeDataset([raw(), raw({ id: 'b', slug: 'b', title: undefined })])
    expect(r.recipes.map((x) => x.id)).toEqual(['beef-noodles'])
    expect(r.skipped).toBe(1)
    expect(r.errors[0]).toMatch(/missing title/)
  })

  it('skips a recipe with no usable id', () => {
    const r = parseRecipeDataset([raw({ id: undefined, slug: undefined })])
    expect(r.skipped).toBe(1)
    expect(r.errors[0]).toMatch(/missing id\/slug/)
  })

  it('falls back to slug when id is absent', () => {
    const r = parseRecipeDataset([raw({ id: undefined, slug: 'from-slug' })])
    expect(r.recipes[0].id).toBe('from-slug')
  })

  it('drops duplicate ids, keeping the first', () => {
    const r = parseRecipeDataset([raw({ title: 'First' }), raw({ title: 'Second' })])
    expect(r.recipes).toHaveLength(1)
    expect(r.recipes[0].title).toBe('First')
    expect(r.errors[0]).toMatch(/duplicate id/)
  })

  it('defaults missing arrays and serves rather than failing', () => {
    const r = parseRecipeDataset([
      { id: 'sparse', slug: 'sparse', title: 'Sparse', ingredients: [] },
    ])
    const recipe = r.recipes[0]
    expect(recipe.tags).toEqual([])
    expect(recipe.allergens).toEqual([])
    expect(recipe.basics).toEqual([])
    expect(recipe.instructions).toEqual([])
    expect(recipe.prepTime).toBe(0)
    expect(recipe.serves).toBe(2)
  })

  it('reads prepTime as a number, tolerating the legacy { for2 } shape', () => {
    expect(parseRecipeDataset([raw({ prepTime: 25 })]).recipes[0].prepTime).toBe(25)
    expect(
      parseRecipeDataset([raw({ prepTime: { for2: 30, for4: 45 } })]).recipes[0].prepTime,
    ).toBe(30)
  })

  it('skips ingredient lines with no text but keeps the recipe', () => {
    const r = parseRecipeDataset([
      raw({ ingredients: [{ name: 'salt' }, { qty: 5, unit: 'g' }] }),
    ])
    expect(r.recipes[0].ingredients).toHaveLength(1)
    expect(r.recipes[0].ingredients[0].name).toBe('salt')
  })

  it('preserves optional fields only when present', () => {
    const nutrition = {
      kcal: 520,
      protein: 31,
      fat: 18,
      saturates: 6,
      carbs: 54,
      sugars: 9,
      fibre: 7,
      salt: 1.2,
    }
    const withOpt = parseRecipeDataset([
      raw({
        mainProtein: 'beef',
        sourceRating: { average: 4, count: 10 },
        sourceUrl: 'https://example.test/r/beef-noodles',
        nutrition,
      }),
    ]).recipes[0]
    expect(withOpt.mainProtein).toBe('beef')
    expect(withOpt.sourceRating).toEqual({ average: 4, count: 10 })
    expect(withOpt.sourceUrl).toBe('https://example.test/r/beef-noodles')
    expect(withOpt.nutrition).toEqual(nutrition)

    const withoutOpt = parseRecipeDataset([raw({ mainProtein: undefined })]).recipes[0]
    expect('mainProtein' in withoutOpt).toBe(false)
    expect('sourceRating' in withoutOpt).toBe(false)
    expect('sourceUrl' in withoutOpt).toBe(false)
    expect('nutrition' in withoutOpt).toBe(false)
  })
})

describe('isRecipeDataset', () => {
  it('recognises a v1 wrapper', () => {
    expect(isRecipeDataset({ version: 1, recipes: [] })).toBe(true)
    expect(isRecipeDataset({ version: 2, recipes: [] })).toBe(false)
    expect(isRecipeDataset([])).toBe(false)
  })
})
