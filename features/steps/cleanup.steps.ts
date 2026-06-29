import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { createGroup, groupForRecipe } from '../../src/app/groups'
import { deleteRecipes } from '../../src/app/cleanup'
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
})
