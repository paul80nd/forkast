import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect, vi } from 'vitest'
import { db } from '../../src/db/db'
import { seedDemoIfEmpty } from '../../src/db/seed'
import { makeRecipes } from '../../test/factories'

const feature = await loadFeature('features/seed-demo.feature')

// Stand in for the network fetch of public/demo/recipes.json, so the seed runs
// its real Dexie write path without a dev server.
function stubDemoFetch(count: number): void {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    json: async () => ({ version: 1, recipes: makeRecipes(count) }),
  }))
}

async function dataSource(): Promise<unknown> {
  return (await db.settings.get('dataSource'))?.value
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the store is completely empty', async () => {
      vi.unstubAllGlobals()
      await db.recipes.clear()
      await db.settings.clear()
      expect(await db.recipes.count()).toBe(0)
    })
  })

  Scenario('First run on an empty store seeds the demo recipes', ({ Given, When, Then, And }) => {
    Given('the bundled demo dataset has {int} recipes', (_, count: number) => {
      stubDemoFetch(count)
    })
    When('the app runs its first-run seed', async () => {
      await seedDemoIfEmpty()
    })
    Then('the app holds {int} recipes', async (_, count: number) => {
      expect(await db.recipes.count()).toBe(count)
    })
    And('the data source is marked as demo', async () => {
      expect(await dataSource()).toBe('demo')
    })
  })

  Scenario('A newer demo version refreshes existing demo data', ({ Given, And, When, Then }) => {
    Given('the store holds demo data from an older version', async () => {
      await db.recipes.bulkPut(makeRecipes(1))
      await db.settings.put({ key: 'dataSource', value: 'demo' })
      // Any version other than the current DEMO_VERSION triggers a refresh.
      await db.settings.put({ key: 'demoVersion', value: 0 })
    })
    And('the bundled demo dataset has {int} recipes', (_, count: number) => {
      stubDemoFetch(count)
    })
    When('the app runs its first-run seed', async () => {
      await seedDemoIfEmpty()
    })
    Then('the app holds {int} recipes', async (_, count: number) => {
      expect(await db.recipes.count()).toBe(count)
    })
    And('the data source is marked as demo', async () => {
      expect(await dataSource()).toBe('demo')
    })
  })
})
