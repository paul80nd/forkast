import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { clearCuration, setRotation, setStars } from '../../src/app/curation'
import type { Rotation, Stars } from '../../src/schema/userData'

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

  Scenario('Setting a rotation stores it', ({ When, Then }) => {
    When('I set the rotation on recipe {string} to {string}', async (_, id: string, r: string) => {
      await setRotation(id, r as Rotation)
    })
    Then('recipe {string} has rotation {string}', async (_, id: string, r: string) => {
      expect((await db.userData.get(id))?.rotation).toBe(r)
    })
  })

  Scenario('Stars and rotation live together on one recipe', ({ Given, When, Then, And }) => {
    Given('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
      await setStars(id, n as Stars)
    })
    When('I set the rotation on recipe {string} to {string}', async (_, id: string, r: string) => {
      await setRotation(id, r as Rotation)
    })
    Then('recipe {string} has {int} stars', async (_, id: string, n: number) => {
      expect((await db.userData.get(id))?.stars).toBe(n)
    })
    And('recipe {string} has rotation {string}', async (_, id: string, r: string) => {
      expect((await db.userData.get(id))?.rotation).toBe(r)
    })
  })

  Scenario('Clearing the rating keeps the row when it carries a rotation', ({ Given, And, When, Then, But }) => {
    Given('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
      await setStars(id, n as Stars)
    })
    And('I have set the rotation on recipe {string} to {string}', async (_, id: string, r: string) => {
      await setRotation(id, r as Rotation)
    })
    When('I clear the rating on recipe {string}', async (_, id: string) => {
      await setStars(id, undefined)
    })
    Then('recipe {string} has no stars', async (_, id: string) => {
      expect((await db.userData.get(id))?.stars).toBeUndefined()
    })
    But('recipe {string} has rotation {string}', async (_, id: string, r: string) => {
      expect((await db.userData.get(id))?.rotation).toBe(r)
    })
  })

  Scenario('Clearing the only rotation on a recipe removes its row', ({ Given, When, Then }) => {
    Given('I have set the rotation on recipe {string} to {string}', async (_, id: string, r: string) => {
      await setRotation(id, r as Rotation)
    })
    When('I clear the rotation on recipe {string}', async (_, id: string) => {
      await setRotation(id, undefined)
    })
    Then('recipe {string} has no curation row', async (_, id: string) => {
      expect(await db.userData.get(id)).toBeUndefined()
    })
  })

  Scenario('Clearing curation removes both stars and rotation at once', ({ Given, And, When, Then }) => {
    Given('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
      await setStars(id, n as Stars)
    })
    And('I have set the rotation on recipe {string} to {string}', async (_, id: string, r: string) => {
      await setRotation(id, r as Rotation)
    })
    When('I clear the curation on recipe {string}', async (_, id: string) => {
      await clearCuration(id)
    })
    Then('recipe {string} has no curation row', async (_, id: string) => {
      expect(await db.userData.get(id)).toBeUndefined()
    })
  })

  Scenario('Clearing curation keeps the row when it carries a note', ({ Given, When, Then, But }) => {
    Given(
      'recipe {string} is rated 4 stars and has a note {string}',
      async (_, id: string, note: string) => {
        await db.userData.put({ recipeId: id, stars: 4 as Stars, notes: note })
      },
    )
    When('I clear the curation on recipe {string}', async (_, id: string) => {
      await clearCuration(id)
    })
    Then('recipe {string} has no stars', async (_, id: string) => {
      expect((await db.userData.get(id))?.stars).toBeUndefined()
    })
    But('recipe {string} still has the note {string}', async (_, id: string, note: string) => {
      expect((await db.userData.get(id))?.notes).toBe(note)
    })
  })
})
