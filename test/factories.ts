// Test data builders shared across feature steps (and available to unit tests).
// Keep these the single source of a "valid recipe" shape so tests stay readable.
import type { Recipe } from '../src/schema/recipe'

/** A complete, schema-valid recipe; override any field per case. */
export function makeRecipe(over: Partial<Recipe> & { id: string }): Recipe {
  const id = over.id
  const base: Recipe = {
    id,
    slug: id,
    title: `Recipe ${id}`,
    description: '',
    image: `${id}.jpg`,
    cuisine: 'Test',
    tags: [],
    allergens: [],
    prepTime: 10,
    ingredients: [{ rawLabel: 'Salt (5g)', name: 'salt', qty: 5, unit: 'g' }],
    basics: [],
    instructions: [{ order: 1, text: 'Cook it.' }],
    serves: 2,
  }
  return { ...base, ...over }
}

/** `n` distinct valid recipes with ids r1..rN. */
export function makeRecipes(n: number): Recipe[] {
  return Array.from({ length: n }, (_, i) => makeRecipe({ id: `r${i + 1}` }))
}
