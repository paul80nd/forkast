import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importRecipeDataset } from '../../src/app/dataset'
import { exportBackup, importBackup } from '../../src/app/backup'
import { setStars } from '../../src/lib/curation'
import { addToPlan } from '../../src/lib/plan'
import { createGroup } from '../../src/app/groups'
import { deleteRecipe } from '../../src/app/cleanup'
import { makeRecipes } from '../../test/factories'
import type { BackupSnapshot } from '../../src/schema/userData'

const feature = await loadFeature('features/backup.feature')

// Wipe every table so each scenario starts clean.
async function resetStore(): Promise<void> {
  await Promise.all([
    db.recipes.clear(),
    db.userData.clear(),
    db.cooked.clear(),
    db.plans.clear(),
    db.shopping.clear(),
    db.variantGroups.clear(),
    db.settings.clear(),
  ])
}

// A stable, order-independent view of a snapshot's data for "restored exactly" asserts.
// exportedAt is excluded — we re-export with the saved timestamp so the only thing that
// can differ is the table contents.
function dataOf(s: BackupSnapshot) {
  const byKey = (arr: unknown[]) =>
    [...arr].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  return {
    recipes: byKey(s.recipes),
    userData: byKey(s.userData),
    cooked: byKey(s.cooked),
    plans: byKey(s.plans),
    shopping: byKey(s.shopping),
    variantGroups: byKey(s.variantGroups),
    settings: byKey(s.settings),
  }
}

describeFeature(feature, ({ Background, Scenario }) => {
  let saved: BackupSnapshot
  let deletedId: string

  Background(({ Given }) => {
    Given('the app starts with no data', async () => {
      await resetStore()
      expect(await db.recipes.count()).toBe(0)
    })
  })

  async function buildCollection(): Promise<void> {
    await importRecipeDataset({ version: 1, recipes: makeRecipes(3) })
    await setStars('r1', 5)
    await addToPlan('r2')
    await createGroup([
      { recipeId: 'r1', label: 'A' },
      { recipeId: 'r3', label: 'B' },
    ])
  }

  Scenario('A backup round-trips the whole collection', ({ Given, When, And, Then }) => {
    Given('a curated collection of 3 recipes with a star, a plan and a group', buildCollection)
    When('I save a backup', async () => {
      saved = await exportBackup('2026-06-29T12:00:00.000Z')
    })
    And('I wipe all data', resetStore)
    And('I open that backup', async () => {
      await importBackup(saved)
    })
    Then('the collection is restored exactly', async () => {
      const after = await exportBackup(saved.exportedAt)
      expect(dataOf(after)).toEqual(dataOf(saved))
    })
  })

  Scenario('Opening a backup replaces the current data', ({ Given, And, When, Then }) => {
    Given('a curated collection of 3 recipes with a star, a plan and a group', buildCollection)
    And('I have saved a backup', async () => {
      saved = await exportBackup('2026-06-29T12:00:00.000Z')
    })
    When('I import a different dataset of 2 recipes', async () => {
      await importRecipeDataset({ version: 1, recipes: makeRecipes(2) }, 'replace')
    })
    And('I open that backup', async () => {
      await importBackup(saved)
    })
    Then('the collection is restored exactly', async () => {
      const after = await exportBackup(saved.exportedAt)
      expect(dataOf(after)).toEqual(dataOf(saved))
    })
  })

  Scenario('A restore preserves an in-app deletion', ({ Given, When, And, Then }) => {
    Given('a curated collection of 3 recipes with a star, a plan and a group', buildCollection)
    When('I delete one recipe', async () => {
      deletedId = 'r2'
      await deleteRecipe(deletedId)
    })
    And('I save a backup', async () => {
      saved = await exportBackup('2026-06-29T12:00:00.000Z')
    })
    And('I wipe all data', resetStore)
    And('I open that backup', async () => {
      await importBackup(saved)
    })
    Then('the app holds 2 recipes', async () => {
      expect(await db.recipes.count()).toBe(2)
    })
    And('the deleted recipe is still gone', async () => {
      expect(await db.recipes.get(deletedId)).toBeUndefined()
    })
  })
})
