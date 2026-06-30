// Pure "suggest a varied week" scorer — no Dexie, no I/O. Given an eligible candidate pool and
// what's already in the basket (planned + locked meals), it greedily fills the remaining slots,
// balancing quality (★), dueness (recency folded with rotation), and a dynamic variety penalty
// over cuisine / protein / time-band. Selection is weighted-random over the leading candidates,
// seeded so it's deterministic for tests but fresh per run in the UI.
//
// Design + rationale: docs/plan-suggest-spec.md. The Dexie reads that assemble candidates and
// the writes that accept a suggestion live in src/app/.

/** Frequency → expected days between cooks. Lower rotation ⇒ longer interval ⇒ stays suppressed. */
export type RotationLevel = 1 | 2 | 3 | 4 | 5

export interface SuggestConfig {
  /** Minimum ★ to be eligible (the keeper pool). */
  minStars: number
  /** Hard cooldown: a recipe cooked fewer than this many days ago is never suggested. */
  cooldownDays: number
  /** Expected days between cooks, by rotation level. */
  expectedInterval: Record<RotationLevel, number>
  /** Rotation assumed when a recipe has none set. */
  defaultRotation: RotationLevel
  /** Dueness saturates here — "overdue" doesn't keep growing, and never-cooked sits at this cap. */
  duenessCap: number
  /** prepTime (min) band thresholds: ≤quickMax quick, ≤mediumMax medium, else long. */
  timeBands: { quickMax: number; mediumMax: number }
  weights: {
    /** Per ★ step above ★2 (so ★3→1, ★4→2, ★5→3). */
    quality: number
    /** Multiplies dueness (0…duenessCap). */
    dueness: number
    /** Subtracted per variety axis (cuisine/protein/band) already represented in the basket. */
    penaltyPerAxis: number
  }
  /** Softmax temperature for weighted-random selection — lower ⇒ closer to always-best. */
  temperature: number
  /** Sample only among this many top-scoring candidates each pick. */
  topK: number
}

// First-guess tuning (see spec → "Tuning starting points"). One place to turn the dials.
export const DEFAULT_SUGGEST_CONFIG: SuggestConfig = {
  minStars: 3,
  cooldownDays: 7,
  expectedInterval: { 5: 7, 4: 14, 3: 28, 2: 56, 1: 112 },
  defaultRotation: 3,
  duenessCap: 2,
  timeBands: { quickMax: 25, mediumMax: 45 },
  weights: { quality: 1, dueness: 1.5, penaltyPerAxis: 1 },
  temperature: 0.6,
  topK: 8,
}

/** A protein-less recipe buckets here, so two of them count as sharing the protein axis. */
const OTHER_PROTEIN = 'other'

export interface Candidate {
  id: string
  /** ★ rating (1–5); eligibility re-checks ≥ minStars. */
  stars: number
  rotation?: number
  cuisine: string
  mainProtein?: string
  prepTime: number
  /** Whole days since last cooked; undefined = never cooked. */
  daysSinceCooked?: number
  /** Variant group id, if any — a group is only ever represented once in a week. */
  groupId?: string
}

/** A meal already committed to the week (planned or locked) — contributes to the variety axes. */
export interface BasketItem {
  id?: string
  cuisine: string
  mainProtein?: string
  prepTime: number
  groupId?: string
}

export interface Suggestion {
  id: string
  score: number
  /** Short "why it was picked" tags for the UI (e.g. ["favourite", "new cuisine"]). */
  reasons: string[]
}

/** The variety axes currently represented in the basket (presence sets). */
interface Axes {
  cuisines: Set<string>
  proteins: Set<string>
  bands: Set<string>
}

/** Quick / medium / long band for a prep time. */
export function timeBand(prepTime: number, cfg: SuggestConfig = DEFAULT_SUGGEST_CONFIG): string {
  if (prepTime <= cfg.timeBands.quickMax) return 'quick'
  if (prepTime <= cfg.timeBands.mediumMax) return 'medium'
  return 'long'
}

/** Expected days between cooks for a rotation level (defaulting when unset). */
export function expectedInterval(
  rotation: number | undefined,
  cfg: SuggestConfig = DEFAULT_SUGGEST_CONFIG,
): number {
  const r = (rotation ?? cfg.defaultRotation) as RotationLevel
  return cfg.expectedInterval[r] ?? cfg.expectedInterval[cfg.defaultRotation]
}

/** How "due" a recipe is: daysSince / expectedInterval, saturating at the cap; never-cooked = cap. */
export function dueness(
  daysSinceCooked: number | undefined,
  rotation: number | undefined,
  cfg: SuggestConfig = DEFAULT_SUGGEST_CONFIG,
): number {
  if (daysSinceCooked === undefined) return cfg.duenessCap
  return Math.min(cfg.duenessCap, daysSinceCooked / expectedInterval(rotation, cfg))
}

