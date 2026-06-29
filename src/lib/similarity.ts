// Pure similarity scoring for the group suggester. We look for recipes that are the SAME
// dish with one axis swapped (chicken→beef, chips→rice): such pairs share almost all of
// their title words and almost all of their ingredients, differing on just the swapped
// line. So we score on title-token overlap AND ingredient-name overlap (Jaccard) — never
// on `mainProtein`, since the protein is exactly what differs.
//
// Side-effect-free and dependency-light so it's exhaustively unit-testable; the Dexie read
// and the confirm/label UI live above it (Refine).

import pluralize from 'pluralize'

// Dropped from titles before comparing: grammar + generic recipe-card filler that adds
// noise without distinguishing dishes.
const STOPWORDS = new Set([
  'with', 'and', 'the', 'a', 'an', 'of', 'in', 'on', 'for', 'to', 'our', 'your',
  'style', 'served', 'side', 'n', 'topped', 'homemade', 'fresh',
])

/** Lowercase → words → drop stopwords/short tokens → singularise. */
export function tokenize(text: string): Set<string> {
  const out = new Set<string>()
  for (const word of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length < 2 || STOPWORDS.has(word)) continue
    out.add(pluralize.singular(word))
  }
  return out
}

/** Jaccard overlap of two sets: |A∩B| / |A∪B|. 0 when both empty. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  const [small, large] = a.size < b.size ? [a, b] : [b, a]
  let inter = 0
  for (const x of small) if (large.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

/** Normalise an ingredient name to a token-sorted key so "spring onions" == "spring onion". */
function normaliseName(name: string): string {
  return [...tokenize(name)].sort().join(' ')
}

/** The set of normalised ingredient names for a recipe. */
export function ingredientSet(names: string[]): Set<string> {
  const out = new Set<string>()
  for (const n of names) {
    const norm = normaliseName(n)
    if (norm) out.add(norm)
  }
  return out
}

export interface SimilarityInput {
  id: string
  title: string
  ingredientNames: string[]
}

export interface CandidateCluster {
  recipeIds: string[]
  /** Mean pairwise similarity within the cluster (0–1); higher = more confident. */
  score: number
}

export interface SuggestOptions {
  /** Min title-token Jaccard for a pair to link (default 0.55). */
  titleThreshold?: number
  /** Min ingredient Jaccard for a pair to link (default 0.45). */
  ingredientThreshold?: number
  /** Skip title tokens appearing in more than this many recipes (too common to be useful). */
  maxTokenDocFreq?: number
  /**
   * Drop a finished cluster whose mean pairwise similarity is below this (default 0.55).
   * Single-linkage can chain real adjacent variants into a loose blob across two axes at
   * once; such blobs score low, so this floor filters them while keeping tight sets.
   */
  minClusterScore?: number
  /** Drop a cluster with more than this many members (default 6) — likely an over-merge. */
  maxClusterSize?: number
}

/**
 * Tight preset for finding near-**duplicates** rather than variants. The discriminator is
 * the title: a protein/carb variant swaps a title word ("chicken"→"beef"), so its title
 * overlap is low; a true duplicate has a near-identical title *and* near-identical
 * ingredients. Requiring high overlap on both, with a high cluster-score floor, keeps this
 * to genuine repeats. Tunable by review if it feels too eager/shy.
 */
export const DUPLICATE_OPTS: SuggestOptions = {
  titleThreshold: 0.8,
  ingredientThreshold: 0.8,
  minClusterScore: 0.85,
  maxClusterSize: 6,
}

/**
 * Propose candidate clusters of related recipes for the user to confirm. Uses an inverted
 * index on title tokens to only score pairs that share a reasonably distinctive word —
 * keeps it tractable across thousands of recipes. Linked pairs are merged into clusters;
 * each cluster of two or more is returned, best first. Never auto-applies: the caller
 * confirms and labels.
 */
