import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { makeRecipe } from '../../test/factories'
import {
  dishForRecipe,
  nextVariantAfterDelete,
  setVariantOverride,
  removeFromOverride,
  dissolveOverride,
  getOverrides,
} from '../../src/app/variants'
import { deleteRecipe } from '../../src/app/cleanup'

const feature = await loadFeature('features/variants.feature')

const ids = (csv: string) => csv.split(',').map((s) => s.trim())

async function seed() {
  await db.variantOverrides.clear()
  await db.recipes.clear()
}

/** Seed an import-seeded dish: variants sharing a key, one flagged lead. */
async function seedDish(members: string[], lead: string, key: string) {
  await db.recipes.bulkPut(
    members.map((id) =>
      makeRecipe({ id, variantGroupKey: key, variantGroupLead: id === lead || undefined }),
    ),
  )
}

/** Assert a recipe's effective dish has exactly these members (any order) and this lead. */
async function expectDish(recipeId: string, members: string[], lead: string) {
  const dish = await dishForRecipe(recipeId)
  expect(dish).not.toBeNull()
  expect(new Set(dish!.variants.map((v) => v.id))).toEqual(new Set(members))
  expect(dish!.lead.id).toBe(lead)
}

async function background(Given: any, And: any) {
  Given(
    'an imported dish {string} with variants {string} led by {string}',
    async (_: unknown, key: string, csv: string, lead: string) => {
      await seed()
      await seedDish(ids(csv), lead, key)
    },
  )
  And('a standalone recipe {string}', async (_: unknown, id: string) => {
    await db.recipes.put(makeRecipe({ id }))
  })
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given, And }) => background(Given, And))

  Scenario('With no overrides the dish follows the import grouping', ({ Then }) => {
    Then('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })

  Scenario('Confirming a set with a chosen lead overrides the grouping', ({ When, Then }) => {
    When('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    Then('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })

  Scenario('A recipe belongs to at most one override', ({ Given, When, Then, And }) => {
    Given('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    When('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    Then('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
    And('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })

  Scenario('Merging an outside recipe into a dish', ({ When, Then }) => {
    When('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    Then('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })

  Scenario('Removing a member detaches it and keeps the rest grouped', ({ Given, When, Then, And }) => {
    Given('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    When('I remove {string} from that dish', async (_, id: string) => {
      const o = (await getOverrides()).find((ov) => ov.recipeIds.includes(id))!
      await removeFromOverride(o.id, id)
    })
    Then('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
    And('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })

  Scenario('Deleting a member removes it from the dish and the collection', ({ Given, When, Then, And }) => {
    Given('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    When('I delete recipe {string}', async (_, id: string) => {
      await deleteRecipe(id)
    })
    Then('recipe {string} no longer exists', async (_, id: string) => {
      expect(await db.recipes.get(id)).toBeUndefined()
    })
    And('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })

  Scenario('Deleting the lead promotes a remaining member to lead', ({ Given, When, Then, And }) => {
    Given('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    When('I delete recipe {string}', async (_, id: string) => {
      await deleteRecipe(id)
    })
    Then('recipe {string} no longer exists', async (_, id: string) => {
      expect(await db.recipes.get(id)).toBeUndefined()
    })
    And('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })

  Scenario('Deleting a variant lands on the dish\'s next member', ({ Given, Then, And }) => {
    Given('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    Then('deleting {string} would next show {string}', async (_, id: string, next: string) => {
      expect(await nextVariantAfterDelete(id)).toBe(next)
    })
    And('deleting {string} would next show {string}', async (_, id: string, next: string) => {
      expect(await nextVariantAfterDelete(id)).toBe(next)
    })
  })

  Scenario('Deleting the final variant falls back to Browse', ({ Given, When, Then, And }) => {
    Given('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    When('I delete recipe {string}', async (_, id: string) => {
      await deleteRecipe(id)
    })
    And('I delete recipe {string}', async (_, id: string) => {
      await deleteRecipe(id)
    })
    Then('deleting {string} would next show Browse', async (_, id: string) => {
      expect(await nextVariantAfterDelete(id)).toBeNull()
    })
    And('deleting {string} would next show Browse', async (_, id: string) => {
      expect(await nextVariantAfterDelete(id)).toBeNull()
    })
  })

  Scenario('Dissolving an override reverts to the import grouping', ({ Given, When, Then }) => {
    Given('I set a variant override for {string} led by {string}', async (_, m, l) => {
      await setVariantOverride(ids(m), l)
    })
    When('I dissolve that dish', async () => {
      const o = (await getOverrides())[0]
      await dissolveOverride(o.id)
    })
    Then('the dish for {string} has members {string} led by {string}', async (_, id, m, l) => {
      await expectDish(id, ids(m), l)
    })
  })
})
