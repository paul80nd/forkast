import { describe, it, expect } from 'vitest'
import { parseBackup } from './backup'
import type { BackupSnapshot } from '../schema/userData'

function makeSnapshot(over: Partial<BackupSnapshot> = {}): BackupSnapshot {
  return {
    version: 3,
    exportedAt: '2026-06-29T12:00:00.000Z',
    recipes: [
      {
        id: 'r1',
        slug: 'r1',
        title: 'Recipe r1',
        description: '',
        image: 'r1.jpg',
        cuisine: 'Test',
        tags: [],
        allergens: [],
        prepTime: 10,
        ingredients: [{ rawLabel: 'Salt (5g)', name: 'salt', qty: 5, unit: 'g' }],
        basics: [],
        instructions: [{ order: 1, text: 'Cook it.' }],
        serves: 2,
      },
    ],
    userData: [{ recipeId: 'r1', stars: 5 }],
    cooked: [{ id: 1, recipeId: 'r1', date: '2026-06-01' }],
    plans: [{ id: 'current', portions: 2, recipeIds: ['r1'] }],
    shopping: [{ id: 'current', checked: [], extras: [] }],
    variantGroups: [],
    dictionary: [{ id: 'lime', name: 'lime', plural: 'limes', aisle: 'Produce', purchaseUnit: 'each' }],
    bindings: [{ name: 'lime', ingredientId: 'lime' }],
    settings: [{ key: 'dataSource', value: 'user' }],
    ...over,
  }
}

describe('parseBackup', () => {
  it('round-trips a well-formed snapshot', () => {
    const snap = makeSnapshot()
    const { snapshot, warnings } = parseBackup(snap)
    expect(warnings).toEqual([])
    expect(snapshot).toEqual(snap)
  })

  it('accepts the JSON text form', () => {
    const { snapshot } = parseBackup(JSON.stringify(makeSnapshot()))
    expect(snapshot.recipes).toHaveLength(1)
    expect(snapshot.userData[0].stars).toBe(5)
  })

  it('rejects a wrong version', () => {
    expect(() => parseBackup({ ...makeSnapshot(), version: 1 })).toThrow(/version/)
  })

  it('rejects a file with no recipes array', () => {
    expect(() => parseBackup({ version: 2, exportedAt: '' })).toThrow(/recipes/)
  })

  it('rejects non-JSON text', () => {
    expect(() => parseBackup('{ not json')).toThrow(/JSON/)
  })

  it('accepts a legacy v2 file, defaulting the dictionary + bindings to empty', () => {
    const { snapshot } = parseBackup({ version: 2, recipes: [] })
    expect(snapshot.version).toBe(3)
    expect(snapshot.userData).toEqual([])
    expect(snapshot.cooked).toEqual([])
    expect(snapshot.plans).toEqual([])
    expect(snapshot.shopping).toEqual([])
    expect(snapshot.variantGroups).toEqual([])
    expect(snapshot.dictionary).toEqual([])
    expect(snapshot.bindings).toEqual([])
    expect(snapshot.settings).toEqual([])
  })

  it('drops a malformed recipe with a warning, keeping the rest', () => {
    const snap = makeSnapshot()
    const { snapshot, warnings } = parseBackup({
      ...snap,
      recipes: [...snap.recipes, { id: 'bad', slug: 'bad', ingredients: [] }],
    })
    expect(snapshot.recipes).toHaveLength(1)
    expect(warnings[0]).toMatch(/1 recipe/)
  })

  it('drops settings rows without a string key', () => {
    const { snapshot } = parseBackup({
      version: 2,
      recipes: [],
      settings: [{ key: 'ok', value: 1 }, { value: 'no key' }, 'junk'],
    })
    expect(snapshot.settings).toEqual([{ key: 'ok', value: 1 }])
  })
})