export function suggestGroups(
  recipes: SimilarityInput[],
  opts: SuggestOptions = {},
): CandidateCluster[] {
  const titleT = opts.titleThreshold ?? 0.55
  const ingT = opts.ingredientThreshold ?? 0.45
  const maxDf = opts.maxTokenDocFreq ?? Math.max(50, Math.floor(recipes.length * 0.1))
  const minClusterScore = opts.minClusterScore ?? 0.55
  const maxClusterSize = opts.maxClusterSize ?? 6

  const n = recipes.length
  const titles = recipes.map((r) => tokenize(r.title))
  const ings = recipes.map((r) => ingredientSet(r.ingredientNames))

  // Inverted index: title token → recipe indices that contain it.
  const index = new Map<string, number[]>()
  titles.forEach((set, i) => {
    for (const t of set) {
      const list = index.get(t)
      if (list) list.push(i)
      else index.set(t, [i])
    }
  })

  // Candidate pairs: co-occur in at least one non-common title-token bucket.
  const seen = new Set<string>()
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const union = (a: number, b: number) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }

  for (const idxs of index.values()) {
    if (idxs.length < 2 || idxs.length > maxDf) continue
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        const i = idxs[a]
        const j = idxs[b]
        const key = i < j ? `${i},${j}` : `${j},${i}`
        if (seen.has(key)) continue
        seen.add(key)
        if (jaccard(titles[i], titles[j]) < titleT) continue
        if (jaccard(ings[i], ings[j]) < ingT) continue
        union(i, j)
      }
    }
  }

  // Gather connected components into clusters.
  const components = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    const list = components.get(root)
    if (list) list.push(i)
    else components.set(root, [i])
  }

  const clusters: CandidateCluster[] = []
  for (const idxs of components.values()) {
    if (idxs.length < 2 || idxs.length > maxClusterSize) continue
    let total = 0
    let count = 0
    for (let a = 0; a < idxs.length; a++) {
      for (let b = a + 1; b < idxs.length; b++) {
        total +=
          (jaccard(titles[idxs[a]], titles[idxs[b]]) +
            jaccard(ings[idxs[a]], ings[idxs[b]])) /
          2
        count++
      }
    }
    const score = count ? total / count : 0
    if (score < minClusterScore) continue
    clusters.push({ recipeIds: idxs.map((i) => recipes[i].id), score })
  }

  clusters.sort((a, b) => b.score - a.score || b.recipeIds.length - a.recipeIds.length)
  return clusters
}

// Starch/carb tokens that commonly get swapped between variants (singularised, as tokenize
// leaves them). Used only to guess the axis — never to cluster.
const CARB_WORDS = new Set([
  'rice', 'chip', 'fry', 'fries', 'noodle', 'pasta', 'potato', 'mash', 'bread', 'wrap',
  'tortilla', 'couscous', 'quinoa', 'bulgur', 'gnocchi', 'polenta', 'flatbread', 'naan',
  'bun', 'roti', 'chapati', 'orzo', 'spaghetti', 'penne', 'macaroni', 'udon', 'pitta',
])

// Protein tokens, as a fallback when a recipe carries no mainProtein.
const PROTEIN_WORDS = new Set([
  'chicken', 'beef', 'pork', 'tofu', 'prawn', 'salmon', 'cod', 'haddock', 'lamb', 'duck',
  'turkey', 'sausage', 'bacon', 'paneer', 'halloumi', 'quorn', 'steak', 'mince', 'gammon',
  'chorizo', 'meatball', 'chickpea', 'lentil', 'bean',
])

export interface AxisInput {
  mainProtein?: string
  ingredientNames: string[]
}

/**
 * Guess what differs across a cluster's members, to pre-fill the group axis. Distinct
 * `mainProtein` values mean a protein swap; otherwise the ingredients that AREN'T shared by
 * every member are matched against carb/protein vocab. Ambiguous (both or neither) → 'mixed'.
 * Best-effort — the user confirms or overrides.
 */
export function inferAxis(members: AxisInput[]): 'protein' | 'carb' | 'mixed' {
  const proteins = new Set(
    members.map((m) => m.mainProtein?.trim().toLowerCase()).filter((p): p is string => !!p),
  )
  if (proteins.size >= 2) return 'protein'

  const counts = new Map<string, number>()
  for (const m of members) for (const k of ingredientSet(m.ingredientNames)) {
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }

  let carb = false
  let protein = false
  for (const [name, count] of counts) {
    if (count === members.length) continue // shared by every member — not the differing line
    for (const tok of name.split(' ')) {
      if (CARB_WORDS.has(tok)) carb = true
      if (PROTEIN_WORDS.has(tok)) protein = true
    }
  }
  if (carb && !protein) return 'carb'
  if (protein && !carb) return 'protein'
  return 'mixed'
}
