import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importRecipeDataset } from '../../src/app/dataset'
import { setStars } from '../../src/app/curation'
import { makeRecipe } from '../../test/factories'

const feature = await loadFeature('features/additive-import.feature')

/** Parse a "r1, r2, r3" step argument into ids. */
function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

/** A dataset wrapper of valid recipes with the given ids. */
function dataset(list: string) {
  return { version: 1, recipes: ids(list).map((id) => makeRecipe({ id })) }
}

async function recipeIds(): Promise<string[]> {
  return (await db.recipes.toArray()).map((r) => r.id).sort()
}

async function dataSource(): Promise<unknown> {
  return (await db.settings.get('dataSource'))?.value
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the app starts with no recipes', async () => {
      await db.recipes.clear()
      await db.settings.clear()
      await db.userData.clear()
      expect(await db.recipes.count()).toBe(0)
    })
  })

  Scenario("Additive import keeps recipes the file doesn't mention", ({ Given, When, Then }) => {
    Given('I have imported recipes {string}', async (_, list: string) => {
      await importRecipeDataset(dataset(list), 'replace')
    })
    When('I additively import recipes {string}', async (_, list: string) => {
      await importRecipeDataset(dataset(list), 'additive')
    })
    Then('the app holds recipes {string}', async (_, list: string) => {
      expect(await recipeIds()).toEqual(ids(list).sort())
    })
  })

  Scenario('Additive import refreshes an existing recipe in place', ({ Given, When, Then, And }) => {
    Given('I have imported a recipe {string} titled {string}', async (_, id: string, title: string) => {
      await importRecipeDataset({ version: 1, recipes: [makeRecipe({ id, title })] }, 'replace')
    })
    When('I additively import a recipe {string} titled {string}', async (_, id: string, title: string) => {
      await importRecipeDataset({ version: 1, recipes: [makeRecipe({ id, title })] }, 'additive')
    })
    Then('recipe {string} is titled {string}', async (_, id: string, title: string) => {
      expect((await db.recipes.get(id))?.title).toBe(title)
    })
    And('the app holds {int} recipe', async (_, n: number) => {
      expect(await db.recipes.count()).toBe(n)
    })
  })

  Scenario('Additive import leaves my stars untouched', ({ Given, And, When, Then }) => {
    Given('I have imported recipes {string}', async (_, list: string) => {
      await importRecipeDataset(dataset(list), 'replace')
    })
    And('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
      await setStars(id, n as 1 | 2 | 3 | 4 | 5)
    })
    When('I additively import recipes {string}', async (_, list: string) => {
      await importRecipeDataset(dataset(list), 'additive')
    })
    Then('recipe {string} still has {int} stars', async (_, id: string, n: number) => {
      expect((await db.userData.get(id))?.stars).toBe(n)
    })
    And('the app holds recipes {string}', async (_, list: string) => {
      expect(await recipeIds()).toEqual(ids(list).sort())
    })
  })

  Scenario('A first import over the demo set does not keep demo recipes', ({ Given, When, Then, And }) => {
    Given('the store holds demo recipes {string}', async (_, list: string) => {
      await db.recipes.bulkPut(ids(list).map((id) => makeRecipe({ id })))
      await db.settings.put({ key: 'dataSource', value: 'demo' })
    })
    When('I additively import recipes {string}', async (_, list: string) => {
      await importRecipeDataset(dataset(list), 'additive')
    })
    Then('the app holds recipes {string}', async (_, list: string) => {
      expect(await recipeIds()).toEqual(ids(list).sort())
    })
    And('the data source is marked as user-owned', async () => {
      expect(await dataSource()).toBe('user')
    })
  })
})
