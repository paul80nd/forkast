# Refine → Group — feature spec

The **Group** tab of Refine: the UI for linking closely-related recipes into a variant set.
Part of the Refine section ([`refine-spec.md`](refine-spec.md)); reads and writes the Recipe
Groups data model documented in [`groups-spec.md`](groups-spec.md) — this spec is about the
*workflow*, that one is about the *model* and how groups surface elsewhere (detail page, Plan).

> A **feature spec**: design + rationale; the executable proof is `features/recipe-groups.feature`.

## Why group here

Sources carry many near-duplicate recipes that differ on a single axis — the same dish with
chicken / beef / pork (a **protein swap**) or with chips / rice / veg-rice (a **carb swap**).
These aren't noise, they're *optionality* ("steak tonight, but maybe rice instead of chips").
Grouping records that relationship as user data so the detail page can show alternatives and
the future suggester can treat a cluster as one unit for variety. Built 2026-06-29
(`src/pages/RefinePage.tsx`, a thin shell over `src/app/groups.ts`).

## Two ways to group

### Manual grouping
Search recipes by title, stage two or more, label each member, pick an optional axis, create.
Existing groups list below with **disband** and **per-member remove**. The integrity
invariants (one group per recipe, min two members, delete cascades) are enforced in the app
layer — see [`groups-spec.md`](groups-spec.md).

### Similarity suggester
Proposes candidate clusters from the **ungrouped** recipes so you don't have to find variants
by hand. `suggestGroupCandidates()` (`src/app/groups.ts`) reads the store and feeds the pure
scorer (`src/lib/similarity.ts`, unit-tested). Members are **pre-ticked**; the user unticks
outliers and **confirms**. It never auto-applies.

Both the axis and the member labels are **pre-filled best-effort guesses** the user can
override:

- **Axis** via `inferAxis`: distinct `mainProtein` across members → `protein`; else the
  differing ingredient matched against a carb/protein vocab → `carb`; else `mixed`.
- **Member labels** via `memberLabels`: the ingredient that *distinguishes* each member — the
  protein on a protein swap ("Chicken" / "Beef"), the differing carb on a carb swap ("Rice" /
  "Cauliflower rice") — falling back to `mainProtein`.

## Detection signal

**Title-token overlap + ingredient-name Jaccard**, both of which must clear a pair threshold,
single-linkage clustered. It deliberately **never buckets by `mainProtein`** — the differing
protein/carb is exactly the axis we want to surface, not collapse.

Single-linkage can chain real adjacent variants into a loose blob spanning two axes at once
(chicken-rice → chicken-chips → beef-chips). Those score low, so a **cluster-score floor +
size cap** drop them. Thresholds (`titleThreshold`, `ingredientThreshold`, `minClusterScore`,
`maxClusterSize`) are tuned against the real catalogue and tunable per call.

The suggester also catches genuine accidental near-dups (same dish, different slug) that
aren't strict duplicates. NB: an exact re-import of the *same* dataset is already idempotent
(additive upsert by stable id), so grouping is for the harder cases ids can't catch — not
trivial double-imports.

## Compare

Both suggestions and saved groups offer a **side-by-side Compare** — images, metadata, and
highlighted ingredient diffs — so you can eyeball whether two recipes really are variants
before committing.

## Relationship to Duplicates

The Group tab and the [Duplicates tab](refine-duplicates-spec.md) run the *same* scorer under
different thresholds. The title is the discriminator: a variant **drops a title word** (low
title overlap → a group), a true duplicate is near-identical on both (→ a delete). Grouping
keeps both recipes and links them; Duplicates deletes all but the keeper.
