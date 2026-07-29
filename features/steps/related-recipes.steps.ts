import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { setStars } from '../../src/app/curation'
import { setVariantOverride } from '../../src/app/variants'
import { getRelatedRecipes, type RelatedRecipes } from '../../src/app/relatedRecipes'
import { makeRecipe } from '../../test/factories'
import type { Stars } from '../../src/schema/userData'

const feature = await loadFeature('features/related-recipes.feature')

const cell = (csv: string | undefined) =>
  (csv ?? '').split(',').map((s) => s.trim()).filter(Boolean)

interface Row {
  id: string
  cuisine: string
  ingredients: string
  stars: string
  allergens?: string
}

describeFeature(feature, ({ Background, Scenario }) => {
  let related: RelatedRecipes

  Background(({ Given }) => {
    Given('a clean collection', async () => {
      await Promise.all([db.recipes.clear(), db.userData.clear(), db.variantOverrides.clear()])
    })
  })

  // Shared steps (re-registered per Scenario block by vitest-cucumber).
  const load = async (_: unknown, rows: Row[]) => {
    for (const r of rows) {
      await db.recipes.put(
        makeRecipe({
          id: r.id,
          cuisine: r.cuisine,
          ingredients: cell(r.ingredients).map((name) => ({ rawLabel: name, name })),
          allergens: cell(r.allergens),
        }),
      )
      if (r.stars) await setStars(r.id, Number(r.stars) as Stars)
    }
  }
  const group = async (_: unknown, list: string) => {
    const ids = cell(list)
    await setVariantOverride(ids, ids[0])
  }
  const look = async (_: unknown, id: string) => {
    related = await getRelatedRecipes(id)
  }
  const listIds = (which: 'similar' | 'different') => related[which].map((r) => r.recipe.id)
  const areInOrder = (_: unknown, which: 'similar' | 'different', list: string) => {
    expect(listIds(which)).toEqual(cell(list))
  }
  const includes = (_: unknown, which: 'similar' | 'different', list: string) => {
    for (const id of cell(list)) expect(listIds(which)).toContain(id)
  }
  const excludes = (_: unknown, which: 'similar' | 'different', list: string) => {
    for (const id of cell(list)) expect(listIds(which)).not.toContain(id)
  }

  Scenario('More like this ranks recipes sharing ingredients and cuisine first', ({ Given, When, Then }) => {
    Given('the collection has:', load)
    When('I look at related recipes for {string}', look)
    Then('the {string} recipes are {string} in that order', areInOrder)
  })

  Scenario('Something different offers keepers unlike the anchor, never binned or unrated', ({ Given, When, Then, And }) => {
    Given('the collection has:', load)
    When('I look at related recipes for {string}', look)
    Then('the {string} recipes include {string}', includes)
    And('the {string} recipes exclude {string}', excludes)
  })

  Scenario('A recipe\'s own variant siblings never appear as related', ({ Given, And, When, Then }) => {
    Given('the collection has:', load)
    And('recipes {string} are a variant group', group)
    When('I look at related recipes for {string}', look)
    Then('the {string} recipes exclude {string}', excludes)
    And('the {string} recipes exclude {string}', excludes)
  })

  Scenario('A no-go recipe never appears as related', ({ Given, When, Then }) => {
    Given('the collection has:', load)
    When('I look at related recipes for {string}', look)
    Then('the {string} recipes exclude {string}', excludes)
  })
})
