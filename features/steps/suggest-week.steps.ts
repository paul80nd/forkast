import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { CURRENT_PLAN_ID, todayISO } from '../../src/lib/plan'
import { addToPlan, addRecipesToPlan } from '../../src/app/plan'
import { setStars } from '../../src/app/curation'
import { createGroup } from '../../src/app/groups'
import { suggestWeekPlan } from '../../src/app/suggest'
import { makeRecipe } from '../../test/factories'
import type { Stars } from '../../src/schema/userData'
import type { Suggestion } from '../../src/lib/suggest'

const feature = await loadFeature('features/suggest-week.feature')

function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

describeFeature(feature, ({ Background, Scenario }) => {
  // Fixed seed so the weighted-random selection is reproducible across runs.
  const SEED = 1
  let suggestions: Suggestion[] = []

  Background(({ Given }) => {
    Given('a clean collection', async () => {
      await Promise.all([
        db.recipes.clear(),
        db.userData.clear(),
        db.cooked.clear(),
        db.variantGroups.clear(),
        db.plans.clear(),
      ])
      suggestions = []
    })
  })

  // Steps shared across scenarios — vitest-cucumber re-registers per Scenario block.
  const rateList = async (_: unknown, list: string, n: number) => {
    for (const id of ids(list)) {
      await db.recipes.put(makeRecipe({ id }))
      await setStars(id, n as Stars)
    }
  }
  const groupStep = async (_: unknown, list: string) => {
    await createGroup(ids(list).map((id) => ({ recipeId: id, label: id })))
  }
  const suggestStep = async (_: unknown, count: number) => {
    suggestions = await suggestWeekPlan({ count, seed: SEED })
  }
  const exactly = (_: unknown, list: string) => {
    expect(suggestions.map((s) => s.id).sort()).toEqual(ids(list).sort())
  }
  const planContains = async (_: unknown, id: string) => {
    expect((await db.plans.get(CURRENT_PLAN_ID))?.recipeIds).toContain(id)
  }

  Scenario('Only keepers (★3+) are suggested', ({ Given, And, When, Then }) => {
    Given('recipes {string} rated {int} stars', rateList)
    And('recipes {string} rated {int} stars', rateList)
    And('recipe {string} is unrated', async (_, id: string) => {
      await db.recipes.put(makeRecipe({ id }))
    })
    When('I suggest a week of {int}', suggestStep)
    Then('the suggestions are exactly {string}', exactly)
  })

  Scenario('A no-go recipe is never suggested', ({ Given, And, When, Then }) => {
    Given('recipes {string} rated {int} stars', rateList)
    And(
      'recipe {string} rated {int} stars with allergen {string}',
      async (_, id: string, n: number, allergen: string) => {
        await db.recipes.put(makeRecipe({ id, allergens: [allergen] }))
        await setStars(id, n as Stars)
      },
    )
    When('I suggest a week of {int}', suggestStep)
    Then('the suggestions are exactly {string}', exactly)
  })

  Scenario('Already-planned recipes are excluded and only remaining slots filled', ({ Given, And, When, Then }) => {
    Given('recipes {string} rated {int} stars', rateList)
    And('recipe {string} is on the plan', async (_, id: string) => {
      await addToPlan(id)
    })
    When('I suggest a week of {int}', suggestStep)
    Then('the suggestions are exactly {string}', exactly)
  })

  Scenario('A recently-cooked recipe is not suggested', ({ Given, And, When, Then }) => {
    Given('recipes {string} rated {int} stars', rateList)
    And('recipe {string} was cooked today', async (_, id: string) => {
      await db.cooked.add({ recipeId: id, date: todayISO() })
    })
    When('I suggest a week of {int}', suggestStep)
    Then('the suggestions are exactly {string}', exactly)
  })

  Scenario('Only one member of a variant group is suggested', ({ Given, And, When, Then }) => {
    Given('recipes {string} rated {int} stars', rateList)
    And('recipes {string} rated {int} stars', rateList)
    And('recipes {string} are a variant group', groupStep)
    When('I suggest a week of {int}', suggestStep)
    Then('the suggestions are exactly {string}', exactly)
  })

  Scenario('Accepting the suggestions adds them to the plan', ({ Given, When, And, Then }) => {
    Given('recipes {string} rated {int} stars', rateList)
    When('I suggest a week of {int}', suggestStep)
    And('I accept the suggestions', async () => {
      await addRecipesToPlan(suggestions.map((s) => s.id))
    })
    Then('the plan contains {string}', planContains)
    And('the plan contains {string}', planContains)
  })
})
