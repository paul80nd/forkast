import { describe, it, expect } from 'vitest'
import {
  addToOrder,
  renameInOrder,
  removeFromOrder,
  moveInOrder,
  orderedAisles,
} from './aisles'

describe('addToOrder', () => {
  it('appends a new aisle', () => {
    expect(addToOrder(['Produce', 'Dairy'], 'Deli')).toEqual(['Produce', 'Dairy', 'Deli'])
  })
  it('trims whitespace', () => {
    expect(addToOrder(['Produce'], '  Deli  ')).toEqual(['Produce', 'Deli'])
  })
  it('ignores blanks and returns the same reference (case-insensitive dup)', () => {
    const order = ['Produce', 'Dairy']
    expect(addToOrder(order, '')).toBe(order)
    expect(addToOrder(order, 'produce')).toBe(order)
  })
})

describe('renameInOrder', () => {
  it('renames in place, keeping position', () => {
    expect(renameInOrder(['Produce', 'Pantry', 'Frozen'], 'Pantry', 'Dry goods')).toEqual([
      'Produce',
      'Dry goods',
      'Frozen',
    ])
  })
  it('merges into an existing target, dropping the source slot', () => {
    expect(renameInOrder(['Produce', 'Pantry', 'Dry goods'], 'Pantry', 'Dry goods')).toEqual([
      'Produce',
      'Dry goods',
    ])
  })
  it('re-spells on a casing-only change', () => {
    expect(renameInOrder(['Produce', 'pantry'], 'pantry', 'Pantry')).toEqual(['Produce', 'Pantry'])
  })
  it('is a no-op for a blank target or an absent source', () => {
    const order = ['Produce', 'Pantry']
    expect(renameInOrder(order, 'Pantry', '  ')).toBe(order)
    expect(renameInOrder(order, 'Nope', 'Whatever')).toBe(order)
  })
})

describe('removeFromOrder', () => {
  it('removes case-insensitively', () => {
    expect(removeFromOrder(['Produce', 'Pantry'], 'pantry')).toEqual(['Produce'])
  })
})

describe('moveInOrder', () => {
  it('moves up and down', () => {
    expect(moveInOrder(['A', 'B', 'C'], 'B', -1)).toEqual(['B', 'A', 'C'])
    expect(moveInOrder(['A', 'B', 'C'], 'B', 1)).toEqual(['A', 'C', 'B'])
  })
  it('clamps at the ends', () => {
    expect(moveInOrder(['A', 'B'], 'A', -1)).toEqual(['A', 'B'])
    expect(moveInOrder(['A', 'B'], 'B', 1)).toEqual(['A', 'B'])
  })
})

describe('orderedAisles', () => {
  it('appends used aisles missing from the saved order', () => {
    expect(orderedAisles(['Produce', 'Dairy'], ['Dairy', 'Deli', 'Produce'])).toEqual([
      'Produce',
      'Dairy',
      'Deli',
    ])
  })
})
