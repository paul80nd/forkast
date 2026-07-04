import { beforeEach, describe, expect, it } from 'vitest'
import { putImages, getImageBlob, imageStats, clearImages } from './images'
import { imagesDb } from '../db/images'

// Build a File with given text content, so identical text ⇒ identical bytes ⇒ same hash.
const file = (name: string, content: string) =>
  new File([content], name, { type: 'image/jpeg' })

async function text(blob: Blob | undefined): Promise<string | undefined> {
  return blob ? await blob.text() : undefined
}

describe('image pack cache', () => {
  beforeEach(async () => {
    await imagesDb.names.clear()
    await imagesDb.blobs.clear()
  })

  it('round-trips a stored image by filename', async () => {
    await putImages([file('beef-noodles.jpg', 'BEEF')])
    expect(await text(await getImageBlob('beef-noodles.jpg'))).toBe('BEEF')
  })

  it('returns undefined for a filename not in the pack', async () => {
    await putImages([file('a.jpg', 'A')])
    expect(await getImageBlob('missing.jpg')).toBeUndefined()
  })

  it('stores identical content once but maps every filename to it', async () => {
    // Two variant filenames sharing one hero image — the dedup case.
    await putImages([file('chicken-korma.jpg', 'KORMA'), file('veg-korma.jpg', 'KORMA')])

    const stats = await imageStats()
    expect(stats.names).toBe(2)
    expect(stats.blobs).toBe(1) // deduped to a single blob
    expect(stats.bytes).toBe('KORMA'.length)

    // Both filenames still resolve to the shared content.
    expect(await text(await getImageBlob('chicken-korma.jpg'))).toBe('KORMA')
    expect(await text(await getImageBlob('veg-korma.jpg'))).toBe('KORMA')
  })

  it('overwrites a filename whose content changed, dropping to the new blob', async () => {
    await putImages([file('a.jpg', 'OLD')])
    await putImages([file('a.jpg', 'NEW')])
    expect(await text(await getImageBlob('a.jpg'))).toBe('NEW')
    expect((await imageStats()).names).toBe(1)
  })

  it('reports progress once per file', async () => {
    const calls: [number, number][] = []
    await putImages([file('a.jpg', 'A'), file('b.jpg', 'B')], (done, total) =>
      calls.push([done, total]),
    )
    expect(calls).toEqual([
      [1, 2],
      [2, 2],
    ])
  })

  it('clears the whole cache', async () => {
    await putImages([file('a.jpg', 'A'), file('b.jpg', 'B')])
    await clearImages()
    expect(await imageStats()).toEqual({ names: 0, blobs: 0, bytes: 0 })
    expect(await getImageBlob('a.jpg')).toBeUndefined()
  })
})
