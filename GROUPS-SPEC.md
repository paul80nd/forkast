# GROUPS-SPEC — Recipe groups (variants & duplicates)

Design for grouping closely-related recipes so the app can surface alternatives and,
later, keep automatic suggestions varied. Provider-neutral by design (honours the privacy
firewall — see `CLAUDE.md`). Drafted 2026-06-29; **not yet built** — picked up next session.

> Intended to become living spec once implemented (each piece ships with a Gherkin
> scenario). The eventual goal is to retire the prose `SPEC.md` in favour of the features
> themselves being the spec.

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

### Data model

A new **user-data** store (precious; exported with the backup; survives re-import).
Grouping is curation — it must never mutate the re-importable recipe records.

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

Dexie: add `variantGroups: 'id'` in a new schema version. (A `*recipeId` multiEntry index
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

### Recipe detail — "see also"
A small section listing sibling recipes with their labels, each a link to that recipe's
page (every variant is already its own page).

- v1: **links** to the sibling pages (trivial).
- Optional later: an in-place **dropdown** that swaps the whole card to the chosen variant
  without navigating.

### Refine — new section (between Browse and Curate)
The home for tidying the collection. Two jobs:

1. **Group related recipes / dedup.** A similarity suggester proposes candidate clusters;
   the user **confirms a group** and labels members. Never auto-applies (fuzzy matching is
   noisy — human-in-the-loop is mandatory).
   - Detection signal: **title-stem overlap + ingredient-name Jaccard**, loosely (intent =
     "similar recipes"). The differing protein/carb line is exactly the axis, so don't
     bucket by `mainProtein`.
   - Also catches genuine accidental near-dups (same dish, different slug). NB: an exact
     re-import of the *same* dataset is already idempotent (additive upsert by stable id),
     so Refine is for the harder cases ids can't catch — not trivial double-imports.
2. **★-driven cleanup.** Bulk-delete recipes scored 1–2★ ("bin it" / "very bin it" — see
   `★ semantics`). Deletion writes **tombstones** (below) so an additive re-import doesn't
   resurrect them.

## Import changes (prerequisite)

- **Additive by default.** Import upserts by id: new recipes added, existing refreshed;
  user data (stars/plans/cooked/groups) untouched. An explicit **"Replace all recipes"**
  option preserves the current clear-first behaviour.
- **Tombstones.** A persisted set of deleted recipe ids (user data; exported with backup).
  Additive import **skips tombstoned ids** so in-app deletions stick across re-imports.

## Automatic meal suggestion (later)

The future "suggest a varied week" feature must be **group-aware**:

- Dedup the suggestion by group — at most one member of a group in the proposed week.
- "Not cooked recently" variety treats a group as one unit (cooking the rice variant marks
  the whole group recent).
- The user picks **which** member to actually cook/plan from the suggested group.

Same `variantGroups` metadata powers both "see also" now and varied suggestions later.

## App layer & testing

New IndexedDB logic goes in `src/app/` (the test seam), pure shaping in `src/lib/`:

- `src/app/groups.ts` — create / edit / delete groups; reverse-index helper.
- `src/app/dataset.ts` — additive upsert + tombstone-skip (extend existing importer).
- `src/app/cleanup.ts` (or similar) — bulk-delete + tombstone writes.
- Detection scoring is pure → `src/lib/` + unit tests.

Each feature ships a Gherkin scenario (living docs / regression net), e.g.
`features/recipe-groups.feature`, `features/additive-import.feature`,
`features/cleanup.feature` — driving the app layer against `fake-indexeddb`.

## Open decisions (resolve when building)

- **Browse "N related" badge** — show it, or keep grouping purely on the detail page?
- **See also** — links only (v1), or in-place dropdown swap?
- **Lead/preferred member** — drop entirely (suggester picks by ★), or keep an optional
  "preferred" marker as the suggester's default?
- **Tombstone storage shape** — dedicated table vs a single settings row holding the id set.
- **Cleanup selection** — auto-select all 1–2★, or just filter to them and let the user
  tick?
