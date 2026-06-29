import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { suggestDuplicateCandidates } from '../../src/app/duplicates'
import { deleteRecipes } from '../../src/app/cleanup'
import { createGroup } from '../../src/app/groups'
import { setStars } from '../../src/lib/curation'
import { chooseKeeper } from '../../src/lib/duplicates'
import { makeRecipe } from '../../test/factories'
import type { Recipe } from '../../src/schema/recipe'
import type { CandidateCluster } from '../../src/lib/similarity'

const feature = await loadFeature('features/duplicates.feature')

async function resetStore(): Promise<void> {
  await Promise.all([
    db.recipes.clear(),
    db.variantGroups.clear(),
    db.userData.clear(),
  ])
}

const ings = (names: string[]) => names.map((name) => ({ rawLabel: name, name }))

// Two near-identical recipes: same title words, same ingredients — a true duplicate.
function dupe(id: string): Recipe {
  return makeRecipe({
    id,
    title: 'Kung Pao Chicken Burger with Sweet Potato Chips',
    ingredients: ings(['chicken', 'burger bun', 'sweet potato', 'peanuts', 'soy sauce']),
  })
}

// Same dish with the protein swapped — a variant, not a duplicate (title + a line differ).
function variant(id: string, protein: string): Recipe {
  return makeRecipe({
    id,
    title: `Kung Pao ${protein} Burger with Sweet Potato Chips`,
    ingredients: ings([protein.toLowerCase(), 'burger bun', 'sweet potato', 'peanuts', 'soy sauce']),
  })
}

describeFeature(feature, ({ Background, Scenario }) => {
  let clusters: CandidateCluster[]

  Background(({ Given }) => {
    Given('the app starts with no recipes', async () => {
      await resetStore()
      expect(await db.recipes.count()).toBe(0)
    })
  })

  Scenario('Near-identical recipes are flagged as duplicates', ({ Given, When, Then, And }) => {
    Given('a duplicate pair and an unrelated recipe are loaded', async () => {
      await db.recipes.bulkPut([
        dupe('d1'),
        dupe('d2'),
        makeRecipe({ id: 'pizza', title: 'Margherita Pizza', ingredients: ings(['pizza base', 'mozzarella', 'tomato', 'basil']) }),
      ])
    })
    When('I scan for duplicates', async () => {
      clusters = await suggestDuplicateCandidates()
    })
    Then('one duplicate cluster is suggested', () => {
      expect(clusters).toHaveLength(1)
    })
    And('it holds the duplicate pair', () => {
      expect([...clusters[0].recipeIds].sort()).toEqual(['d1', 'd2'])
    })
  })

  Scenario('A protein swap is not a duplicate', ({ Given, When, Then }) => {
    Given('a chicken version and a beef version of the same dish are loaded', async () => {
      await db.recipes.bulkPut([variant('v1', 'Chicken'), variant('v2', 'Beef')])
    })
    When('I scan for duplicates', async () => {
      clusters = await suggestDuplicateCandidates()
    })
    Then('no duplicates are suggested', () => {
      expect(clusters).toEqual([])
    })
  })

  Scenario('Recipes already in a group are left out', ({ Given, And, When, Then }) => {
    Given('a duplicate pair are loaded', async () => {
      await db.recipes.bulkPut([dupe('d1'), dupe('d2')])
    })
    And('the pair are linked in a variant group', async () => {
      await createGroup([
        { recipeId: 'd1', label: 'A' },
        { recipeId: 'd2', label: 'B' },
      ])
    })
    When('I scan for duplicates', async () => {
      clusters = await suggestDuplicateCandidates()
    })
    Then('no duplicates are suggested', () => {
      expect(clusters).toEqual([])
    })
  })

  Scenario('Deleting the spares keeps the chosen one', ({ Given, And, When, Then }) => {
    let keeperId: string

    Given('a duplicate pair are loaded', async () => {
      await db.recipes.bulkPut([dupe('d1'), dupe('d2')])
    })
    And('I have rated one of them 5 stars', async () => {
      await setStars('d1', 5)
    })
    When('I scan for duplicates', async () => {
      clusters = await suggestDuplicateCandidates()
      expect(clusters).toHaveLength(1)
    })
    And('I delete every member except the keeper', async () => {
      const ids = clusters[0].recipeIds
      const stars = new Map((await db.userData.toArray()).map((u) => [u.recipeId, u.stars]))
      const recipes = new Map((await db.recipes.bulkGet(ids)).map((r) => [r!.id, r!]))
      keeperId = chooseKeeper(
        ids.map((id) => ({
          id,
          stars: stars.get(id),
          ingredientCount: recipes.get(id)!.ingredients.length,
          hasImage: Boolean(recipes.get(id)!.image),
        })),
      )
      await deleteRecipes(ids.filter((id) => id !== keeperId))
    })
    Then('only the kept recipe remains', async () => {
      expect(keeperId).toBe('d1') // the 5★ one
      expect(await db.recipes.count()).toBe(1)
      expect(await db.recipes.get('d1')).toBeDefined()
    })
  })
})
