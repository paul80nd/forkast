import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { createGroup, groupForRecipe, seeAlsoFor } from '../../src/app/groups'
import { deleteRecipe } from '../../src/app/cleanup'
import { makeRecipe } from '../../test/factories'

const feature = await loadFeature('features/recipe-groups.feature')

function ids(list: string): string[] {
  return list.split(',').map((s) => s.trim()).filter(Boolean)
}

/** Group the given recipes, seeding recipe rows first so deletes are realistic. */
async function group(list: string): Promise<void> {
  const members = ids(list)
  await db.recipes.bulkPut(members.map((id) => makeRecipe({ id })))
  await createGroup(members.map((id) => ({ recipeId: id, label: id })))
}

/** The sibling ids of a recipe within its group (excluding itself), sorted. */
async function siblings(recipeId: string): Promise<string[]> {
  const g = await groupForRecipe(recipeId)
  return (g?.members ?? [])
    .map((m) => m.recipeId)
    .filter((id) => id !== recipeId)
    .sort()
}

describeFeature(feature, ({ Background, Scenario }) => {
  let rejected = false

  Background(({ Given }) => {
    Given('no recipes are grouped', async () => {
      await db.variantGroups.clear()
      await db.recipes.clear()
      await db.userData.clear()
      rejected = false
      expect(await db.variantGroups.count()).toBe(0)
    })
  })

  Scenario('Grouping recipes links them symmetrically', ({ When, Then, And }) => {
    When('I group recipes {string}', async (_, list: string) => {
      await group(list)
    })
    Then('recipe {string} is grouped with {string}', async (_, id: string, others: string) => {
      expect(await siblings(id)).toEqual(ids(others).sort())
    })
    And('recipe {string} is grouped with {string}', async (_, id: string, others: string) => {
      expect(await siblings(id)).toEqual(ids(others).sort())
    })
  })

  Scenario('A recipe belongs to at most one group', ({ Given, When, Then, And }) => {
    Given('I have grouped recipes {string}', async (_, list: string) => {
      await group(list)
    })
    When('I group recipes {string}', async (_, list: string) => {
      await group(list)
    })
    Then('recipe {string} is grouped with {string}', async (_, id: string, others: string) => {
      expect(await siblings(id)).toEqual(ids(others).sort())
    })
    And('recipe {string} is in no group', async (_, id: string) => {
      expect(await groupForRecipe(id)).toBeUndefined()
    })
  })

  Scenario('A recipe\'s "see also" lists its sibling variants with titles', ({ Given, Then, And }) => {
    Given('I have grouped recipes {string}', async (_, list: string) => {
      await group(list)
    })
    Then('the see-also for {string} lists {string}', async (_, id: string, others: string) => {
      const items = await seeAlsoFor(id)
      expect(items.map((s) => s.recipeId).sort()).toEqual(ids(others).sort())
    })
    And('the see-also for {string} shows {string} titled {string}', async (_, id: string, sibId: string, title: string) => {
      const items = await seeAlsoFor(id)
      expect(items.find((s) => s.recipeId === sibId)?.title).toBe(title)
    })
  })

  Scenario('An ungrouped recipe has no "see also"', ({ Given, Then }) => {
    Given('I have grouped recipes {string}', async (_, list: string) => {
      await group(list)
    })
    Then('the see-also for {string} is empty', async (_, id: string) => {
      expect(await seeAlsoFor(id)).toEqual([])
    })
  })

  Scenario('A group needs at least two members', ({ When, Then, And }) => {
    When('I try to group recipes {string}', async (_, list: string) => {
      try {
        await group(list)
      } catch {
        rejected = true
      }
    })
    Then('the grouping is rejected', () => {
      expect(rejected).toBe(true)
    })
    And('there are no groups', async () => {
      expect(await db.variantGroups.count()).toBe(0)
    })
  })

  Scenario('Deleting a grouped recipe removes it from its group', ({ Given, When, Then, And }) => {
    Given('I have grouped recipes {string}', async (_, list: string) => {
      await group(list)
    })
    When('I delete recipe {string}', async (_, id: string) => {
      await deleteRecipe(id)
    })
    Then('recipe {string} is grouped with {string}', async (_, id: string, others: string) => {
      expect(await siblings(id)).toEqual(ids(others).sort())
    })
    And('recipe {string} is in no group', async (_, id: string) => {
      expect(await groupForRecipe(id)).toBeUndefined()
    })
  })

  Scenario('Deleting a recipe that would leave one member dissolves the group', ({ Given, When, Then, And }) => {
    Given('I have grouped recipes {string}', async (_, list: string) => {
      await group(list)
    })
    When('I delete recipe {string}', async (_, id: string) => {
      await deleteRecipe(id)
    })
    Then('recipe {string} is in no group', async (_, id: string) => {
      expect(await groupForRecipe(id)).toBeUndefined()
    })
    And('there are no groups', async () => {
      expect(await db.variantGroups.count()).toBe(0)
    })
  })
})
