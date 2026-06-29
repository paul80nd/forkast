import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import {
  addToPlan,
  removeFromPlan,
  setPortions,
  markCooked,
  CURRENT_PLAN_ID,
} from '../../src/lib/plan'

const feature = await loadFeature('features/plan-week.feature')

async function plan() {
  return db.plans.get(CURRENT_PLAN_ID)
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the current plan is empty', async () => {
      await db.plans.clear()
      await db.cooked.clear()
      expect(await db.plans.count()).toBe(0)
    })
  })

  Scenario('Adding a recipe puts it on the plan', ({ When, Then, And }) => {
    When('I add recipe {string} to the plan', async (_, id: string) => {
      await addToPlan(id)
    })
    Then('the plan contains {string}', async (_, id: string) => {
      expect((await plan())?.recipeIds).toContain(id)
    })
    And('the plan caters for {int}', async (_, portions: number) => {
      expect((await plan())?.portions).toBe(portions)
    })
  })

  Scenario('Adding the same recipe twice keeps a single copy', ({ Given, When, Then }) => {
    Given('I have added recipe {string} to the plan', async (_, id: string) => {
      await addToPlan(id)
    })
    When('I add recipe {string} to the plan', async (_, id: string) => {
      await addToPlan(id)
    })
    Then('the plan contains {string} exactly once', async (_, id: string) => {
      const ids = (await plan())?.recipeIds ?? []
      expect(ids.filter((x) => x === id)).toHaveLength(1)
    })
  })

  Scenario('Removing a recipe takes it off the plan', ({ Given, When, Then }) => {
    Given('I have added recipe {string} to the plan', async (_, id: string) => {
      await addToPlan(id)
    })
    When('I remove recipe {string} from the plan', async (_, id: string) => {
      await removeFromPlan(id)
    })
    Then('the plan does not contain {string}', async (_, id: string) => {
      expect((await plan())?.recipeIds ?? []).not.toContain(id)
    })
  })

  Scenario('Changing the portions scales the whole plan', ({ When, Then }) => {
    When('I set the plan to cater for {int}', async (_, portions: number) => {
      await setPortions(portions)
    })
    Then('the plan caters for {int}', async (_, portions: number) => {
      expect((await plan())?.portions).toBe(portions)
    })
  })

  Scenario('Marking a recipe cooked records history and clears it from the plan', ({ Given, When, Then, And }) => {
    Given('I have added recipe {string} to the plan', async (_, id: string) => {
      await addToPlan(id)
    })
    When('I mark recipe {string} as cooked', async (_, id: string) => {
      await markCooked(id)
    })
    Then('the cooked history holds {int} entry for {string}', async (_, n: number, id: string) => {
      expect(await db.cooked.where('recipeId').equals(id).count()).toBe(n)
    })
    And('the plan does not contain {string}', async (_, id: string) => {
      expect((await plan())?.recipeIds ?? []).not.toContain(id)
    })
  })
})
