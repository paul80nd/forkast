import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { applyRatingToGroup, clearCuration, setRotation, setStars } from '../../src/app/curation'
import { createGroup } from '../../src/app/groups'
import type { Rotation, Stars } from '../../src/schema/userData'

const feature = await loadFeature('features/curation.feature')

function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('no recipes have been rated', async () => {
      await db.userData.clear()
      await db.variantGroups.clear()
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
    When('I set the rotation on recipe {string} to {int}', async (_, id: string, r: number) => {
      await setRotation(id, r as Rotation)
    })
    Then('recipe {string} has rotation {int}', async (_, id: string, r: number) => {
      expect((await db.userData.get(id))?.rotation).toBe(r)
    })
  })

  Scenario('Stars and rotation live together on one recipe', ({ Given, When, Then, And }) => {
    Given('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
      await setStars(id, n as Stars)
    })
    When('I set the rotation on recipe {string} to {int}', async (_, id: string, r: number) => {
      await setRotation(id, r as Rotation)
    })
    Then('recipe {string} has {int} stars', async (_, id: string, n: number) => {
      expect((await db.userData.get(id))?.stars).toBe(n)
    })
    And('recipe {string} has rotation {int}', async (_, id: string, r: number) => {
      expect((await db.userData.get(id))?.rotation).toBe(r)
    })
  })

  Scenario('Clearing the rating keeps the row when it carries a rotation', ({ Given, And, When, Then, But }) => {
    Given('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
      await setStars(id, n as Stars)
    })
    And('I have set the rotation on recipe {string} to {int}', async (_, id: string, r: number) => {
      await setRotation(id, r as Rotation)
    })
    When('I clear the rating on recipe {string}', async (_, id: string) => {
      await setStars(id, undefined)
    })
    Then('recipe {string} has no stars', async (_, id: string) => {
      expect((await db.userData.get(id))?.stars).toBeUndefined()
    })
    But('recipe {string} has rotation {int}', async (_, id: string, r: number) => {
      expect((await db.userData.get(id))?.rotation).toBe(r)
    })
  })

  Scenario('Clearing the only rotation on a recipe removes its row', ({ Given, When, Then }) => {
    Given('I have set the rotation on recipe {string} to {int}', async (_, id: string, r: number) => {
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
    And('I have set the rotation on recipe {string} to {int}', async (_, id: string, r: number) => {
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

  Scenario(
    'Applying a rating across a variant group rates the unrated siblings',
    ({ Given, And, When, Then }) => {
      Given('recipes {string} are a variant group', async (_, list: string) => {
        await createGroup(ids(list).map((id) => ({ recipeId: id, label: id })))
      })
      And('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
        await setStars(id, n as Stars)
      })
      And('I have set the rotation on recipe {string} to {int}', async (_, id: string, r: number) => {
        await setRotation(id, r as Rotation)
      })
      When("I apply recipe {string}'s rating across its group", async (_, id: string) => {
        await applyRatingToGroup(id)
      })
      Then('recipe {string} has {int} stars', async (_, id: string, n: number) => {
        expect((await db.userData.get(id))?.stars).toBe(n)
      })
      And('recipe {string} has rotation {int}', async (_, id: string, r: number) => {
        expect((await db.userData.get(id))?.rotation).toBe(r)
      })
      And('recipe {string} has {int} stars', async (_, id: string, n: number) => {
        expect((await db.userData.get(id))?.stars).toBe(n)
      })
    },
  )

  Scenario(
    'Applying a rating across a group never overwrites an already-rated variant',
    ({ Given, And, When, Then }) => {
      Given('recipes {string} are a variant group', async (_, list: string) => {
        await createGroup(ids(list).map((id) => ({ recipeId: id, label: id })))
      })
      And('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
        await setStars(id, n as Stars)
      })
      And('recipe {string} already has {int} stars', async (_, id: string, n: number) => {
        await setStars(id, n as Stars)
      })
      When("I apply recipe {string}'s rating across its group", async (_, id: string) => {
        await applyRatingToGroup(id)
      })
      Then('recipe {string} has {int} stars', async (_, id: string, n: number) => {
        expect((await db.userData.get(id))?.stars).toBe(n)
      })
      And('recipe {string} has {int} stars', async (_, id: string, n: number) => {
        expect((await db.userData.get(id))?.stars).toBe(n)
      })
    },
  )

  Scenario(
    'Applying a rating from an ungrouped recipe changes nothing',
    ({ Given, When, Then, And }) => {
      Given('I have rated recipe {string} {int} stars', async (_, id: string, n: number) => {
        await setStars(id, n as Stars)
      })
      When("I apply recipe {string}'s rating across its group", async (_, id: string) => {
        await applyRatingToGroup(id)
      })
      Then('recipe {string} has {int} stars', async (_, id: string, n: number) => {
        expect((await db.userData.get(id))?.stars).toBe(n)
      })
      And('only {int} recipe is rated', async (_, n: number) => {
        expect(await db.userData.count()).toBe(n)
      })
    },
  )
})
