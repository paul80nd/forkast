# Curate — feature spec

Curate is the **rating** section of the app — the nav tab after Refine. Where Refine *shapes*
the collection (group / dedup / bin), Curate *scores* it: assign every recipe a ★1–5 rating,
fast. Those ratings are the signal that powers Browse's "top rated" sort and, crucially, the
future assisted planner. Provider-neutral by design.

> A **feature spec**: the design and rationale for one area, sitting alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). It's living
> documentation — each piece ships with a Gherkin scenario in `features/`, which becomes the
> executable proof, while this prose keeps the *why*.

## ★ semantics

The rating is opinionated and specific (the same scale used everywhere — see [`spec.md`](spec.md)).
Each tier has a **jovial verdict** (shown beside the stars, `STAR_LABELS`) and a functional
meaning that drives the rest of the app:

- **★5** — "Yum Yum" · favourite
- **★4** — "Like it" · nice
- **★3** — "I'd eat it" · only for variety (an explicit "variety injector" pool)
- **★2** — "Rather not" · binned (fed to Refine's Clean up tab)
- **★1** — "Yuk" · binned
- **unrated** — the triage backlog

Stars live in **user data** (`userData.stars`, keyed by recipe id) — precious, exported with
the backup, never mutating the re-importable recipe record. Writes go through `setStars` in
`src/app/curation.ts`; the verdict labels are pure data in `src/lib/curation.ts`.

## Current behaviour (built)

### Triage
The page leads with a **one-recipe-at-a-time** triage of the **unrated backlog** (every recipe
with no ★ yet, sorted by title). The card shows the image, cuisine / prep-time / main-protein,
title, and description, with a large star control.

- **Keyboard-first:** `1`–`5` rate the current recipe, `→` or `S` skip, `←` step back.
  (Keys are ignored while focus is in an input/textarea/select.)
- **Buttons:** Back / Skip, and the star control, mirror the keys for mouse use.
- Rating advances through the backlog; when it empties, an "All triaged 🎉" state shows.

### Rated overview
Below the triage card, the rated recipes are grouped into **tiers (★5 → ★1)**, each tier a
titled list with a count. Every row links to the recipe and carries an inline star control, so
you can **re-rate** anything without re-triaging.

The header shows the running tally: `N rated · M to triage`.

### Focus filters (cuisine / protein) — built 2026-06-30
Two selects (cuisine, main protein) scope Curate's **whole working set** — both the triage
backlog *and* the rated overview — so you can rate one cuisine or protein at a time. Batching
by a single axis gives mental context, so ratings come faster and more consistently (and you
can see how you've already rated siblings). Filtering both lists (not just the backlog) keeps
the page coherent: it becomes "everything Curate is working on, scoped". The header counts and
the "all triaged" empty state both follow the filter (the latter distinguishes "nothing left
in this filter" from "all triaged"). Filters persist to localStorage, **separately from
Browse** (`curate.cuisine` / `curate.protein` via `usePersistentState`) — focusing Browse on
chicken shouldn't force Curate to. Presentation-only (pure UI filtering, like Browse) → no
Gherkin; the rating writes it sits on top of are covered by `features/curation.feature`.

### Rotation — how often (★3+) — built 2026-06-30
A second per-recipe signal beside the stars: **how often you'd want this in rotation**, stored
as `rotation` on the user-data row (`schema/userData.ts`). It's independent of ★ — a ★5 you'd
happily eat weekly differs from a ★5 you only want occasionally — and exists to feed the
assisted planner so it can balance variety and **not over-suggest favourites**.

- A **1–5 scale with 3 as the neutral middle** (4–5 = cook it more often, 1–2 = less):
  *1 Rarely · 2 Occasionally · 3 Now & then · 4 Often · 5 On repeat* (`ROTATION_LABELS`).
- Set via the **same fillable control as the rating** but with **◆ diamonds** (sky, vs the
  amber ★) so the two scales read as distinct — `RotationRating`, a preset of the shared
  `RatingScale` component. Click a diamond to set, click the current one to clear.
- Offered only where stars are **★3 or above** — the planner's pool (variety ★3 + keepers
  ★4/5). ★1–2 are bin, so rotation is moot there; and the triage card stays a fast ★-only
  decision (rating a recipe drops it from the backlog immediately, so there's no "after
  rating" moment on that card — rotation is a considered second pass on the rated rows / the
  recipe page).
- Optional throughout (most recipes never get one). Rides the backup automatically (a field on
  the exported `userData` rows) and is purged with the row when a recipe is deleted. The field
  is **number-only** (no legacy-string migration — the earlier string scale was never used in
  anger). Covered by `features/curation.feature`.

### Rating on the recipe page — built 2026-06-30
The recipe detail page's **"Your rating"** panel mirrors the curation controls so you can rate
(and reconsider) a recipe while looking at it: the ★ control (with its verdict label), the ◆
rotation control (★3+), and an explicit **Clear** that resets *both* stars and rotation —
sending the recipe back to the unrated **triage backlog**. The use case: you misrated something, or want to **cook it first**
before deciding. (★ could already be cleared by re-clicking the active star — undiscoverable;
the Clear button makes "reset to unrated" obvious and also wipes rotation in one go.) The
Browse grid card stays read-only — a star badge only — so ticking/navigating isn't muddled by
inline editing. Wiring only; the underlying clears are covered by `features/curation.feature`.

## Planned

Curate today captures exactly one signal — ★ = *how good is this recipe*. The assisted
"suggest a varied week" planner (see [`spec.md`](spec.md) → Later) needs more than quality: it
balances four **variety axes** (cuisine, main protein, time/effort, recency) and draws from
the ★3 pool. Three of those axes already come from import; ★ comes from here. The gap Curate
should fill is **eligibility and rotation** — signals ★ alone can't express. Sketch, not yet
committed:

1. ~~**Scope the triage backlog.**~~ **Built 2026-06-30** — see *Focus filters* above. (Went
   a touch further than the original sketch: the filter scopes the rated overview too, so the
   whole page focuses on one cuisine/protein.)
2. ~~**A rotation / frequency signal.**~~ **Built 2026-06-30** — see *Rotation* above.
3. **Group-aware rating** (ties to [Refine → Group](refine-groups-spec.md)). When a recipe is
   one of a variant group, show "1 of N variants" and offer to apply the rating to siblings —
   you shouldn't independently triage near-identical dishes, and the planner treats the group
   as one unit anyway.
4. **A readiness / coverage view.** Evolve the rated-overview from "list by tier" into "can
   this collection actually fill a varied week?" — keepers across each cuisine / protein, with
   gaps surfaced ("pork mains rated 4+: only 3"). Doubles as the proof that Curate has fed
   Plan what it needs.

Priority leans to **(1) + (2)**: a better rating loop plus the one signal the planner is
missing. (3) and (4) are strong follow-ons.

## App layer & testing

The curation writes (`setStars`, `setRotation`) live in **`src/app/curation.ts`** — the
house-rules Dexie seam the UI and feature tests both call. The pure vocabulary (`STAR_LABELS`,
`ROTATIONS`, `ROTATION_LABELS`) stays in `src/lib/curation.ts`. `CuratePage.tsx` is a thin
shell reading live queries. Curation behaviour is covered by `features/curation.feature`
(driving the store against `fake-indexeddb`).

> The Dexie writes moved from `src/lib/` to `src/app/` when the rotation field landed
> (2026-06-30), resolving the earlier house-rules wrinkle.
