import { describe, it, expect } from 'vitest'
import { chooseKeeper, type KeeperInput } from './duplicates'

function m(over: Partial<KeeperInput> & { id: string }): KeeperInput {
  return { ingredientCount: 5, hasImage: true, ...over }
}

describe('chooseKeeper', () => {
  it('keeps the highest-rated member', () => {
    const id = chooseKeeper([m({ id: 'a', stars: 2 }), m({ id: 'b', stars: 5 }), m({ id: 'c' })])
    expect(id).toBe('b')
  })

  it('treats an unrated member as below any rated one', () => {
    expect(chooseKeeper([m({ id: 'a' }), m({ id: 'b', stars: 1 })])).toBe('b')
  })

  it('breaks a rating tie by the more complete record (more ingredients)', () => {
    const id = chooseKeeper([
      m({ id: 'a', stars: 4, ingredientCount: 6 }),
      m({ id: 'b', stars: 4, ingredientCount: 12 }),
    ])
    expect(id).toBe('b')
  })

  it('prefers a record with an image when rating and ingredients tie', () => {
    const id = chooseKeeper([
      m({ id: 'a', ingredientCount: 5, hasImage: false }),
      m({ id: 'b', ingredientCount: 5, hasImage: true }),
    ])
    expect(id).toBe('b')
  })

  it('is deterministic on a full tie (lowest id wins)', () => {
    const all = { stars: 3, ingredientCount: 5, hasImage: true }
    expect(chooseKeeper([{ id: 'z', ...all }, { id: 'a', ...all }])).toBe('a')
  })
})
