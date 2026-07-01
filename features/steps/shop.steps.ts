import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { CURRENT_PLAN_ID } from '../../src/lib/plan'
import { addToPlan, setPortions } from '../../src/app/plan'
import {
  getPlanShoppingList,
  toggleChecked,
  addExtra,
  removeExtra,
} from '../../src/app/shopping'
import { makeRecipe } from '../../test/factories'
import type { ShoppingList } from '../../src/lib/shopping'
import type { Ingredient } from '../../src/schema/recipe'

const feature = await loadFeature('features/shop.feature')

function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Parse "2 garlic" → qty 2, name "garlic". */
function parseSpec(spec: string): { qty: number; name: string } {
  const m = spec.match(/^(\d+)\s+(.*)$/)
  return m ? { qty: Number(m[1]), name: m[2] } : { qty: 1, name: spec }
}

function labels(list: ShoppingList): string[] {
  return list.aisles.flatMap((a) => a.lines.map((l) => l.label))
}

describeFeature(feature, ({ Background, Scenario }) => {
  let list: ShoppingList

  Background(({ Given }) => {
    Given('a clean collection', async () => {
      await Promise.all([db.recipes.clear(), db.plans.clear(), db.shopping.clear()])
    })
  })

  const boundRecipe = async (_: unknown, id: string, spec: string, ingId: string) => {
    const { qty, name } = parseSpec(spec)
    const ing: Ingredient = { rawLabel: spec, name, qty, ingredientId: ingId }
    await db.recipes.put(makeRecipe({ id, ingredients: [ing] }))
  }
  const unboundRecipe = async (_: unknown, id: string, name: string) => {
    const ing: Ingredient = { rawLabel: `1 g ${name}`, name, qty: 1, unit: 'g' }
    await db.recipes.put(makeRecipe({ id, ingredients: [ing] }))
  }
  const onPlan = async (_: unknown, list: string, portions: number) => {
    await setPortions(portions)
    for (const id of ids(list)) await addToPlan(id)
  }
  const build = async () => {
    list = await getPlanShoppingList()
  }
  const contains = (_: unknown, label: string) => {
    expect(labels(list)).toContain(label)
  }
  const unmatchedContains = (_: unknown, label: string) => {
    expect(list.unmatched.map((l) => l.label)).toContain(label)
  }

  Scenario('Ingredients merge across the planned recipes', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with {string} bound to {string}', boundRecipe)
    And('a recipe {string} with {string} bound to {string}', boundRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    When('I build the shopping list', build)
    Then('the list contains {string}', contains)
  })

  Scenario("Quantities scale to the plan's portions", ({ Given, And, When, Then }) => {
    Given('a recipe {string} with {string} bound to {string}', boundRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    When('I build the shopping list', build)
    Then('the list contains {string}', contains)
  })

  Scenario('An unbound ingredient is listed verbatim, not dropped', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with unbound {string}', unboundRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    When('I build the shopping list', build)
    Then('the unmatched items contain {string}', unmatchedContains)
  })

  Scenario('Ticking an item off persists', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with {string} bound to {string}', boundRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    When('I tick off {string}', async (_, key: string) => toggleChecked(key))
    Then('{string} is ticked', async (_, key: string) => {
      const s = await db.shopping.get(CURRENT_PLAN_ID)
      expect(s?.checked).toContain(key)
    })
  })

  Scenario('A manual extra can be added and removed', ({ When, Then }) => {
    When('I add the extra {string}', async (_, text: string) => addExtra(text))
    Then('the extras contain {string}', async (_, text: string) => {
      const s = await db.shopping.get(CURRENT_PLAN_ID)
      expect(s?.extras.map((e) => e.text)).toContain(text)
    })
    When('I remove extra {int}', async (_, i: number) => removeExtra(i))
    Then('there are no extras', async () => {
      const s = await db.shopping.get(CURRENT_PLAN_ID)
      expect(s?.extras ?? []).toHaveLength(0)
    })
  })
})
