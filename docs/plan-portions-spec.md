# Per-meal portions — feature spec

Portions (household size) is a plan-wide default — "Cooking for 2/4/6". This lets you **override a
single meal** while the rest stay at the default: cook one night for guests, or batch-cook a meal
so it doubles as lunches. The shopping merge already scales each recipe by `portions / serves`, so
a per-meal override just feeds a different numerator for that one meal.

> A **feature spec**: the design and rationale for one area, alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). Living
> documentation — it ships with the Gherkin scenarios (`features/plan-week.feature` for the
> override lifecycle, `features/shop.feature` for the scaled merge) and a unit test on the pure
> merge; this prose keeps the *why*.
>
> **Status: built 2026-07-06.** Pure scaling in `src/lib/shopping.ts` (`buildShoppingList`'s
> `portionOverrides` arg, + unit test), app seam `setMealPortions` in `src/app/plan.ts`, and the
> per-meal control on each planned row (`MealPortions` in `PlanPage`).

## Why

The spec deferred "leftovers/batch awareness" to *Later*. This is the smallest honest version of
it: the maths is already per-recipe, so all that's missing is a place to say "this meal is for
more (or fewer) than the rest of the week".

## Data model

`WeekPlan.portionOverrides?: Record<string, number>` — a map from **recipeId → portions** for that
one meal. A meal absent from the map caters for the plan-wide `portions`; an entry overrides just
that meal. Optional and back-compatible: older plans have no map and every meal uses the default.

- **Keyed by recipeId** (not slot index) because a plan holds each recipe **at most once** (add and
  swap both refuse duplicates), so the id is a stable key that survives reordering.
- **Rides along in the backup** — it's a field on the `plans` table, which the snapshot copies
  wholesale, so no `BackupSnapshot` version bump.

## Lifecycle (`setMealPortions`)

- Setting a meal to a value **equal to the plan default** (or `undefined`) **clears** its override,
  so the map only ever holds genuine deviations and the data stays tidy.
- **Removing** a meal (or marking it cooked, which removes it) **drops** its override, so it can't
  linger or resurface if the recipe is re-added.
- **Swapping** a meal for a variant **carries** the override across to the new recipe — same slot,
  same "cooking for N"; you changed the dish, not the headcount.

## Shopping merge

`buildShoppingList` takes an optional `portionOverrides` map. Each recipe scales by
`(portionOverrides.get(id) ?? portions) / (serves || 2)` — the only change to the merge; everything
downstream (unit conversion, aisle grouping, recipe-count) is unaffected. The Shop header shows the
default with a "· some meals differ" note when any override is present.

## UI

Each planned row carries a compact **"for N"** selector (`MealPortions`). It offers a slightly
wider range than the plan default (1 for a solo lunch, odd sizes for guests, 8 for a batch), with
the current default folded in and labelled. When a meal differs from the default it reads in brand
ink so an off-default meal is glanceable at a scan.
