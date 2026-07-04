import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { imagesDb } from '../../src/db/images'
import { putImages, getImageBlob, imageStats, clearImages } from '../../src/app/images'

const feature = await loadFeature('features/image-pack.feature')

// A data-table row: an image filename and its (text) content — identical content ⇒
// identical bytes ⇒ the same content hash, which is what the dedup scenario relies on.
type PackRow = { name: string; content: string }

const filesOf = (rows: PackRow[]) =>
  rows.map((r) => new File([r.content], r.name, { type: 'image/jpeg' }))

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('the image cache is empty', async () => {
      await clearImages()
      expect(await imagesDb.names.count()).toBe(0)
    })
  })

  Scenario("A stored image resolves by the recipe's filename", ({ When, Then }) => {
    When('I store an image pack:', async (_ctx, rows: PackRow[]) => {
      await putImages(filesOf(rows))
    })
    Then('the stored image for "beef-noodles.jpg" is "BEEF"', async () => {
      expect(await (await getImageBlob('beef-noodles.jpg'))!.text()).toBe('BEEF')
    })
  })

  Scenario('Variant photos with identical content are stored once', ({ When, Then, And }) => {
    When('I store an image pack:', async (_ctx, rows: PackRow[]) => {
      await putImages(filesOf(rows))
    })
    Then('the pack holds 2 names across 1 image', async () => {
      const stats = await imageStats()
      expect(stats.names).toBe(2)
      expect(stats.blobs).toBe(1)
    })
    And('the stored image for "chicken-korma.jpg" is "KORMA"', async () => {
      expect(await (await getImageBlob('chicken-korma.jpg'))!.text()).toBe('KORMA')
    })
    And('the stored image for "veg-korma.jpg" is "KORMA"', async () => {
      expect(await (await getImageBlob('veg-korma.jpg'))!.text()).toBe('KORMA')
    })
  })

  Scenario('With no pack, a recipe\'s image is not in the store', ({ Then }) => {
    Then('there is no stored image for "anything.jpg"', async () => {
      expect(await getImageBlob('anything.jpg')).toBeUndefined()
    })
  })

  Scenario('Clearing the pack removes every stored image', ({ Given, When, Then, And }) => {
    Given('I store an image pack:', async (_ctx, rows: PackRow[]) => {
      await putImages(filesOf(rows))
    })
    When('I clear the image pack', async () => {
      await clearImages()
    })
    Then('the pack holds 0 names across 0 images', async () => {
      expect(await imageStats()).toEqual({ names: 0, blobs: 0, bytes: 0 })
    })
    And('there is no stored image for "a.jpg"', async () => {
      expect(await getImageBlob('a.jpg')).toBeUndefined()
    })
  })
})
