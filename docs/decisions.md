# Decisions

Cross-cutting design decisions and the reasoning behind them — the "how we got here" the
specs themselves don't carry. **Newest first.** Feature-local decisions live in their own
feature spec (e.g. [`variants-spec.md`](variants-spec.md)); private rationale (the household's
curation rules) stays in `HANDOVER.local.md`. Keep this **firewall-clean — no provider
names, ever** (see `CLAUDE.md`).

Each entry: the decision, *why*, and what it superseded if anything.

## 2026-07-06 — Browse allergen filter: Avoid by default, with an Only toggle

Tag filters in Browse are positive (a recipe must carry *all* selected tags — AND). Allergen filters
default to **Avoid** (hide recipes containing any selected allergen — the meal-planning no-go the
schema always intended), with an **Only** toggle that flips to "show recipes that *do* contain them".
*Why the toggle:* the tag manager's click-through wants to *find* recipes carrying a label — the
opposite of avoidance — so one control serves both the planner (avoid) and label inspection (only)
rather than bolting on a second allergen filter. Labels aren't used anywhere else yet, so filtering
is a pure, additive predicate (`matchesLabels`, `src/lib/tags.ts`).

## 2026-07-06 — Editing a recipe mutates the reference table in place

The recipe view can now edit a recipe's scalar text — title, description, and the printed
**card code** (`recipeCode`) — writing straight to the `recipes` table rather than layering a
precious per-recipe override in `userData` (as variants do). *Why:* it's the existing precedent
— `deleteRecipe` already mutates that table, and the Save/Open backup carries the whole `recipes`
set, so edits export and restore with no extra plumbing. *Trade-off, accepted:* a fresh re-import
or a `DEMO_VERSION` re-seed can overwrite an edit, exactly as it would resurrect a deleted recipe;
the export is the durable record either way. Scope is deliberately scalar-only — ingredients and
method (unit/binding-bearing) stay read-only for now. See [`recipe-edit-spec.md`](recipe-edit-spec.md).

## 2026-07-04 — Image pack: a separate, content-addressed cache database

Recipe images live in their own IndexedDB database (`forkast-images`), **not** the main
`forkast` store, and are **content-addressed** (blobs keyed by a SHA-256 of their bytes; a
`names` table maps each recipe filename → hash). *Why separate:* the Save/Open backup
enumerates the main store's tables explicitly, so a distinct DB is automatically excluded from
the exported JSON — images are regenerable, so they stay out of the durable, precious backup;
worst case (eviction / new machine) costs one re-import, never data loss. *Why
content-addressed:* a dish's variant swaps share a byte-identical hero photo (the image hash is
literally the variant group key at import), so keying on content stores each distinct image
once — the on-disk hardlink dedup (`scripts/dedupe-images.ts`) carried into the browser. This is
now safe because installing the app grants persistent storage and desktop quota runs to tens of
GB (see [`image-pack-spec.md`](image-pack-spec.md)). Resolution: a `useRecipeImage` hook prefers
a stored blob's object URL (reference-counted, not a fixed-cap LRU, since Browse accumulates
mounted cards) and otherwise falls through to the existing dev/base route, degrading to a
placeholder tile on error. *Supersedes nothing* — closes the gap where imported-recipe images
404 on the hosted/installed build with no dev image server.

## 2026-07-02 — Variants supersede the manual Recipe Groups feature

The import-seeded **variants** feature (`variantGroupKey`/`variantGroupLead`) plus a user
**override** layer replaces the manual `variantGroups` "see also" feature, which has been
removed. *Why:* the import already groups the bulk of the catalogue automatically and
precisely, so hand-linking every dish was redundant; keeping two parallel grouping mechanisms
was confusing and doubled the plumbing (Browse, the suggester, curation and the plan swap each
had to know both). One mechanism is simpler and strictly more capable. *Model:* import seeds
the grouping; `VariantOverride { recipeIds, leadId }` (user data — backed up, re-import-safe)
layers on top — override wins, one dish per recipe, a single-member override detaches. Resolved
by pure `resolveDishes(recipes, overrides)`; edited in **Refine → Variants** (suggest via the
same text-match scorer the old Group tab used, create, re-lead, remove, revert). *Superseded:*
the `variantGroups` table, `src/app/groups.ts`, and "see also" on the recipe page (the
detail-page Versions selector replaces it). See [`variants-spec.md`](variants-spec.md).