/** A candidate's score against the basket's current variety axes (higher = more wanted). */
export function scoreCandidate(
  c: Candidate,
  axes: Axes,
  cfg: SuggestConfig = DEFAULT_SUGGEST_CONFIG,
): number {
  const quality = c.stars - 2 // ★3→1, ★4→2, ★5→3
  const due = dueness(c.daysSinceCooked, c.rotation, cfg)
  let penalty = 0
  if (axes.cuisines.has(c.cuisine)) penalty++
  if (axes.proteins.has(c.mainProtein ?? OTHER_PROTEIN)) penalty++
  if (axes.bands.has(timeBand(c.prepTime, cfg))) penalty++
  return cfg.weights.quality * quality + cfg.weights.dueness * due - cfg.weights.penaltyPerAxis * penalty
}

function eligible(c: Candidate, cfg: SuggestConfig): boolean {
  if (c.stars < cfg.minStars) return false
  if (c.daysSinceCooked !== undefined && c.daysSinceCooked < cfg.cooldownDays) return false
  return true
}

function reasonsFor(c: Candidate, axesBefore: Axes, cfg: SuggestConfig): string[] {
  const out: string[] = []
  if (c.stars >= 5) out.push('favourite')
  else if (c.stars >= 4) out.push('liked')
  if (c.daysSinceCooked === undefined) out.push('new to you')
  else if (dueness(c.daysSinceCooked, c.rotation, cfg) >= 1) out.push('due')
  if (!axesBefore.cuisines.has(c.cuisine)) out.push('new cuisine')
  if (!axesBefore.proteins.has(c.mainProtein ?? OTHER_PROTEIN)) out.push('new protein')
  return out
}

/** Small deterministic PRNG (mulberry32) — seeded so a run is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Weighted-random pick among the top-K scorers via a numerically-stable softmax. */
function pickWeighted(
  scored: { c: Candidate; score: number }[],
  rng: () => number,
  cfg: SuggestConfig,
): { c: Candidate; score: number } {
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, cfg.topK)
  const maxScore = top[0].score
  const weights = top.map((s) => Math.exp((s.score - maxScore) / cfg.temperature))
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = rng() * total
  for (let i = 0; i < top.length; i++) {
    r -= weights[i]
    if (r <= 0) return top[i]
  }
  return top[top.length - 1]
}

export interface SuggestParams {
  /** The pool to choose from (caller pre-filters no-go proteins and already-planned recipes). */
  candidates: Candidate[]
  /** Meals already on the plan / locked — seed the variety axes and block their groups. */
  basket?: BasketItem[]
  /** Target total meals for the week; the basket counts toward it. */
  count: number
  /** Seed for the weighted-random selection (fixed in tests, fresh per UI run). */
  seed: number
  config?: Partial<SuggestConfig>
}

/**
 * Suggest the meals to fill a week. Returns the **newly chosen** candidates in pick order
 * (the basket is not echoed back). Stops early — returning fewer than asked — when the eligible
 * pool runs out, rather than repeating a recipe or padding with a represented variant group.
 */
export function suggestWeek({ candidates, basket = [], count, seed, config }: SuggestParams): Suggestion[] {
  const cfg: SuggestConfig = {
    ...DEFAULT_SUGGEST_CONFIG,
    ...config,
    expectedInterval: { ...DEFAULT_SUGGEST_CONFIG.expectedInterval, ...config?.expectedInterval },
    timeBands: { ...DEFAULT_SUGGEST_CONFIG.timeBands, ...config?.timeBands },
    weights: { ...DEFAULT_SUGGEST_CONFIG.weights, ...config?.weights },
  }
  const need = Math.max(0, count - basket.length)
  if (need === 0) return []

  const rng = mulberry32(seed)

  // Seed the variety axes and the taken sets from the basket.
  const axes: Axes = { cuisines: new Set(), proteins: new Set(), bands: new Set() }
  const usedGroups = new Set<string>()
  const usedIds = new Set<string>()
  for (const b of basket) {
    axes.cuisines.add(b.cuisine)
    axes.proteins.add(b.mainProtein ?? OTHER_PROTEIN)
    axes.bands.add(timeBand(b.prepTime, cfg))
    if (b.groupId) usedGroups.add(b.groupId)
    if (b.id) usedIds.add(b.id)
  }

  const pool = candidates.filter((c) => eligible(c, cfg))
  const picked: Suggestion[] = []

  for (let i = 0; i < need; i++) {
    const available = pool.filter(
      (c) => !usedIds.has(c.id) && !(c.groupId && usedGroups.has(c.groupId)),
    )
    if (available.length === 0) break

    const scored = available.map((c) => ({ c, score: scoreCandidate(c, axes, cfg) }))
    const { c, score } = pickWeighted(scored, rng, cfg)

    picked.push({ id: c.id, score, reasons: reasonsFor(c, axes, cfg) })

    // Commit the pick: it now constrains variety and blocks its id + group.
    axes.cuisines.add(c.cuisine)
    axes.proteins.add(c.mainProtein ?? OTHER_PROTEIN)
    axes.bands.add(timeBand(c.prepTime, cfg))
    usedIds.add(c.id)
    if (c.groupId) usedGroups.add(c.groupId)
  }

  return picked
}
