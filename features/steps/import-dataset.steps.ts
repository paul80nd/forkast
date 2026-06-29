import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importRecipeDataset, type ImportResult } from '../../src/app/dataset'
import { seedDemoIfEmpty } from '../../src/db/seed'
import { makeRecipes } from '../../test/factories'

const feature = await loadFeature('features/import-dataset.feature')

// Reset the in-memory store so each scenario starts from a clean slate.
async function resetStore(): Promise<void> {
  await db.recipes.clear()
  await db.settings.clear()
  await db.userData.clear()
}

async function dataSource(): Promise<unknown> {
  return (await db.settings.get('dataSource'))?.value
}

describeFeature(feature, ({ Background, Scenario }) => {
  // Last import's result, so Then-steps can assert on skipped/errors.
  let lastImport: ImportResult

  Background(({ Given }) => {
    // Runs before every scenario: clear the in-memory store so each starts clean.
    Given('the app starts with no recipes', async () => {
      await resetStore()
      expect(await db.recipes.count()).toBe(0)
    })
  })

  Scenario('Importing a valid dataset loads every recipe', ({ When, Then, And }) => {
    When('I import a dataset of 3 valid recipes', async () => {
      lastImport = await importRecipeDataset({ version: 1, recipes: makeRecipes(3) })
    })
    Then('the app holds 3 recipes', async () => {
      expect(await db.recipes.count()).toBe(3)
    })
    And('the data source is marked as user-owned', async () => {
      expect(await dataSource()).toBe('user')
    })
  })

  Scenario('My imported data survives the first-run demo seed', ({ Given, When, Then, And }) => {
    Given('I have imported a dataset of 3 valid recipes', async () => {
      await importRecipeDataset({ version: 1, recipes: makeRecipes(3) })
    })
    When('the app runs its first-run demo seed', async () => {
      // dataSource==='user' must make this a no-op (it never reaches the demo fetch).
      await seedDemoIfEmpty()
    })
    Then('the app still holds 3 recipes', async () => {
      expect(await db.recipes.count()).toBe(3)
    })
    And('the data source is marked as user-owned', async () => {
      expect(await dataSource()).toBe('user')
    })
  })

  Scenario('A malformed recipe is skipped, not fatal', ({ When, Then, And }) => {
    When('I import a dataset of 3 recipes where 1 is missing its title', async () => {
      const recipes: unknown[] = [...makeRecipes(2), { id: 'bad', slug: 'bad', ingredients: [] }]
      lastImport = await importRecipeDataset({ version: 1, recipes })
    })
    Then('the app holds 2 recipes', async () => {
      expect(await db.recipes.count()).toBe(2)
    })
    And('the import reports 1 skipped recipe', () => {
      expect(lastImport.skipped).toBe(1)
      expect(lastImport.errors).toHaveLength(1)
    })
  })

  Scenario('Importing replaces any previously loaded recipes', ({ Given, When, Then }) => {
    Given('I have imported a dataset of 3 valid recipes', async () => {
      await importRecipeDataset({ version: 1, recipes: makeRecipes(3) })
    })
    When('I import a dataset of 2 valid recipes', async () => {
      lastImport = await importRecipeDataset({ version: 1, recipes: makeRecipes(2) })
    })
    Then('the app holds 2 recipes', async () => {
      expect(await db.recipes.count()).toBe(2)
    })
  })
})