## 2026-07-01 — Lazy ingredient binding keys on ingredient *name*, not source id

Shopping-time binding maps an ingredient to a dictionary entry so it merges across the plan.
The binding is keyed on the **normalised ingredient name**, not the finer-grained source id
(`sourceRef`), even though the schema carries `sourceRef` as "a stable id so one match reuses
across recipes". *Why:* on the real catalogue every line has a `sourceRef`, but a single name
(e.g. "white basmati rice") spans **up to ~10 distinct source ids** (207 names span >1), while
each source id maps to exactly one name. Binding by source id would force the user to bind the
same ingredient many times to merge it; binding by name merges it in one action and matches the
level the shopping list already groups on. Bindings live in a `bindings` table (name →
ingredientId) resolved at list-build time — recipes are **not** mutated, so bindings survive a
re-import and ride along in the backup. The dictionary moved from a static-only list into a
seeded, growable `dictionary` table (grows via create-at-shopping-time).

## 2026-06-30 — Assisted planner: greedy weighted fill, group-aware, propose-then-accept

The "suggest a varied week" suggester (designed in [`plan-suggest-spec.md`](plan-suggest-spec.md))
selects by a **greedy weighted fill**: each candidate scores on **quality (★)** + **dueness**
(recency folded with the `rotation` frequency into one `daysSince / expectedInterval` term) minus
a **dynamic variety penalty** over cuisine / protein / time-band that grows as the basket fills.
*Why greedy over a global optimiser:* simple, fast, explainable ("picked for variety"), and it
supports per-slot reroll naturally. A **variant group counts as one unit** (never two members in a
week). Resolved choices: soft variety (penalise, don't forbid); favour favourites with no quota;
**propose-then-accept** (non-destructive, like the other suggesters); **weighted-random + seed**
so weeks vary but tests stay deterministic; week length 5, adjustable. The pure scorer lands in
`src/lib/` (the first pure resident); plan Dexie writes move `src/lib/plan.ts` → `src/app/plan.ts`
to fix the long-standing lib→app wrinkle. (Built 2026-06-30 — see `plan-suggest-spec.md`.)

## 2026-06-29 — Duplicate detection reuses the variant scorer, separated by title overlap

The Refine "Duplicates" finder doesn't get its own algorithm: it's the same pure
similarity scorer as the group suggester, run with a tighter preset. The key realisation is
that *title overlap* is what cleanly separates the two. A protein/carb **variant** swaps a
title word ("chicken"→"beef"), so its title Jaccard is low even though its ingredients
nearly match — that's a *group*. A true **duplicate** is near-identical on title *and*
ingredients. So a high title threshold (plus high ingredient threshold and cluster-score
floor) isolates genuine repeats without a second codebase to maintain. The action differs,
not the detection: duplicates **delete** the spares (keeper chosen by ★ then completeness)
rather than linking them.

## 2026-06-29 — Specs are living documentation, not retired in favour of Gherkin

The earlier intent was for the Gherkin features to *be* the spec and to retire the prose
docs. Reversed: prose captures design + rationale + this decision trail, which executable
features can't. The model is four complementary layers — [`spec.md`](spec.md) (whole-app
design), per-feature specs (e.g. `groups-spec.md`), this log (the cross-cutting journey),
and `features/` (executable behaviour) — kept honest together. Docs collected under `docs/`.

## 2026-06-29 — Recipe Groups: present-all / link related, and no tombstones

