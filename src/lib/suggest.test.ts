import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SUGGEST_CONFIG,
  dueness,
  expectedInterval,
  scoreCandidate,
  suggestWeek,
  timeBand,
  type Candidate,
} from './suggest'

const cfg = DEFAULT_SUGGEST_CONFIG

// A fully-eligible candidate by default (★4, never cooked, unique-ish axes); override per test.
function cand(over: Partial<Candidate> & { id: string }): Candidate {
  return {
    stars: 4,
    cuisine: over.id + '-cuisine',
    prepTime: 30,
    ...over,
  }
}

const emptyAxes = () => ({ cuisines: new Set<string>(), proteins: new Set<string>(), bands: new Set<string>() })

describe('timeBand', () => {
  it('bands prep time into quick / medium / long', () => {
    expect(timeBand(10)).toBe('quick')
    expect(timeBand(25)).toBe('quick')
    expect(timeBand(26)).toBe('medium')
    expect(timeBand(45)).toBe('medium')
    expect(timeBand(60)).toBe('long')
  })
})

describe('expectedInterval', () => {
  it('shortens as rotation rises and defaults when unset', () => {
    expect(expectedInterval(5)).toBe(7)
    expect(expectedInterval(1)).toBe(112)
    expect(expectedInterval(undefined)).toBe(expectedInterval(cfg.defaultRotation))
  })
})

describe('dueness', () => {
  it('treats never-cooked as the cap', () => {
    expect(dueness(undefined, 3)).toBe(cfg.duenessCap)
  })

  it('rises with days since cooked, saturating at the cap', () => {
    expect(dueness(14, 3)).toBeCloseTo(0.5) // 14 / 28
    expect(dueness(28, 3)).toBeCloseTo(1)
    expect(dueness(9999, 3)).toBe(cfg.duenessCap)
  })

  it('is lower for a low-rotation recipe at the same recency', () => {
    // 28 days: due for a ◆3 (interval 28), barely warm for a ◆1 (interval 112).
    expect(dueness(28, 1)).toBeLessThan(dueness(28, 3))
  })
})

describe('scoreCandidate', () => {
  it('rewards higher stars', () => {
    const axes = emptyAxes()
    const five = scoreCandidate(cand({ id: 'a', stars: 5 }), axes)
    const three = scoreCandidate(cand({ id: 'a', stars: 3 }), axes)
    expect(five).toBeGreaterThan(three)
  })

  it('penalises a candidate that repeats a basket axis', () => {
    const fresh = emptyAxes()
    const seen = { cuisines: new Set(['italian']), proteins: new Set<string>(), bands: new Set<string>() }
    const c = cand({ id: 'a', cuisine: 'italian' })
    expect(scoreCandidate(c, seen)).toBeLessThan(scoreCandidate(c, fresh))
  })
})

describe('suggestWeek', () => {
  it('only suggests keepers (★ ≥ minStars)', () => {
    const candidates = [
      cand({ id: 'keep', stars: 3 }),
      cand({ id: 'bin', stars: 2 }),
      cand({ id: 'bin2', stars: 1 }),
    ]
    const out = suggestWeek({ candidates, count: 5, seed: 1 })
    expect(out.map((s) => s.id)).toEqual(['keep'])
  })

  it('never suggests a recipe inside the cooldown window', () => {
    const candidates = [
      cand({ id: 'recent', daysSinceCooked: 3 }),
      cand({ id: 'ok', daysSinceCooked: 30 }),
    ]
    const ids = suggestWeek({ candidates, count: 5, seed: 1 }).map((s) => s.id)
    expect(ids).toContain('ok')
    expect(ids).not.toContain('recent')
  })

  it('never picks two members of the same variant group', () => {
    const candidates = [
      cand({ id: 'g1a', groupId: 'g1', cuisine: 'a' }),
      cand({ id: 'g1b', groupId: 'g1', cuisine: 'b' }),
      cand({ id: 'g2', groupId: 'g2', cuisine: 'c' }),
      cand({ id: 'solo', cuisine: 'd' }),
    ]
    const ids = suggestWeek({ candidates, count: 4, seed: 7 }).map((s) => s.id)
    expect(ids.includes('g1a') && ids.includes('g1b')).toBe(false)
    expect(new Set(ids).size).toBe(ids.length) // no dupes
  })

  it('fills only the slots left after the basket', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => cand({ id: `c${i}`, cuisine: `q${i}` }))
    const basket = [{ id: 'planned', cuisine: 'x', prepTime: 30 }]
    const out = suggestWeek({ candidates, basket, count: 5, seed: 3 })
    expect(out).toHaveLength(4) // 5 target − 1 already planned
  })

  it('returns fewer than asked when the pool is too small (no repeats, no padding)', () => {
    const candidates = [cand({ id: 'a' }), cand({ id: 'b' })]
    const out = suggestWeek({ candidates, count: 5, seed: 9 })
    expect(out).toHaveLength(2)
  })

  it('excludes recipes already in the basket', () => {
    const candidates = [cand({ id: 'a' }), cand({ id: 'b' })]
    const basket = [{ id: 'a', cuisine: 'a-cuisine', prepTime: 30 }]
    const ids = suggestWeek({ candidates, basket, count: 5, seed: 2 }).map((s) => s.id)
    expect(ids).not.toContain('a')
  })

  it('is deterministic for a given seed', () => {
    const candidates = Array.from({ length: 12 }, (_, i) =>
      cand({ id: `c${i}`, stars: ((i % 3) + 3) as Candidate['stars'], cuisine: `cu${i % 4}`, prepTime: 20 + i }),
    )
    const a = suggestWeek({ candidates, count: 5, seed: 123 })
    const b = suggestWeek({ candidates, count: 5, seed: 123 })
    expect(a).toEqual(b)
  })

  it('spreads across the variety axes (greedy, forced argmax)', () => {
    // Force the single best pick each step (topK 1), so the only freedom is the variety penalty.
    const candidates = [
      cand({ id: 'A', cuisine: 'X' }),
      cand({ id: 'B', cuisine: 'X' }),
      cand({ id: 'C', cuisine: 'Y' }),
    ]
    const out = suggestWeek({ candidates, count: 2, seed: 1, config: { topK: 1 } })
    // First pick A (ties → first); then C beats B because B repeats cuisine X.
    expect(out.map((s) => s.id)).toEqual(['A', 'C'])
  })

  it('tags why each pick was made', () => {
    const candidates = [cand({ id: 'fav', stars: 5, cuisine: 'thai', mainProtein: 'pork' })]
    const [s] = suggestWeek({ candidates, count: 1, seed: 1 })
    expect(s.reasons).toContain('favourite')
    expect(s.reasons).toContain('new to you') // never cooked
    expect(s.reasons).toContain('new cuisine')
  })

  it('returns nothing when the basket already fills the week', () => {
    const candidates = [cand({ id: 'a' })]
    const basket = [
      { cuisine: 'a', prepTime: 30 },
      { cuisine: 'b', prepTime: 30 },
    ]
    expect(suggestWeek({ candidates, basket, count: 2, seed: 1 })).toEqual([])
  })
})
