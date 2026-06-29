import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { importRecipeDataset } from '../../src/app/dataset'
import { resolveAsset } from '../../src/lib/assets'
import { makeRecipe } from '../../test/factories'

const feature = await loadFeature('features/recipe-images.feature')

describeFeature(feature, ({ Background, Scenario }) => {
  // Carries state between steps within a scenario.
  let resolved: string

  Background(({ Given }) => {
    Given('the app starts with no recipes', async () => {
      await db.recipes.clear()
      await db.settings.clear()
      expect(await db.recipes.count()).toBe(0)
    })
  })

  Scenario("An imported recipe's image resolves to the private-images route", ({ Given, When, Then }) => {
    Given('I import a recipe whose image is "beef-noodles.jpg"', async () => {
      await importRecipeDataset({
        version: 1,
        recipes: [makeRecipe({ id: 'beef-noodles', image: 'beef-noodles.jpg' })],
      })
    })
    When("I resolve that recipe's image URL", async () => {
      const recipe = await db.recipes.get('beef-noodles')
      resolved = resolveAsset(recipe!.image)
    })
    Then('the image URL is "/recipe-images/beef-noodles.jpg"', () => {
      expect(resolved).toBe('/recipe-images/beef-noodles.jpg')
    })
  })

  Scenario('A committed demo asset resolves against the app base', ({ When, Then }) => {
    When('I resolve the image reference "demo/images/orzo.svg"', () => {
      resolved = resolveAsset('demo/images/orzo.svg')
    })
    Then('the image URL is "/demo/images/orzo.svg"', () => {
      expect(resolved).toBe('/demo/images/orzo.svg')
    })
  })

  Scenario('An absolute image URL is left untouched', ({ When, Then }) => {
    When('I resolve the image reference "https://cdn.example/x.jpg"', () => {
      resolved = resolveAsset('https://cdn.example/x.jpg')
    })
    Then('the image URL is "https://cdn.example/x.jpg"', () => {
      expect(resolved).toBe('https://cdn.example/x.jpg')
    })
  })
})