Variants stay first-class, searchable, and **linked** (not hidden, demoted, or embedded);
the relationship surfaces as "see also". **Delete means delete — no tombstone ledger**: the
JSON export is the durable state and already reflects deletions, so only a deliberate raw
re-import can resurrect a recipe (acceptable). Import becomes additive-by-default with a
replace-all option. Full design: the groups model in [`groups-spec.md`](groups-spec.md); the
import & deletion model (additive/replace-all, no-tombstones) in [`refine-spec.md`](refine-spec.md).

## 2026-06-29 — Deleting a recipe purges its user data too

Extends "delete means delete": deleting a recipe now also removes its stars/notes, cooked
history, and plan membership — not just the recipe record. Rationale: deleting means we
don't want to hear of it again, so a later re-import should start it **clean** rather than
resurrect an old rating. Consistent with the no-tombstones model (the export is the durable
state). Plan-derived shopping ticks are left as-is (not per-recipe; stale keys are ignored).

## 2026-06-29 — Drop the imported source rating

Our own ★ rating is the only one that matters (do *we* like it, not whether everyone does);
showing a source's average beside it invited confusion. Removed end-to-end. Browse "top
rated" now sorts by our ★.

## 2026-06-29 — Collapse `prepTime` to a single number

Was `{ for2, for4 }`; the app only needs the time for the recipe's base serving size. The
importer still tolerates the legacy object shape.

## 2026-06-29 — Drop `sourceCode` (the source's catalogue/card code)

Added 2026-06-28, then removed: it turned out to be the source's *internal* id, not the
printed card code anyone references — recoverable for only a minority of recipes and not
even unique. Not worth a field.

## 2026-06-29 — Serve images from disk, never from IndexedDB

Recipe images are large and Safari can evict idle IndexedDB blobs. A static route serves
them from a local folder; the JSON stores only the filename. Images are never bundled,
committed, or held in the DB.

## 2026-06-29 — Testing: two tiers (unit + Gherkin feature tests)

Tight pure logic gets unit tests beside the code; behaviour gets Gherkin scenarios driving
the **app layer** (`src/app/`) against `fake-indexeddb` — real Dexie code paths, no browser
or React. Features double as living docs and the regression net, "just below the UI".

## ~2026-06-28 — One-shot import pipeline + lazy ingredient binding

Superseded the config-driven, **re-runnable three-pass** design decided the same day (which
included a planned SPA *review* pass and **batch** ingredient matching). A curated set is
plenty, so the pipeline prunes in place and the raw cache is a deletable safety net (a backup
zip is the insurance). Ingredient identity moved into the SPA: recipes import **unbound**,
and binding is done **lazily at shopping time** and reused — no batch matcher, no review pass.

## 2026-06-28 — Schema: one `cuisine` + many `tags`; drop `categories`

`cuisine` is the single browse facet; derived diet/effort labels plus the source's own
category labels live in `tags[]`. Dropped `Recipe.categories`. Also added `nutrition`,
ingredient `sourceRef`, and `tags`.

## 2026-06-27 — Local-first, browser-only, targets Safari

No server, no account, nothing leaves the machine. Persistence is IndexedDB (the working
store) plus a JSON **export** as the durable backup. The File System Access API is ruled
out (unsupported in Safari); Safari may also evict idle IndexedDB, which is why export — not
the DB — is the real backup.

## 2026-06-27 — Privacy firewall: generic-input by design

Provider knowledge is data + config + a thin private adapter, **never committed code**.
Enforced by `.gitignore` and extends to commit messages. Committed recipe data is fictional
demo only; the ingredient dictionary and unit system are generic knowledge and are public.

## 2026-06-27 — ★ rating semantics

★5 favourite · ★4 nice · ★3 variety-only · ★2 "bin it" · ★1 "very bin it" · unrated =
triage backlog. The household's sticky-note system, digitised; ★3s are the explicit variety
pool for the (later) assisted-planning feature.
