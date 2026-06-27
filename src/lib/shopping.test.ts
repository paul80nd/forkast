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
    categories: [],
    tags: [],
    allergens: [],
    prepTime: { for2: 10, for4: 15 },
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
    expect(labels(buildShoppingList([a, b], 2))).toContain('2 limes')
  })

  it('converts recipe units to the purchase unit and sums (tbsp -> ml)', () => {
    const a = recipe('a', [{ rawLabel: '2 tbsp soy sauce', name: 'soy sauce', qty: 2, unit: 'tbsp', ingredientId: 'soy-sauce' }])
    const b = recipe('b', [{ rawLabel: '1 tbsp soy sauce', name: 'soy sauce', qty: 1, unit: 'tbsp', ingredientId: 'soy-sauce' }])
    // (2 + 1) tbsp = 45 ml
    const list = buildShoppingList([a, b], 2)
    expect(labels(list)).toContain('45 ml soy sauce')
    // ...and the breakdown shows what it's made of, grouped by recipe unit.
    expect(findLine(list, '45 ml soy sauce')?.detail).toBe('3 tbsp')
  })

  it('omits the detail when it would just restate the line', () => {
    const a = recipe('a', [{ rawLabel: '800g chickpeas', name: 'chickpeas', qty: 800, unit: 'g', ingredientId: 'chickpeas' }])
    expect(findLine(buildShoppingList([a], 2), '800 g chickpeas')?.detail).toBeUndefined()
  })

  it('keeps the recipe unit when there is no natural conversion (tsp -> g)', () => {
    const a = recipe('a', [{ rawLabel: '2 tsp curry powder', name: 'curry powder', qty: 2, unit: 'tsp', ingredientId: 'curry-powder' }])
    // curry powder is bought in grams, no density -> stays in tsp
    expect(labels(buildShoppingList([a], 2))).toContain('2 tsp curry powder')
  })

  it('scales quantities to the chosen portions', () => {
    const a = recipe('a', [
      { rawLabel: '2 garlic cloves', name: 'garlic', qty: 2, ingredientId: 'garlic' },
      { rawLabel: '800g chickpeas', name: 'chickpeas', qty: 800, unit: 'g', ingredientId: 'chickpeas' },
    ])
    const list = labels(buildShoppingList([a], 4)) // serves 2 -> factor 2
    expect(list).toContain('4 garlic cloves')
    expect(list).toContain('1600 g chickpeas')
  })

  it('uses the singular name for a single countable item', () => {
    const a = recipe('a', [{ rawLabel: '1 carrot', name: 'carrot', qty: 1, ingredientId: 'carrot' }])
    expect(labels(buildShoppingList([a], 2))).toContain('1 carrot')
  })

  it('rounds countable quantities up (you buy whole things)', () => {
    // 1 carrot scaled by 1.5x = 1.5 -> 2 carrots
    const a = recipe('a', [{ rawLabel: '1 carrot', name: 'carrot', qty: 1, ingredientId: 'carrot' }], {
      serves: 2,
    })
    expect(labels(buildShoppingList([a], 3))).toContain('2 carrots')
  })

  it('lists unmatched ingredients verbatim rather than dropping them', () => {
    const a = recipe('a', [{ rawLabel: '1 sprig mystery herb', name: 'mystery herb', qty: 1, unit: 'g' }])
    const list = buildShoppingList([a], 2)
    expect(list.unmatched.map((l) => l.label)).toContain('1 g mystery herb')
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
})
