# Related recipes — similar / different — feature spec

A discovery layer on the recipe page: from any recipe, jump to ones **like it** ("more like
this") or good ones **unlike it** ("something different"). Provider-neutral, local-first,
computed on demand — no vectors stored, no network.

> A **feature spec**: the design and rationale for one area, alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). Living documentation
> — the build ships with a Gherkin scenario in `features/related-recipes.feature`.
>
> **Status: built 2026-07-29.** Pure scorer `src/lib/relatedRecipes.ts` (+ unit tests), app seam
> `src/app/relatedRecipes.ts` (+ `features/related-recipes.feature`), and the recipe-page section
> `src/components/RelatedRecipes.tsx`. Tuning constants in `DEFAULT_RELATED_CONFIG`.

## Why

Curate/Plan/Shop all operate on the *collection* or the *week*; there was no way to explore
*sideways* from a single recipe. Two everyday jobs:

- **"More like this"** — you liked a dish and want its neighbours (same sort of thing to cook).
- **"Something different"** — you're bored of a groove and want a good recipe that breaks the
  pattern, without scrolling all of Browse.

Both are nearest/farthest-neighbour questions. Every signal we need is already on a recipe
(ingredients, tags, cuisine, protein, effort, nutrition), so relatedness is **structured-feature
similarity** — not text embeddings. That keeps it local, deterministic, explainable ("shares 8
ingredients, same cuisine"), and dependency-free. A neural-embedding upgrade is possible later but
deliberately out of scope.

## The similarity model (`recipeSimilarity`)

A 0–1 score blending per-axis components, each contributing **only when both recipes carry it**,
with the weights **renormalised over the present axes** — so a missing nutrition block or protein
doesn't drag a pair down, it just weights the axes they share.

| Axis | How | Default weight |
| --- | --- | --- |
| **Ingredients** | Jaccard over normalised names (`ingredientSet` — works on unbound lines) | 0.45 |
| **Tags** | Jaccard over tokenised tag words | 0.15 |
| **Cuisine** | exact match | 0.15 |
| **Main protein** | exact match (both present) | 0.10 |
| **Effort band** | `timeBand` quick/medium/long match | 0.05 |
| **Nutrition** | cosine of the scale-normalised 8-macro vector (both present) | 0.10 |

Ingredients dominate: sharing what you actually cook with is the most cook-meaningful sense of
"alike". Reuses the token/Jaccard primitives from [`similarity.ts`](../src/lib/similarity.ts) (the
group suggester) and `timeBand` from [`suggest.ts`](../src/lib/suggest.ts); this module is the
broader "related" view, whereas `similarity.ts` is narrow near-duplicate/variant detection.

## The two lists

- **Similar** (`rankSimilar`) — every candidate by descending `recipeSimilarity`, top *N*.
- **Different** (`rankDifferent`) — *"a change, still good."* Only **keepers** (★ ≥ `minStars`,
  default 3; binned/unrated excluded) are offered, scored by a blend of **novelty**
  (`1 − similarity`) and **quality** (★), so the list favours good recipes that break the anchor's
  cuisine/protein/effort pattern rather than the mathematically-farthest oddities. This is the week
  suggester's variety instinct, pivoted around one recipe.

Both drop the anchor itself; the app layer excludes the anchor's **variant siblings** (they live in
the recipe page's Versions swapper) by collapsing each dish to one card first, and filters
household **no-go** allergens (mirrors Plan/suggest).

## App layer & performance

Scoring one anchor against the whole collection is an **O(N) few-millisecond pass**, so results are
computed **on demand** in `src/app/relatedRecipes.ts::getRelatedRecipes` — no precomputed vectors,
no IndexedDB schema change, nothing to back up. It reads recipes + ★ + variant overrides, collapses
dishes to their lead (a dish counts as a keeper if **any** variant is rated one), runs the pure
rankers, and returns full `Recipe`s + ★ so the UI needn't re-query. Per house rules the ranking
logic is pure in `src/lib/` and unit-tested; the Dexie reads live in `src/app/`.

## UX

A **Related recipes** section at the foot of the recipe page (`RecipeDetail`, full page only — off
in the Plan modal to avoid nesting), full-width below the two-column body. A segmented **More like
this / Something different** toggle switches lists; each result is a standard `RecipeCard` that
links through, so opening one re-anchors the section. Anchored on the **shown variant**, so a swap
re-relates; **live**, so a new ★ rating updates the "different" gate at once. Empty/sparse states
are handled quietly (nothing shown when there's nothing to relate to).

## Testing

- **Unit** (`src/lib/relatedRecipes.test.ts`): axis behaviour (identical → 1, disjoint → 0,
  ingredients dominate, missing protein/nutrition renormalises), `rankSimilar` ordering + anchor
  exclusion + limit, `rankDifferent` keeper gate + novelty/quality blend.
- **Gherkin** (`features/related-recipes.feature`): similar orders ingredient/cuisine neighbours;
  different returns keepers unlike the anchor and never binned/unrated; a recipe's variant siblings
  never appear; a no-go recipe never appears.

## Decisions

1. **Structured features, not embeddings.** Local, deterministic, explainable, zero deps. Revisit
   neural embeddings only if literal similarity feels too wooden.
2. **On-demand, not precomputed.** O(N) per anchor is cheap; no stored vectors, no schema/backup
   cost.
3. **"Different" = a change, still good.** Keeper-gated novelty, not raw farthest-neighbour — the
   latter surfaces low-rated or irrelevant oddities.
4. **Recipe page only.** A Browse "similar-to-X" pivot was considered and deferred.
