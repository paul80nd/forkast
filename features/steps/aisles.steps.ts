import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { addToPlan, setPortions } from '../../src/app/plan'
import { getPlanShoppingList, setBinding, createIngredient } from '../../src/app/shopping'
import {
  getAisleOrder,
  getEffectiveAisles,
  addAisle,
  moveAisle,
  renameAisle,
  deleteAisle,
} from '../../src/app/aisles'
import { makeRecipe } from '../../test/factories'
import type { ShoppingList } from '../../src/lib/shopping'
import type { Ingredient } from '../../src/schema/recipe'

const feature = await loadFeature('features/aisles.feature')

const KNOWN_UNITS = new Set(['tsp', 'tbsp', 'g', 'kg', 'ml', 'l', 'each'])

/** Parse "100 g cheddar" → qty 100, unit g, name "cheddar" (unit optional). */
function parseQtyUnit(spec: string): { qty: number; unit?: string; name: string } {
  const m = spec.match(/^(\d+)\s+(\S+)\s+(.*)$/)
  if (m && KNOWN_UNITS.has(m[2])) return { qty: Number(m[1]), unit: m[2], name: m[3] }
  const n = spec.match(/^(\d+)\s+(.*)$/)
  return n ? { qty: Number(n[1]), name: n[2] } : { qty: 1, name: spec }
}

describeFeature(feature, ({ Background, Scenario }) => {
  let list: ShoppingList

  Background(({ Given }) => {
    Given('a clean collection', async () => {
      await Promise.all([
        db.recipes.clear(),
        db.plans.clear(),
        db.shopping.clear(),
        db.dictionary.clear(),
        db.bindings.clear(),
        db.settings.clear(),
      ])
    })
  })

  const makeIngredient = async (_: unknown, name: string, aisle: string) => {
    await createIngredient({ name, aisle, purchaseUnit: 'g' })
  }
  // One line that seeds an aisle: a dictionary entry, a recipe using it (bound), and the plan.
  const plannedRecipe = async (_: unknown, id: string, spec: string, aisle: string) => {
    const { qty, unit, name } = parseQtyUnit(spec)
    const def = await createIngredient({ name, aisle, purchaseUnit: unit ?? 'g' })
    await setBinding(name, def.id)
    const ing: Ingredient = { rawLabel: spec, name, qty, unit }
    await db.recipes.put(makeRecipe({ id, ingredients: [ing] }))
    await setPortions(2)
    await addToPlan(id)
  }
  const build = async () => {
    list = await getPlanShoppingList()
  }

  const addAisleStep = async (_: unknown, name: string) => addAisle(name)
  const renameAisleStep = async (_: unknown, from: string, to: string) => {
    await renameAisle(from, to)
  }
  const deleteAisleStep = async (_: unknown, name: string) => {
    await deleteAisle(name)
  }
  // Move `x` up until it sits before `y` — order-independent of where they start.
  const moveAbove = async (_: unknown, x: string, y: string) => {
    for (let n = 0; n < 20; n++) {
      const eff = await getEffectiveAisles()
      if (eff.indexOf(x) < eff.indexOf(y)) break
      await moveAisle(x, -1)
    }
  }

  const orderEndsWith = async (_: unknown, name: string) => {
    const order = await getAisleOrder()
    expect(order[order.length - 1]).toBe(name)
  }
  const orderContains = async (_: unknown, name: string) => {
    expect(await getAisleOrder()).toContain(name)
  }
  const orderNotContains = async (_: unknown, name: string) => {
    expect(await getAisleOrder()).not.toContain(name)
  }
  const ingredientInAisle = async (_: unknown, name: string, aisle: string) => {
    const all = await db.dictionary.toArray()
    expect(all.find((d) => d.name === name)?.aisle).toBe(aisle)
  }
  const firstAisleIs = (_: unknown, aisle: string) => {
    expect(list.aisles[0]?.aisle).toBe(aisle)
  }

  Scenario('Adding a new aisle appends it to the order', ({ When, Then }) => {
    When('I add the aisle {string}', addAisleStep)
    Then('the aisle order ends with {string}', orderEndsWith)
  })

  Scenario('Renaming an aisle moves its ingredients', ({ Given, When, Then, And }) => {
    Given('an ingredient {string} in aisle {string}', makeIngredient)
    When('I rename the aisle {string} to {string}', renameAisleStep)
    Then('the ingredient {string} is in aisle {string}', ingredientInAisle)
    And('the aisle order contains {string}', orderContains)
    And('the aisle order does not contain {string}', orderNotContains)
  })

  Scenario('Renaming onto an existing aisle merges them', ({ Given, And, When, Then }) => {
    Given('an ingredient {string} in aisle {string}', makeIngredient)
    And('an ingredient {string} in aisle {string}', makeIngredient)
    When('I rename the aisle {string} to {string}', renameAisleStep)
    Then('the ingredient {string} is in aisle {string}', ingredientInAisle)
    And('the aisle order does not contain {string}', orderNotContains)
  })

  Scenario('An empty aisle can be deleted', ({ When, And, Then }) => {
    When('I add the aisle {string}', addAisleStep)
    And('I delete the aisle {string}', deleteAisleStep)
    Then('the aisle order does not contain {string}', orderNotContains)
  })

  Scenario('An aisle in use is protected from deletion', ({ Given, When, Then }) => {
    Given('an ingredient {string} in aisle {string}', makeIngredient)
    When('I try to delete the aisle {string}', deleteAisleStep)
    Then('the aisle order contains {string}', orderContains)
  })

  Scenario('Reordering aisles sets the shopping list section order', ({ Given, And, When, Then }) => {
    Given('a planned recipe {string} using {string} bound in aisle {string}', plannedRecipe)
    And('a planned recipe {string} using {string} bound in aisle {string}', plannedRecipe)
    When('I move the aisle {string} above {string}', moveAbove)
    And('I build the shopping list', build)
    Then('the first aisle on the list is {string}', firstAisleIs)
  })
})
