import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { createGroup, groupForRecipe } from '../../src/app/groups'
import { deleteRecipes } from '../../src/app/cleanup'
import { setStars } from '../../src/app/curation'
import { CURRENT_PLAN_ID } from '../../src/lib/plan'
import { addToPlan, markCooked } from '../../src/app/plan'
import { makeRecipe } from '../../test/factories'

const feature = await loadFeature('features/cleanup.feature')

function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

async function recipeIds(): Promise<string[]> {
  return (await db.recipes.toArray()).map((r) => r.id).sort()
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the app starts with no recipes', async () => {
      await db.recipes.clear()
      await db.variantGroups.clear()
      await db.userData.clear()
      await db.cooked.clear()
      await db.plans.clear()
      expect(await db.recipes.count()).toBe(0)
    })
  })

  Scenario('Bulk-deleting removes the selected recipes for good', ({ Given, When, Then }) => {
    Given('the store holds recipes {string}', async (_, list: string) => {
      await db.recipes.bulkPut(ids(list).map((id) => makeRecipe({ id })))
    })
    When('I delete recipes {string}', async (_, list: string) => {
      await deleteRecipes(ids(list))
    })
    Then('the app holds recipes {string}', async (_, list: string) => {
      expect(await recipeIds()).toEqual(ids(list).sort())
    })
  })

  Scenario('Bulk delete cascades to a group, dissolving it below two members', ({ Given, And, When, Then }) => {
    Given('the store holds recipes {string}', async (_, list: string) => {
      await db.recipes.bulkPut(ids(list).map((id) => makeRecipe({ id })))
    })
    And('I have grouped recipes {string}', async (_, list: string) => {
      await createGroup(ids(list).map((id) => ({ recipeId: id, label: id })))
    })
    When('I delete recipes {string}', async (_, list: string) => {
      await deleteRecipes(ids(list))
    })
    Then('recipe {string} is in no group', async (_, id: string) => {
      expect(await groupForRecipe(id)).toBeUndefined()
    })
    And('there are no groups', async () => {
      expect(await db.variantGroups.count()).toBe(0)
    })
  })

  Scenario('Deleting a recipe purges its ratings, history and plan slot', ({ Given, And, When, Then }) => {
    Given('the store holds recipes {string}', async (_, list: string) => {
      await db.recipes.bulkPut(ids(list).map((id) => makeRecipe({ id })))
    })
    And('recipe {string} is rated {int} stars', async (_, id: string, n: number) => {
      await setStars(id, n as 1 | 2 | 3 | 4 | 5)
    })
    And('recipe {string} was cooked', async (_, id: string) => {
      await markCooked(id)
    })
    And('recipe {string} is in the plan', async (_, id: string) => {
      await addToPlan(id)
    })
    When('I delete recipes {string}', async (_, list: string) => {
      await deleteRecipes(ids(list))
    })
    Then('recipe {string} has no curation row', async (_, id: string) => {
      expect(await db.userData.get(id)).toBeUndefined()
    })
    And('recipe {string} has no cooked history', async (_, id: string) => {
      expect(await db.cooked.where('recipeId').equals(id).count()).toBe(0)
    })
    And('the plan does not contain {string}', async (_, id: string) => {
      const plan = await db.plans.get(CURRENT_PLAN_ID)
      expect(plan?.recipeIds ?? []).not.toContain(id)
    })
  })
})
