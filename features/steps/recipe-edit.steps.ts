import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { updateRecipeDetails } from '../../src/app/recipeEdit'
import { makeRecipe } from '../../test/factories'

const feature = await loadFeature('features/recipe-edit.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => {
    Given('the app starts with no recipes', async () => {
      await db.recipes.clear()
      await db.userData.clear()
      expect(await db.recipes.count()).toBe(0)
    })
    And('the store holds recipe {string}', async (_, id: string) => {
      await db.recipes.put(makeRecipe({ id }))
    })
  })

  Scenario('Editing the title and description persists', ({ When, Then, And }) => {
    When(
      'I edit recipe {string} with title {string} and description {string}',
      async (_, id: string, title: string, description: string) => {
        await updateRecipeDetails(id, { title, description })
      },
    )
    Then('recipe {string} has title {string}', async (_, id: string, title: string) => {
      expect((await db.recipes.get(id))?.title).toBe(title)
    })
    And('recipe {string} has description {string}', async (_, id: string, description: string) => {
      expect((await db.recipes.get(id))?.description).toBe(description)
    })
  })

  Scenario('Setting a card number', ({ When, Then }) => {
    When('I edit recipe {string} with card number {string}', async (_, id: string, code: string) => {
      await updateRecipeDetails(id, { recipeCode: code })
    })
    Then('recipe {string} has card number {string}', async (_, id: string, code: string) => {
      expect((await db.recipes.get(id))?.recipeCode).toBe(code)
    })
  })

  Scenario('A blank card number clears it', ({ Given, When, Then }) => {
    Given('recipe {string} has card number {string}', async (_, id: string, code: string) => {
      await updateRecipeDetails(id, { recipeCode: code })
    })
    When('I edit recipe {string} with card number {string}', async (_, id: string, code: string) => {
      await updateRecipeDetails(id, { recipeCode: code })
    })
    Then('recipe {string} has no card number', async (_, id: string) => {
      expect((await db.recipes.get(id))?.recipeCode).toBeUndefined()
    })
  })

  Scenario('A blank title is rejected and the existing title is kept', ({ When, Then }) => {
    When('I edit recipe {string} with title {string}', async (_, id: string, title: string) => {
      await updateRecipeDetails(id, { title })
    })
    Then('recipe {string} has title {string}', async (_, id: string, title: string) => {
      expect((await db.recipes.get(id))?.title).toBe(title)
    })
  })
})
