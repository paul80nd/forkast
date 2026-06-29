import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { setStars } from '../../src/lib/curation'
import type { Stars } from '../../src/schema/userData'

const feature = await loadFeature('features/curation.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('no recipes have been rated', async () => {
      await db.userData.clear()
      expect(await db.userData.count()).toBe(0)
    })
  })

  Scenario('Rating a recipe stores its stars', ({ When, Then }) => {
    When('I rate recipe {string} 5 stars', async (_, id: string) => {
      await setStars(id, 5)
    })
    Then('recipe {string} has 5 stars', async (_, id: string) => {
      expect((await db.userData.get(id))?.stars).toBe(5)
    })
  })

  Scenario('Re-rating a recipe replaces the previous stars', ({ Given, When, Then }) => {
    Given('I have rated recipe {string} 3 stars', async (_, id: string) => {
      await setStars(id, 3)
    })
    When('I rate recipe {string} 1 star', async (_, id: string) => {
      await setStars(id, 1)
    })
    Then('recipe {string} has 1 star', async (_, id: string) => {
      expect((await db.userData.get(id))?.stars).toBe(1)
    })
  })

  Scenario('Clearing the only rating on a recipe removes its row', ({ Given, When, Then }) => {
    Given('I have rated recipe {string} 4 stars', async (_, id: string) => {
      await setStars(id, 4)
    })
    When('I clear the rating on recipe {string}', async (_, id: string) => {
      await setStars(id, undefined)
    })
    Then('recipe {string} has no curation row', async (_, id: string) => {
      expect(await db.userData.get(id)).toBeUndefined()
    })
  })

  Scenario('Clearing a rating keeps the row when it carries notes', ({ Given, When, Then, But }) => {
    Given(
      'recipe {string} is rated 4 stars and has a note {string}',
      async (_, id: string, note: string) => {
        await db.userData.put({ recipeId: id, stars: 4 as Stars, notes: note })
      },
    )
    When('I clear the rating on recipe {string}', async (_, id: string) => {
      await setStars(id, undefined)
    })
    Then('recipe {string} has no stars', async (_, id: string) => {
      expect((await db.userData.get(id))?.stars).toBeUndefined()
    })
    But('recipe {string} still has the note {string}', async (_, id: string, note: string) => {
      expect((await db.userData.get(id))?.notes).toBe(note)
    })
  })
})
