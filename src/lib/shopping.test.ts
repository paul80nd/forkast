import { describe, it, expect } from 'vitest'
import { buildShoppingList } from './shopping'
import type { Recipe, Ingredient } from '../schema/recipe'

function recipe(id: string, ingredients: Ingredient[], extra?: Partial<Recipe>): Recipe {
  return {
    id,
    slug: id,
    title: id,
    description: '',
    image: '',
    cuisine: 'Test',
    tags: [],
    allergens: [],
    prepTime: 10,
    ingredients,
    basics: [],
    instructions: [],
    serves: 2,
    ...extra,
  }
}

/** Flatten every derived line's label for easy assertions. */
function labels(list: ReturnType<typeof buildShoppingList>): string[] {
  return [
    ...list.aisles.flatMap((a) => a.lines.map((l) => l.label)),
    ...list.unmatched.map((l) => l.label),
  ]
}

function findLine(list: ReturnType<typeof buildShoppingList>, label: string) {
  return list.aisles.flatMap((a) => a.lines).find((l) => l.label === label)
}

describe('buildShoppingList', () => {
  it('merges the same ingredient across recipes (count)', () => {
    const a = recipe('a', [{ rawLabel: '1 lime', name: 'lime', qty: 1, ingredientId: 'lime' }])
    const b = recipe('b', [{ rawLabel: '1 lime', name: 'lime', qty: 1, ingredientId: 'lime' }])
    expect(labels(buildShoppingList([a, b], 2))).toContain('limes · × 2')
  })

  it('converts recipe units to the purchase unit and sums (tbsp -> ml)', () => {
    const a = recipe('a', [{ rawLabel: '2 tbsp soy sauce', name: 'soy sauce', qty: 2, unit: 'tbsp', ingredientId: 'soy-sauce' }])
    const b = recipe('b', [{ rawLabel: '1 tbsp soy sauce', name: 'soy sauce', qty: 1, unit: 'tbsp', ingredientId: 'soy-sauce' }])
    // (2 + 1) tbsp = 45 ml
    const list = buildShoppingList([a, b], 2)
    expect(labels(list)).toContain('soy sauce · 45 ml')
    // ...and the breakdown shows what it's made of, grouped by recipe unit.
    expect(findLine(list, 'soy sauce · 45 ml')?.detail).toBe('3 tbsp')
  })

  it('omits the detail when it would just restate the line', () => {
    const a = recipe('a', [{ rawLabel: '800g chickpeas', name: 'chickpeas', qty: 800, unit: 'g', ingredientId: 'chickpeas' }])
    expect(findLine(buildShoppingList([a], 2), 'chickpeas · 800 g')?.detail).toBeUndefined()
  })

  it('keeps the recipe unit when there is no natural conversion (tsp -> g)', () => {
    const a = recipe('a', [{ rawLabel: '2 tsp curry powder', name: 'curry powder', qty: 2, unit: 'tsp', ingredientId: 'curry-powder' }])
    // curry powder is bought in grams, no density -> stays in tsp
    expect(labels(buildShoppingList([a], 2))).toContain('curry powder · 2 tsp')
  })

  it('scales quantities to the chosen portions', () => {
    const a = recipe('a', [
      { rawLabel: '2 garlic cloves', name: 'garlic', qty: 2, ingredientId: 'garlic' },
      { rawLabel: '800g chickpeas', name: 'chickpeas', qty: 800, unit: 'g', ingredientId: 'chickpeas' },
    ])
    const list = labels(buildShoppingList([a], 4)) // serves 2 -> factor 2
    expect(list).toContain('garlic cloves · × 4')
    expect(list).toContain('chickpeas · 1600 g')
  })

  it('uses the singular name for a single countable item', () => {
    const a = recipe('a', [{ rawLabel: '1 carrot', name: 'carrot', qty: 1, ingredientId: 'carrot' }])
    expect(labels(buildShoppingList([a], 2))).toContain('carrot · × 1')
  })

  it('rounds countable quantities up (you buy whole things)', () => {
    // 1 carrot scaled by 1.5x = 1.5 -> 2 carrots
    const a = recipe('a', [{ rawLabel: '1 carrot', name: 'carrot', qty: 1, ingredientId: 'carrot' }], {
      serves: 2,
    })
    expect(labels(buildShoppingList([a], 3))).toContain('carrots · × 2')
  })

  it('lists unmatched ingredients verbatim rather than dropping them', () => {
    const a = recipe('a', [{ rawLabel: '1 sprig mystery herb', name: 'mystery herb', qty: 1, unit: 'g' }])
    const list = buildShoppingList([a], 2)
    expect(list.unmatched.map((l) => l.label)).toContain('mystery herb · 1 g')
  })

  it('groups lines by aisle and dedupes store-cupboard basics', () => {
    const a = recipe('a', [{ rawLabel: '1 onion', name: 'onion', qty: 1, ingredientId: 'onion' }], {
      basics: ['salt', 'olive oil'],
    })
    const b = recipe('b', [{ rawLabel: '250g beef mince', name: 'beef mince', qty: 250, unit: 'g', ingredientId: 'beef-mince' }], {
      basics: ['salt'],
    })
    const list = buildShoppingList([a, b], 2)
    expect(list.aisles.map((g) => g.aisle)).toEqual(['Produce', 'Meat & Fish'])
    expect(list.basics).toEqual(['olive oil', 'salt'])
  })

  it('does not pluralise a measured-by-weight name (kept in the recipe unit)', () => {
    // garam masala is bought in grams; a tbsp amount has no density to convert, so it stays
    // "1 tbsp garam masala" — not "garam masalas".
    const dict = new Map([
      ['garam-masala', { id: 'garam-masala', name: 'garam masala', aisle: 'Pantry', purchaseUnit: 'g' }],
    ])
    const a = recipe('a', [
      { rawLabel: '1 tbsp garam masala', name: 'garam masala', qty: 1, unit: 'tbsp', ingredientId: 'garam-masala' },
    ])
    expect(labels(buildShoppingList([a], 2, dict))).toContain('garam masala · 1 tbsp')
  })

  it('converts a spoon amount to the buy unit when a density is set, keeping the original in detail', () => {
    const dict = new Map([
      ['gm', { id: 'gm', name: 'garam masala', aisle: 'Pantry', purchaseUnit: 'g', densityGPerMl: 0.5 }],
    ])
    const a = recipe('a', [
      { rawLabel: '1 tbsp garam masala', name: 'garam masala', qty: 1, unit: 'tbsp', ingredientId: 'gm' },
    ])
    const list = buildShoppingList([a], 2, dict)
    // 1 tbsp = 15 ml × 0.5 g/ml = 7.5 g
    expect(labels(list)).toContain('garam masala · 7.5 g')
    expect(findLine(list, 'garam masala · 7.5 g')?.detail).toBe('1 tbsp')
  })

  it('records how many recipes contribute to a merged line', () => {
    const a = recipe('a', [{ rawLabel: '2 tbsp soy sauce', name: 'soy sauce', qty: 2, unit: 'tbsp', ingredientId: 'soy-sauce' }])
    const b = recipe('b', [{ rawLabel: '1 tbsp soy sauce', name: 'soy sauce', qty: 1, unit: 'tbsp', ingredientId: 'soy-sauce' }])
    const line = findLine(buildShoppingList([a, b], 2), 'soy sauce · 45 ml')
    expect(line?.recipeCount).toBe(2)
    // ...and keeps the recipe-unit breakdown for spot-checking against the recipes.
    expect(line?.detail).toBe('3 tbsp')
  })
})
