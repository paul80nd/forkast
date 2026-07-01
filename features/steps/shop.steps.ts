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
  setBinding,
  createIngredient,
  setIngredientDensity,
  updateIngredient,
} from '../../src/app/shopping'
import { makeRecipe } from '../../test/factories'
import type { ShoppingList } from '../../src/lib/shopping'
import type { Ingredient } from '../../src/schema/recipe'
import type { IngredientDef } from '../../src/data/ingredients'

const KNOWN_UNITS = new Set(['tsp', 'tbsp', 'g', 'kg', 'ml', 'l', 'each'])

/** Parse "3 tsp soy sauce" → qty 3, unit tsp, name "soy sauce" (unit optional). */
function parseQtyUnit(spec: string): { qty: number; unit?: string; name: string } {
  const m = spec.match(/^(\d+)\s+(\S+)\s+(.*)$/)
  if (m && KNOWN_UNITS.has(m[2])) return { qty: Number(m[1]), unit: m[2], name: m[3] }
  const n = spec.match(/^(\d+)\s+(.*)$/)
  return n ? { qty: Number(n[1]), name: n[2] } : { qty: 1, name: spec }
}

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
  let created: IngredientDef

  Background(({ Given }) => {
    Given('a clean collection', async () => {
      await Promise.all([
        db.recipes.clear(),
        db.plans.clear(),
        db.shopping.clear(),
        db.dictionary.clear(),
        db.bindings.clear(),
      ])
    })
  })

  const boundRecipe = async (_: unknown, id: string, spec: string, ingId: string) => {
    const { qty, name } = parseSpec(spec)
    const ing: Ingredient = { rawLabel: spec, name, qty, ingredientId: ingId }
    await db.recipes.put(makeRecipe({ id, ingredients: [ing] }))
  }
  const unboundRecipe = async (_: unknown, id: string, name: string) => {
    const ing: Ingredient = { rawLabel: `1 ${name}`, name, qty: 1 }
    await db.recipes.put(makeRecipe({ id, ingredients: [ing] }))
  }
  const usingRecipe = async (_: unknown, id: string, spec: string) => {
    const { qty, unit, name } = parseQtyUnit(spec)
    const ing: Ingredient = { rawLabel: spec, name, qty, unit }
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
  const unmatchedNotContains = (_: unknown, sub: string) => {
    expect(list.unmatched.some((l) => l.label.includes(sub))).toBe(false)
  }
  const bind = async (_: unknown, name: string, ingId: string) => setBinding(name, ingId)
  const createIng = async (_: unknown, name: string, aisle: string, unit: string) => {
    created = await createIngredient({ name, aisle, purchaseUnit: unit })
  }
  const bindToNew = async (_: unknown, name: string) => setBinding(name, created.id)
  const setDensity = async (_: unknown, g: string) => setIngredientDensity(created.id, Number(g))
  const moveIngredient = async (_: unknown, aisle: string, unit: string) =>
    updateIngredient(created.id, { aisle, purchaseUnit: unit })
  const hasAisle = (_: unknown, aisle: string) => {
    expect(list.aisles.some((a) => a.aisle === aisle)).toBe(true)
  }
  const lineCombines = (_: unknown, label: string, n: number) => {
    const line = list.aisles.flatMap((a) => a.lines).find((l) => l.label === label)
    expect(line?.recipeCount).toBe(n)
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

  Scenario('Binding an unbound ingredient makes it merge', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with unbound {string}', unboundRecipe)
    And('a recipe {string} with unbound {string}', unboundRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    And('I bind {string} to {string}', bind)
    When('I build the shopping list', build)
    Then('the list contains {string}', contains)
    And('the unmatched items do not contain {string}', unmatchedNotContains)
  })

  Scenario('Creating a new ingredient and binding to it merges the lines', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with unbound {string}', unboundRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    And('I create an ingredient {string} in aisle {string} bought in {string}', createIng)
    And('I bind {string} to that new ingredient', bindToNew)
    When('I build the shopping list', build)
    Then('the list has an aisle {string}', hasAisle)
  })

  Scenario('A density lets a spoon-measured spice convert to grams', ({ Given, And, When, Then }) => {
    Given('a recipe {string} using {string}', usingRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    And('I create an ingredient {string} in aisle {string} bought in {string}', createIng)
    And('I bind {string} to that new ingredient', bindToNew)
    And('I set the density of that ingredient to {string}', setDensity)
    When('I build the shopping list', build)
    Then('the list contains {string}', contains)
  })

  Scenario('Editing a bound ingredient changes its aisle and buy unit', ({ Given, And, When, Then }) => {
    Given('a recipe {string} with unbound {string}', unboundRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    And('I create an ingredient {string} in aisle {string} bought in {string}', createIng)
    And('I bind {string} to that new ingredient', bindToNew)
    And('I move that ingredient to aisle {string} bought in {string}', moveIngredient)
    When('I build the shopping list', build)
    Then('the list has an aisle {string}', hasAisle)
  })

  Scenario('A merged line records how many recipes it combines', ({ Given, And, When, Then }) => {
    Given('a recipe {string} using {string}', usingRecipe)
    And('a recipe {string} using {string}', usingRecipe)
    And('recipes {string} are on the plan for {int}', onPlan)
    And('I bind {string} to {string}', bind)
    When('I build the shopping list', build)
    Then('the line {string} combines {int} recipes', lineCombines)
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
