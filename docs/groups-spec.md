# Recipe groups (variants) — feature spec

The **data feature** behind grouping closely-related recipes so the app can surface
alternatives and, later, keep automatic suggestions varied. This spec owns the *model* and
the surfaces that *read* it (the recipe page's "see also", and the future planner). The
Refine UI that *creates and edits* groups is documented separately in
[`refine-groups-spec.md`](refine-groups-spec.md). Provider-neutral by design (honours the
privacy firewall — see `CLAUDE.md`). Built 2026-06-29.

> A **feature spec**: the design and rationale for one area, sitting alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). It's living
> documentation — each piece ships with a Gherkin scenario in `features/`, which becomes the
> executable proof, while this prose keeps the *why*.

## Why

Recipe sources carry many near-duplicate recipes that differ on a single axis:

- **Protein swap** — the same dish with chicken / beef / pork (or breast vs thigh).
- **Carb swap** — the same dish with chips vs rice vs veg-rice.

These aren't noise — they're *optionality*. "Steak tonight, but maybe with rice instead of
chips." We want to **be aware of the alternatives**, not hide them, and (later) make the
automatic meal suggester treat a cluster as one for variety while still letting the user pick
which member to cook.

## Model: present all, link related ("see also")

Every recipe stays a **first-class, browsable, searchable record**. A group is a **symmetric
set of related recipes** — there is no parent/child, nothing is demoted or hidden. Browse is
unchanged; the relationship surfaces as a **"see also"** on the recipe detail page.

Rationale: Browse is text-search, so a user may deliberately search for a specific variant
("sirloin rice"). Hiding variants fights that. Awareness beats tidiness here; variety is
enforced later at *suggestion* time, not by hiding in Browse.

### Data model

A new **user-data** store (precious; exported with the backup; survives re-import). Grouping
is curation — it must never mutate the re-importable recipe records. Implemented in
`src/app/groups.ts` (create/edit/delete + reverse index) and `src/app/cleanup.ts` (the single
recipe-delete path with cascade); the `BackupSnapshot` envelope carries `variantGroups`.
Covered by `features/recipe-groups.feature`.

```ts
interface VariantGroup {
  id: string                  // stable group id
  axis?: 'protein' | 'carb' | 'mixed'   // what differs; metadata only
  members: { recipeId: string; label: string }[]  // e.g. { recipeId, label: 'Rice' }
}
```

- **Symmetric** — membership is a set; any member's detail page shows the *other* members as
  "see also". No `leadId`.
- `label` is the short variant tag shown in the UI ("Chips", "Rice", "Beef").
- Lives in IndexedDB alongside stars/plans; cleared by neither the demo seed nor a dataset
  import. Because members are keyed by recipe id (stable slug), groups **survive a re-import**
  of the dataset.
- A recipe's group is found by a cheap reverse index (recipeId → group) built in memory from
  the table on load.
- Exported with the backup: the `BackupSnapshot` envelope in `schema/userData.ts` carries
  `variantGroups` (Save/Open, `src/app/backup.ts`).

**Integrity invariants** (enforced by the app layer, exercised by Gherkin):

- **One group per recipe.** A recipe belongs to at most one group; the create/edit UI *moves*
  it rather than double-listing, keeping the reverse index 1:1.
- **At least two members.** A group with fewer than two members is meaningless and is
  dissolved (the row deleted).
- **Delete cascades.** Deleting a recipe removes it from its group; if that drops the group
  below two members, the group is dissolved. A single delete path enforces this — see
  [`refine-cleanup-spec.md`](refine-cleanup-spec.md).

Dexie: `variantGroups: 'id'` added in schema v3. (A `*recipeId` multiEntry index is possible
if DB-level membership lookup is ever wanted; in-memory is fine at current scale.)

### Why linked, not embedded

A variant is **not** a lightweight delta — a carb/protein swap changes ingredients, nutrition,
an instruction step, the image, the title, and `mainProtein`. It's ~90% of a full recipe. So
embedding "slim children" inside a parent saves little and, because merging is an interactive
in-app action, embedding would force curation to mutate the recipe records and would break on
re-import (embedded children reappear as top-level duplicates). Linked records keep the
re-importable/precious seam clean and make un-group a one-row delete.

## Surfaces that read the model

### Browse — unchanged
All recipes shown and searchable as today. **Decision (deferred):** an optional subtle
"N related" badge on cards that belong to a group — awareness in Browse without hiding
anything. Revisit once groups exist and we can feel whether Browse misses it.

### Recipe detail — "see also"
A small section listing sibling recipes with their labels, each a link to that recipe's page
(every variant is already its own page). Data shaping is `seeAlsoFor()` in `src/app/groups.ts`
(keeps the page a thin shell); covered by `features/recipe-groups.feature`.

- v1: **links** to the sibling pages — done.
- Optional later: an in-place **dropdown** that swaps the whole card to the chosen variant
  without navigating.

### Creating & editing groups — in Refine
Manual grouping and the similarity suggester live in the Refine section; see
[`refine-groups-spec.md`](refine-groups-spec.md). They are thin shells over `src/app/groups.ts`
and the pure scorer in `src/lib/similarity.ts`.

## Automatic meal suggestion (later)

The future "suggest a varied week" feature must be **group-aware**:

- Dedup the suggestion by group — at most one member of a group in the proposed week.
- "Not cooked recently" variety treats a group as one unit (cooking the rice variant marks the
  whole group recent).
- The user picks **which** member to actually cook/plan from the suggested group.

Same `variantGroups` metadata powers both "see also" now and varied suggestions later.

## Decisions (resolved 2026-06-29)

- **Browse "N related" badge** — **deferred.** Grouping lives purely on the detail page for
  v1; revisit once groups exist and we can feel whether Browse misses it.
- **See also** — **links only** for v1 (every variant already has a page). In-place dropdown
  swap deferred.
- **Lead/preferred member** — **dropped.** No `leadId`; the suggester ranks by ★ and the user
  picks the member. Only `axis`/`label` metadata is kept.
- **Tombstones** — **dropped.** Delete is real and groups survive re-import as user data; the
  export is the durable state. (The import & deletion model is detailed in
  [`refine-spec.md`](refine-spec.md).)
