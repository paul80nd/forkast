import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { relabelRecipes } from '../../src/app/tags'
import { labelUsage, type LabelKind } from '../../src/lib/tags'
import { makeRecipe } from '../../test/factories'

const feature = await loadFeature('features/tag-manager.feature')

type Row = { id: string; tags: string; allergens: string }
const cell = (csv: string) => csv.split(',').map((s) => s.trim()).filter(Boolean)

async function countFor(kind: LabelKind, value: string): Promise<number> {
  const recipes = await db.recipes.toArray()
  return (
    labelUsage(recipes, kind).find((u) => u.value.toLowerCase() === value.toLowerCase())?.count ?? 0
  )
}

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the collection has:', async (_ctx, rows: Row[]) => {
      await db.recipes.clear()
      await db.recipes.bulkPut(
        rows.map((r) => makeRecipe({ id: r.id, tags: cell(r.tags), allergens: cell(r.allergens) })),
      )
    })
  })

  Scenario('Renaming a tag rewrites every recipe that carries it', ({ When, Then, And }) => {
    When('I rename the tag {string} to {string}', async (_, from: string, to: string) => {
      await relabelRecipes('tags', [from], to)
    })
    Then('tag {string} is used by {int} recipes', async (_, value: string, n: number) => {
      expect(await countFor('tags', value)).toBe(n)
    })
    And('tag {string} is used by {int} recipes', async (_, value: string, n: number) => {
      expect(await countFor('tags', value)).toBe(n)
    })
  })

  Scenario('Merging two spellings collapses them into one', ({ When, Then, And }) => {
    When('I merge the tags {string} into {string}', async (_, csv: string, to: string) => {
      await relabelRecipes('tags', cell(csv), to)
    })
    Then('tag {string} is used by {int} recipes', async (_, value: string, n: number) => {
      expect(await countFor('tags', value)).toBe(n)
    })
    And('tag {string} is used by {int} recipes', async (_, value: string, n: number) => {
      expect(await countFor('tags', value)).toBe(n)
    })
  })

  Scenario('Deleting a tag removes it from every recipe', ({ When, Then }) => {
    When('I delete the tag {string}', async (_, value: string) => {
      await relabelRecipes('tags', [value], '')
    })
    Then('tag {string} is used by {int} recipes', async (_, value: string, n: number) => {
      expect(await countFor('tags', value)).toBe(n)
    })
  })

  Scenario('Allergens are managed the same way', ({ When, Then, And }) => {
    When('I merge the allergens {string} into {string}', async (_, csv: string, to: string) => {
      await relabelRecipes('allergens', cell(csv), to)
    })
    Then('allergen {string} is used by {int} recipes', async (_, value: string, n: number) => {
      expect(await countFor('allergens', value)).toBe(n)
    })
    And('allergen {string} is used by {int} recipes', async (_, value: string, n: number) => {
      expect(await countFor('allergens', value)).toBe(n)
    })
  })
})
