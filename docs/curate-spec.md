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
title, and description, with the ★ rating and (for keepers) the ◆ rotation controls.

**Two-step per card, ★ then ◆** — designed for speed:

- Set the **rating**. A bin score (★1–2) advances straight to the next card — rotation is
  moot. A keeper (★3–5) instead **reveals the rotation control** and waits.
- Set the **rotation** (◆1–5). That records "how often" and advances to the next card.
- So the fast path is two taps/keys: e.g. `3` then `2` (★3, then ◆2 = Occasionally) → next.

- **Keyboard-first:** `1`–`5` set the ★, then `1`–`5` set the ◆ (a local *phase* tracks which,
  so a fast "3 then 2" can't be misread as two star presses while the write lands); `→`/`S`
  skip, `←` step back, `Backspace` clears the card. (Keys ignored while focus is in a field.)
- **Buttons + controls** mirror the keys for mouse use; click an active icon to clear it.
- **You're never trapped:** Back/Skip always work, even if you've only set the ★ (rotation is
  optional). Clearing the ★ (or `Backspace`) wipes rotation too, so an unrated card never keeps
  an orphan rotation.

The triage walks a **frozen session queue** — the unrated recipes in the active filter,
captured when the filter (or recipe set) changes, *not* on each rating. That's what lets a card
stay put while you rate it and lets Back/Skip revisit cards you've already rated this session
(rather than the card vanishing the instant it leaves the live "unrated" set). At the end an
"End of the batch" / "All triaged" state offers a Back link; any skipped count is shown.

### Rated overview
Below the triage card, the rated recipes are grouped into **tiers (★5 → ★1)**, each tier a
titled list with a count. Every row links to the recipe and carries an inline star control, so
you can **re-rate** anything without re-triaging.

Built to stay usable once thousands are rated: a **search box** (title + cuisine) and a **tier
filter** (all / one star tier) narrow the list — on top of the page's cuisine/protein focus
filter — and it renders **a page at a time** (50, growing on scroll) *across* the tiers, so the
DOM never holds every row. Tier headers keep their **full** count even while only a page is shown.
Both controls persist (`curate.ratedQuery` / `curate.ratedTier`), like Browse's.

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

### Group-aware rating — built 2026-06-30
Near-identical variants shouldn't be triaged independently, so Curate can fan a rating across a
group (see [Refine → Group](refine-groups-spec.md)). An **"Apply rating to variants"** checkbox
sits to the right of the focus filters, **on by default** and persisted (`curate.applyToVariants`).

When the triaged card is one of a variant group, a sky **"1 of N variants"** panel appears under
the rating controls, listing the siblings with their current ★ (or "unrated"):

- **Toggle on** — finalising the card's rating (the ★ for a bin, the ◆ rotation for a keeper)
  copies its **stars *and* rotation** onto every **still-unrated** sibling
  (`applyRatingToGroup`, `src/app/curation.ts`) and drops those siblings from the rest of the
  triage queue. A sibling that **already** carries a rating is **never overwritten** (your earlier
  verdict wins — shown as "kept"); its notes/tags are preserved.
- **Toggle off** — the panel is just a heads-up that the card belongs to a group, with a **"Rate
  them together"** button that flips the toggle on (this card's rating then fans out, and the
  preference sticks for the rest of the session).

The cascade is gated on the toggle, fans out only to *unrated* members, and matches how the
planner treats a group as one unit. Covered by `features/curation.feature`.

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
3. ~~**Group-aware rating**~~ **Built 2026-06-30** — see *Group-aware rating* above.
4. **A readiness / coverage view.** Evolve the rated-overview from "list by tier" into "can
   this collection actually fill a varied week?" — keepers across each cuisine / protein, with
   gaps surfaced ("pork mains rated 4+: only 3"). Doubles as the proof that Curate has fed
   Plan what it needs.

Of these, (1)–(3) are built; **(4) the readiness / coverage view** is the remaining follow-on,
and reads as much like a lead-in to the assisted planner as a Curate feature.

## App layer & testing

The curation writes (`setStars`, `setRotation`, `clearCuration`, and the group-aware
`applyRatingToGroup`) live in **`src/app/curation.ts`** — the house-rules Dexie seam the UI and
feature tests both call. The pure vocabulary (`STAR_LABELS`,
`ROTATIONS`, `ROTATION_LABELS`) stays in `src/lib/curation.ts`. `CuratePage.tsx` is a thin
shell reading live queries. Curation behaviour is covered by `features/curation.feature`
(driving the store against `fake-indexeddb`).

> The Dexie writes moved from `src/lib/` to `src/app/` when the rotation field landed
> (2026-06-30), resolving the earlier house-rules wrinkle.
