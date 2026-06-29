# Recipe groups (variants & duplicates) — feature spec

Design for grouping closely-related recipes so the app can surface alternatives and,
later, keep automatic suggestions varied. Provider-neutral by design (honours the privacy
firewall — see `CLAUDE.md`). Drafted 2026-06-29; **not yet built**.

> A **feature spec**: the design and rationale for one area, sitting alongside the
> whole-app [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md).
> It's living documentation — each piece ships with a Gherkin scenario in `features/`,
> which becomes the executable proof, while this prose keeps the *why*.

## Why

Recipe sources carry many near-duplicate recipes that differ on a single axis:

- **Protein swap** — the same dish with chicken / beef / pork (or breast vs thigh).
- **Carb swap** — the same dish with chips vs rice vs veg-rice.

These aren't noise — they're *optionality*. "Steak tonight, but maybe with rice instead
of chips." We want to **be aware of the alternatives**, not hide them, and (later) make
the automatic meal suggester treat a cluster as one for variety while still letting the
user pick which member to cook.

## Model: present all, link related ("see also")

Every recipe stays a **first-class, browsable, searchable record**. A group is a
**symmetric set of related recipes** — there is no parent/child, nothing is demoted or
hidden. Browse is unchanged; the relationship surfaces as a **"see also"** on the recipe
detail page.

Rationale: Browse is text-search, so a user may deliberately search for a specific
variant ("sirloin rice"). Hiding variants fights that. Awareness beats tidiness here;
variety is enforced later at *suggestion* time, not by hiding in Browse.

### Data model — built 2026-06-29

A new **user-data** store (precious; exported with the backup; survives re-import).
Grouping is curation — it must never mutate the re-importable recipe records. Implemented
in `src/app/groups.ts` (create/edit/delete + reverse index) and `src/app/cleanup.ts` (the
single recipe-delete path with cascade); the `CurationExport` envelope now carries
`variantGroups`. Covered by `features/recipe-groups.feature`.

```ts
interface VariantGroup {
  id: string                  // stable group id
  axis?: 'protein' | 'carb' | 'mixed'   // what differs; metadata only
  members: { recipeId: string; label: string }[]  // e.g. { recipeId, label: 'Rice' }
}
```

- **Symmetric** — membership is a set; any member's detail page shows the *other* members
  as "see also". No `leadId`.
- `label` is the short variant tag shown in the UI ("Chips", "Rice", "Beef").
- Lives in IndexedDB alongside stars/plans; cleared by neither the demo seed nor a
  dataset import. Because members are keyed by recipe id (stable slug), groups **survive
  a re-import** of the dataset.
- A recipe's group is found by a cheap reverse index (recipeId → group) built in memory
  from the table on load.
- Exported with the backup. (The `CurationExport` envelope in `schema/userData.ts` must
  grow a `variantGroups` field when the Save/Open feature is built — backlog.)

**Integrity invariants** (enforced by the app layer, exercised by Gherkin):

- **One group per recipe.** A recipe belongs to at most one group; the create/edit UI
  *moves* it rather than double-listing, keeping the reverse index 1:1.
- **At least two members.** A group with fewer than two members is meaningless and is
  dissolved (the row deleted).
- **Delete cascades.** Deleting a recipe removes it from its group; if that drops the group
  below two members, the group is dissolved. A single delete path enforces this.

Dexie: `variantGroups: 'id'` added in schema v3. (A `*recipeId` multiEntry index
is possible if DB-level membership lookup is ever wanted; in-memory is fine at current
scale.)

### Why linked, not embedded

A variant is **not** a lightweight delta — a carb/protein swap changes ingredients,
nutrition, an instruction step, the image, the title, and `mainProtein`. It's ~90% of a
full recipe. So embedding "slim children" inside a parent saves little and, because
merging is an **interactive in-app action**, embedding would force curation to mutate the
recipe records and would break on re-import (embedded children reappear as top-level
duplicates). Linked records keep the re-importable/precious seam clean and make un-group a
one-row delete.

## UI surfaces

### Browse — unchanged
All recipes shown and searchable as today. **Open decision:** an optional subtle
"N related" badge on cards that belong to a group, giving awareness in Browse without
hiding anything.

### Recipe detail — "see also" — built 2026-06-29
A small section listing sibling recipes with their labels, each a link to that recipe's
page (every variant is already its own page). Data shaping is `seeAlsoFor()` in
`src/app/groups.ts` (keeps the page a thin shell); covered by `features/recipe-groups.feature`.

- v1: **links** to the sibling pages — done.
- Optional later: an in-place **dropdown** that swaps the whole card to the chosen variant
  without navigating.

### Refine — new section (between Browse and Curate)
The home for tidying the collection. Two jobs, split into two in-page tabs (**Group** and
**Clean up**):

