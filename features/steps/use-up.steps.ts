import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { CURRENT_PLAN_ID } from '../../src/lib/plan'
import { addToPlan } from '../../src/app/plan'
import {
  addUseUpItem,
  getUseUpStatus,
  suggestUseUpRecipes,
  type UseUpSuggestion,
} from '../../src/app/useUp'
import { makeRecipe } from '../../test/factories'
import type { Ingredient } from '../../src/schema/recipe'

const feature = await loadFeature('features/use-up.feature')

function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Build a recipe whose ingredient lines are unbound (name only) — the common real-data case. */
async function putRecipe(id: string, ingredientList: string, allergens: string[] = []) {
  const ingredients: Ingredient[] = ids(ingredientList).map((name) => ({ rawLabel: name, name }))
  await db.recipes.put(makeRecipe({ id, ingredients, allergens }))
}

describeFeature(feature, ({ Background, Scenario }) => {
  let suggestions: UseUpSuggestion[] = []

  Background(({ Given }) => {
    Given('a clean collection', async () => {
      await Promise.all([db.recipes.clear(), db.plans.clear(), db.bindings.clear(), db.settings.clear()])
      suggestions = []
    })
  })

  // Steps shared across scenarios (vitest-cucumber re-registers per Scenario block).
  const addRecipe = async (_: unknown, id: string, list: string) => putRecipe(id, list)
  const addRecipeAllergen = async (_: unknown, id: string, list: string, allergen: string) =>
    putRecipe(id, list, [allergen])
  const onPlan = async (_: unknown, id: string) => addToPlan(id)
  const listHas = async (_: unknown, list: string) => {
    for (const name of ids(list)) await addUseUpItem({ name })
  }
  const suggest = async () => {
    suggestions = await suggestUseUpRecipes()
  }
  const inOrder = (_: unknown, list: string) => {
    expect(suggestions.map((s) => s.recipeId)).toEqual(ids(list))
  }
  const statusFor = async (name: string): Promise<boolean> => {
    const status = await getUseUpStatus()
    const found = status.find((s) => s.item.name === name)
    expect(found).toBeDefined()
    return found!.usedByPlan
  }

  Scenario('An ingredient the plan uses reads "on plan"; the rest are unused', ({ Given, And, Then }) => {
    Given('a recipe {string} with ingredients {string}', addRecipe)
    And('a recipe {string} with ingredients {string}', addRecipe)
    And('{string} is on the plan', onPlan)
    And('my use-up list has {string}', listHas)
    Then('{string} is on the plan', async (_, name: string) => {
      expect(await statusFor(name)).toBe(true)
    })
    And('{string} is unused', async (_, name: string) => {
      expect(await statusFor(name)).toBe(false)
    })
  })

  Scenario('Suggestions rank recipes by how many use-up ingredients they use', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with ingredients {string}', addRecipe)
    And('a recipe {string} with ingredients {string}', addRecipe)
    And('my use-up list has {string}', listHas)
    When('I suggest recipes to use up', suggest)
    Then('the use-up suggestions in order are {string}', inOrder)
  })

  Scenario('Only unused ingredients drive suggestions', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with ingredients {string}', addRecipe)
    And('a recipe {string} with ingredients {string}', addRecipe)
    And('another recipe {string} with ingredients {string}', addRecipe)
    And('{string} is on the plan', onPlan)
    And('my use-up list has {string}', listHas)
    When('I suggest recipes to use up', suggest)
    Then('the use-up suggestions in order are {string}', inOrder)
  })

  Scenario('A no-go recipe is never suggested', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with ingredients {string}', addRecipe)
    And('a recipe {string} with ingredients {string} and allergen {string}', addRecipeAllergen)
    And('my use-up list has {string}', listHas)
    When('I suggest recipes to use up', suggest)
    Then('the use-up suggestions in order are {string}', inOrder)
  })

  Scenario('Adding a suggested recipe puts it on the plan', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with ingredients {string}', addRecipe)
    And('my use-up list has {string}', listHas)
    When('I suggest recipes to use up', suggest)
    And('I add the first use-up suggestion to the plan', async () => {
      await addToPlan(suggestions[0].recipeId)
    })
    Then('the plan contains {string}', async (_, id: string) => {
      expect((await db.plans.get(CURRENT_PLAN_ID))?.recipeIds).toContain(id)
    })
  })
})
