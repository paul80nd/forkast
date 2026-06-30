# Refine — feature spec (umbrella)

Refine is the **tidying section** of the app — the nav tab between Browse and Curate. Where
Browse is for *finding* and Curate is for *rating*, Refine is for **shaping the collection
itself**: grouping related recipes, removing duplicates, and deleting the ones you've binned.
Provider-neutral by design (honours the privacy firewall — see `CLAUDE.md`).

> A **feature spec**: the design and rationale for one area, sitting alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). It's living
> documentation — each piece ships with a Gherkin scenario in `features/`, which becomes the
> executable proof, while this prose keeps the *why*.

## The three jobs (in-page tabs)

Refine splits into three tabs, each its own spec:

1. **Group** — link closely-related recipes (protein/carb swaps) into a variant set so the
   app can surface alternatives and keep future suggestions varied.
   See [`refine-groups-spec.md`](refine-groups-spec.md).
2. **Duplicates** — find and delete genuine near-duplicates (the *same* dish under a
   different slug). See [`refine-duplicates-spec.md`](refine-duplicates-spec.md).
3. **Clean up** — bulk-delete the recipes you've rated ★1–2 ("bin it").
   See [`refine-cleanup-spec.md`](refine-cleanup-spec.md).

The **data model** that grouping reads and writes — the `variantGroups` store, its
invariants, and how groups surface on the recipe page and (later) in Plan — lives in
[`groups-spec.md`](groups-spec.md). Refine is the page that *edits* that model; the model
is a cross-cutting data feature in its own right.

## Shared principles

The three jobs look different but share a spine — keep new work consistent with it:

- **One similarity scorer, two presets.** Group and Duplicates are the *same* pure scorer
  (`src/lib/similarity.ts`) under different thresholds. Grouping wants a loose preset (catch
  variants that differ on an axis); Duplicates wants a tight preset (`DUPLICATE_OPTS`: near
  identical on *both* title and ingredients). The discriminator is the **title** — a
  protein/carb swap drops a title word (→ a group), a true duplicate keeps it (→ a delete).
  Nothing buckets by `mainProtein`: the differing protein/carb is exactly the axis we're
  detecting.
- **Suggest, never auto-apply.** Every automated step *proposes* — clusters, keepers, labels,
  axes are all pre-filled best-effort guesses the user reviews and confirms. The app never
  groups or deletes on its own.
- **Confirm before destructive.** Deletion is real (see *Import & deletion model*), so the
  delete actions require an explicit confirm and pre-select conservatively (Clean up
  pre-selects nothing; Duplicates pre-arms all-but-the-keeper, since one keeper is the common
  case).
- **Operates on ungrouped recipes.** The suggesters feed on recipes not already in a group —
  a saved group is "curated as kept", so it's excluded from further group/duplicate
  suggestions.
- **Pure core, thin shell.** Scoring/keeper/axis logic is pure in `src/lib/` (unit-tested);
  the IndexedDB reads/writes live in `src/app/` (`groups.ts`, `duplicates.ts`, `cleanup.ts`),
  the test seam the Gherkin features drive. `RefinePage.tsx` stays a thin shell.

## Import & deletion model (the curation loop)

Refine assumes a specific loop: **import broad, then curate down** — and deletes that *stick*.
Built 2026-06-29.

Two import modes (both leave user data — stars/plans/cooked/groups — untouched, since it
lives in its own tables that neither mode clears, and both set `dataSource='user'` so the
first-run demo seed never clobbers an import):

- **Additive (default).** Upsert recipes by id: new ones added, existing refreshed from the
  import, recipes the import doesn't mention kept. This is how you **re-expand** the
  collection — import the full variant set, then tidy it down in Refine. Additive only
  preserves existing *user* recipes: if the store is currently demo-seeded (or empty), even
  an additive import clears first, so the bundled demo placeholders never mix into a real
  import. Covered by `features/additive-import.feature`.
- **Replace all recipes.** Clear-first, for starting clean.

**No tombstones — delete means delete.** Deleting a recipe in-app removes its record for
good. The durable backup is the JSON **export**, which already reflects every deletion, so a
normal backup → restore never resurrects anything. The *only* way a deleted recipe returns is
a deliberate **additive re-import of the original dataset** that still contains it — an
opt-in, explainable consequence ("you re-imported the source"), not a surprise. Not worth a
tombstone ledger to prevent.

This is why every Refine delete path is **total** (cascades to groups + purges the recipe's
user data) — see [`refine-cleanup-spec.md`](refine-cleanup-spec.md) for the single delete
path all three jobs share.

## App layer & testing

New IndexedDB logic goes in `src/app/` (the test seam); pure shaping in `src/lib/`:

- `src/app/groups.ts` — group CRUD, reverse index, `suggestGroupCandidates()`, `seeAlsoFor()`.
- `src/app/duplicates.ts` — `suggestDuplicateCandidates()`, `chooseKeeper`.
- `src/app/cleanup.ts` — the single recipe-delete path with group cascade + user-data purge.
- `src/app/dataset.ts` — additive upsert + replace-all.
- `src/lib/similarity.ts` — the pure scorer (+ `inferAxis`, `memberLabels`), unit-tested.

Each job ships a Gherkin scenario: `features/recipe-groups.feature`,
`features/duplicates.feature`, `features/cleanup.feature`, `features/additive-import.feature`
— driving the app layer against `fake-indexeddb`.
