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
    /**
     * Subtracted **per basket meal** that shares a variety axis (cuisine/protein/band). Counts,
     * not presence — a third Italian is penalised more than a second, so the suggester leans
     * harder away from an axis the more of it is already planned.
     */
    penaltyPerAxis: number
  }
  /** Softmax temperature for weighted-random selection — lower ⇒ closer to always-best. */
  temperature: number
  /** Sample only among this many top-scoring candidates each pick. */
  topK: number
  /**
   * Max random score wobble added to each candidate each pick, in ★-step units, drawn from the
   * run's seeded rng. Breaks the many score **ties** (never-cooked recipes all sit at the dueness
   * cap; ★ is coarse) so the top-K window is a fresh draw from the tied mass each run rather than
   * always the same array-order head — the difference between "re-suggest rotates through the
   * collection" and "it keeps proposing the same handful". Keep it below one ★ step so it reorders
   * near-ties without overriding a genuine quality/dueness gap. Deterministic per seed; 0 disables.
   */
  explorationJitter: number
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
  temperature: 0.85,
  topK: 16,
  explorationJitter: 0.35,
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

/** The variety axes in the basket, counted — how many meals so far carry each value. */
interface Axes {
  cuisines: Map<string, number>
  proteins: Map<string, number>
  bands: Map<string, number>
}

/** Record one more basket meal carrying `key` on an axis. */
function bump(axis: Map<string, number>, key: string): void {
  axis.set(key, (axis.get(key) ?? 0) + 1)
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
  // Count every basket meal sharing an axis value (not mere presence), so an over-represented
  // cuisine/protein/band is pushed down harder each time it recurs.
  const penalty =
    (axes.cuisines.get(c.cuisine) ?? 0) +
    (axes.proteins.get(c.mainProtein ?? OTHER_PROTEIN) ?? 0) +
    (axes.bands.get(timeBand(c.prepTime, cfg)) ?? 0)
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

/**
 * Weighted-random pick among the top-K candidates via a numerically-stable softmax. Windowing and
 * softmax run on `rank` (the score plus this run's exploration jitter) so ties rotate; the picked
 * item still carries its true intrinsic `score`.
 */
function pickWeighted(
  scored: { c: Candidate; score: number; rank: number }[],
  rng: () => number,
  cfg: SuggestConfig,
): { c: Candidate; score: number } {
  const top = [...scored].sort((a, b) => b.rank - a.rank).slice(0, cfg.topK)
  const maxRank = top[0].rank
  const weights = top.map((s) => Math.exp((s.rank - maxRank) / cfg.temperature))
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
  const axes: Axes = { cuisines: new Map(), proteins: new Map(), bands: new Map() }
  const usedGroups = new Set<string>()
  const usedIds = new Set<string>()
  for (const b of basket) {
    bump(axes.cuisines, b.cuisine)
    bump(axes.proteins, b.mainProtein ?? OTHER_PROTEIN)
    bump(axes.bands, timeBand(b.prepTime, cfg))
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

    // Jitter each candidate's score by a seeded wobble so the top-K window is drawn fresh from
    // the tied mass each run (see SuggestConfig.explorationJitter). The reported score stays the
    // true intrinsic one — jitter only steers this run's ranking, it isn't a real quality signal.
    const scored = available.map((c) => {
      const score = scoreCandidate(c, axes, cfg)
      return { c, score, rank: score + rng() * cfg.explorationJitter }
    })
    const { c, score } = pickWeighted(scored, rng, cfg)

    picked.push({ id: c.id, score, reasons: reasonsFor(c, axes, cfg) })

    // Commit the pick: it now constrains variety and blocks its id + group.
    bump(axes.cuisines, c.cuisine)
    bump(axes.proteins, c.mainProtein ?? OTHER_PROTEIN)
    bump(axes.bands, timeBand(c.prepTime, cfg))
    usedIds.add(c.id)
    if (c.groupId) usedGroups.add(c.groupId)
  }

  return picked
}