1. **Group related recipes / dedup.**
   - **Manual grouping — built 2026-06-29** (`src/pages/RefinePage.tsx`): search recipes by
     title, stage two or more, label each, pick an optional axis, create. Existing groups
     list with disband + per-member remove. A thin shell over `src/app/groups.ts`.
   - **Similarity suggester — built 2026-06-29** (`src/lib/similarity.ts`, pure + unit
     tested; `suggestGroupCandidates()` in `src/app/groups.ts` feeds it the ungrouped
     recipes). Proposes candidate clusters in Refine; members are pre-ticked with a label
     defaulted from `mainProtein`, the user unticks outliers and **confirms**. Never
     auto-applies.
   - Detection signal: **title-token overlap + ingredient-name Jaccard** (both must clear a
     pair threshold), single-linkage clustered. Never buckets by `mainProtein` — the
     differing protein/carb is exactly the axis. Single-linkage can chain real adjacent
     variants into a loose blob across two axes at once, so a **cluster-score floor + size
     cap** drop those (they score low); tuned against the real catalogue.
   - Also catches genuine accidental near-dups (same dish, different slug). NB: an exact
     re-import of the *same* dataset is already idempotent (additive upsert by stable id),
     so Refine is for the harder cases ids can't catch — not trivial double-imports.
2. **★-driven cleanup — built 2026-06-29.** Bulk-delete recipes scored 1–2★ ("bin it" /
   "very bin it" — see `★ semantics`). The Refine "Clean up binned recipes" section lists
   them worst-first; **tick** the ones to remove (or "select all"), then **confirm**.
   Nothing is pre-selected — deletion is destructive and real (no tombstones; see *Import
   changes*). Calls `deleteRecipes` in `src/app/cleanup.ts`, which is **total**: it cascades
   to groups (dissolving any left under two members) **and purges the recipe's user data** —
   stars/notes, cooked history, and its slot in any plan. (Plan-derived shopping ticks are
   left; stale keys are ignored.) So re-importing a deleted recipe starts it **clean**, with
   no stale rating. Covered by `features/cleanup.feature`.
   - The same `deleteRecipe` path is also reachable **directly** — a ✕ on each Browse card
     and a "Delete recipe" button on the recipe page (both with confirm) — for one-offs
     without having to ★-rate first.
   - **Images:** the deleted recipe's image file on disk is left orphaned — the browser
     can't touch the filesystem (Safari, no File System Access API), and an orphan is
     harmless (nothing references it). Reclaiming the disk space is an optional **offline
     prune** (a CLI step comparing the images folder against the surviving recipe set),
     not an in-app action.

## Import changes (prerequisite) — built 2026-06-29

Two import modes. Both leave user data (stars/plans/cooked/groups) untouched — it lives in
its own tables, which neither mode clears — and both set `dataSource='user'` so the
first-run demo seed never clobbers an import.

- **Additive (default).** Upsert recipes by id: new ones added, existing ones refreshed
  from the import, recipes the import doesn't mention kept. This is how you re-expand the
  collection — e.g. import the full variant set, then curate it down in Refine.
- **Replace all recipes.** Clear-first, for starting clean.

Additive only preserves existing *user* recipes: if the store is currently demo-seeded (or
empty), even an additive import clears first, so the bundled demo placeholders never mix
into a real import. Covered by `features/additive-import.feature`.

**No tombstones — delete means delete.** Deleting a recipe in-app removes its record for
good. The durable backup is the JSON **export**, which already reflects every deletion, so
a normal backup → restore never resurrects anything. The *only* way a deleted recipe
returns is a deliberate **additive re-import of the original dataset** that still contains
it — an opt-in, explainable consequence ("you re-imported the source"), not a surprise.
Not worth a tombstone ledger to prevent.

## Automatic meal suggestion (later)

The future "suggest a varied week" feature must be **group-aware**:

- Dedup the suggestion by group — at most one member of a group in the proposed week.
- "Not cooked recently" variety treats a group as one unit (cooking the rice variant marks
  the whole group recent).
- The user picks **which** member to actually cook/plan from the suggested group.

Same `variantGroups` metadata powers both "see also" now and varied suggestions later.

## App layer & testing

New IndexedDB logic goes in `src/app/` (the test seam), pure shaping in `src/lib/`:

- `src/app/groups.ts` — create / edit / delete groups; reverse-index helper; enforces the
  integrity invariants (one group per recipe, min two members).
- `src/app/dataset.ts` — additive upsert + a replace-all option (extend existing importer).
- `src/app/cleanup.ts` (or similar) — the single recipe-delete path: removes the record and
  cascades group membership (dissolving a group left under two members).
- Detection scoring is pure → `src/lib/similarity.ts` + unit tests (`similarity.test.ts`);
  `suggestGroupCandidates()` in `src/app/groups.ts` reads the store and feeds it.

Each feature ships a Gherkin scenario (living docs / regression net), e.g.
`features/recipe-groups.feature`, `features/additive-import.feature`,
`features/cleanup.feature` — driving the app layer against `fake-indexeddb`.

## Decisions (resolved 2026-06-29)

- **Browse "N related" badge** — **deferred.** Grouping lives purely on the detail page for
  v1; revisit once groups exist and we can feel whether Browse misses it.
- **See also** — **links only** for v1 (every variant already has a page). In-place
  dropdown swap deferred.
- **Lead/preferred member** — **dropped.** No `leadId`; the suggester ranks by ★ and the
  user picks the member. Only `axis`/`label` metadata is kept.
- **Tombstones** — **dropped.** Delete is real (see *Import changes*); the export is the
  durable state, and a deliberate raw re-import resurrecting a recipe is acceptable.
- **Cleanup selection** — **filter + tick + select-all + confirm**, nothing pre-selected
  (the action is destructive).
