# Forkast — design spec

> An opinionated, local-first **meal planner** for one fussy household. It helps
> you curate a personal collection of recipes, plan a varied week, and generate a
> merged shopping list. You still cook from your own cards — Forkast is the
> *planning* layer, not a kitchen companion.

This is **living documentation**: it describes the app as it actually is and *why* it's
shaped that way. The cross-cutting decision trail lives in [`decisions.md`](decisions.md);
per-feature specs (e.g. [`groups-spec.md`](groups-spec.md)) cover features in depth; the
Gherkin `features/` are the executable behaviour. Keep all four honest — if the code and a
doc disagree, fix the doc in the same change.

## Ethos & non-goals

- **Opinionated, not generic.** Built around one household's workflow. Shared
  in case the approach or the storage format is useful — **not** a general-purpose
  recipe manager. Go vibe your own. 🙂
- **Local-first.** No server, no database to install, nothing leaves your machine.
- **Public code, private data — always separated** (see *Privacy firewall*).

**Non-goals:** a generic recipe manager; an in-kitchen cooking/step mode; ever
publishing provider-sourced recipe data; any cloud sync or account system.

## Privacy firewall

The repo is **generic-input by design** — provider knowledge is data, config, and a thin
private adapter, never committed code:

- **Committed (public):** the generic `Recipe` schema, the SPA, the **ingredient parser**
  (`parseQuantity`) and **ingredient dictionary**, the networked **acquire CLI**
  (`scripts/acquire.ts`) with its **generic example config**
  (`scripts/source.config.example.json`) and agent playbook (`scripts/ACQUIRE.md`), and
  **fictional** demo recipes (`public/demo/`). `grep -ri <any-provider>` over the
  repo — commit messages included — returns nothing.
- **Gitignored (local-only):** your real dataset + images (`data/private/`), the per-source
  config (`*.private.json`), and the **clean/transform adapters** (`adapters-private/`) that
  map one source's raw shape onto our schema. The SPA only ever sees our `Recipe` schema,
  never raw provider JSON. Enforced by `.gitignore`.

## Architecture

Two committed parts — the **SPA** and the generic **`Recipe` schema** — plus a **private,
one-shot import pipeline** that emits a finished dataset in that schema. The SPA only ever
sees our schema, never raw provider JSON.

1. **Import pipeline** (TypeScript + Node ≥22, run natively — no build step). A
   **one-shot** sequence, *not* a re-runnable service:

   - **Acquire (public, networked).** Enumerate source recipe URLs (typically via
     `sitemap.xml`), politely (rate-limited) fetch each, and cache the **raw JSON
     verbatim** + one image per recipe locally. Idempotent. The only networked step;
     `scripts/acquire.ts` + `scripts/ACQUIRE.md` are committed and generic.
   - **Clean → cull → transform (private).** Tidy the raw payloads, dedup and drop
     unwanted recipes, then map the result onto the `Recipe` schema (running the committed
     ingredient parser). These adapters live in `adapters-private/` (gitignored) because
     they encode one source's shape; the output is `data/private/recipes.json`.
   - **One-shot, not re-runnable.** The raw cache is a temporary safety net, deleted once
     the app data is proven; a backup zip is the insurance. We pivoted away from an
     incremental, re-runnable pipeline (see [`decisions.md`](decisions.md)).

2. **Dataset** (generic JSON schema + images) — the shareable artefact. Demo set committed
   (`public/demo/`); real set gitignored.

3. **SPA** (React + Vite + TypeScript) — import dataset → IndexedDB → browse / curate /
   plan / shop → export backup. Fully static; runs on GitHub Pages or locally. Targets
   **Safari** (and other modern browsers).

**Ingredient binding is lazy.** Imported recipes carry no `ingredientId`. Binding happens
**in-app at shopping time**: the user binds a recipe ingredient to a dictionary entry (or
leaves it verbatim, un-merged), and that binding is stored and reused thereafter. The
dictionary grows organically and rides along in the export. There is **no batch matcher and
no separate review pass** — the SPA owns ingredient identity, lazily.

### Persistence model

- **Reference data** (`recipes.json`): imported into **IndexedDB** as the fast working
  copy. Always re-importable, so never precious. **Images are served from disk**, not
  held in IndexedDB — they're too large and Safari can evict idle blobs, so a static
  route serves them from a local folder (the JSON stores only the filename).
- **User data** (stars, notes, cooked history, plans, shopping ticks, settings, variant
  groups): lives in IndexedDB; the **durable source of truth is an exported JSON backup**
  on disk. Built as **Save / Open** in Config — a self-contained snapshot of *every* table
  (recipes included), so Open is a true wipe-and-restore that needs no matching
  `recipes.json` and preserves in-app deletions (there are no tombstones). See
  `src/app/backup.ts` + `features/backup.feature`.
- **Why not File System Access API?** Unsupported in Safari (the target browser).
  IndexedDB + JSON export is universal. Note: Safari may evict IndexedDB for
  long-idle sites — hence Export is the real backup.

## Data model

### Recipe (reference — read-only)

| Field | Notes |
|---|---|
| `id` / `slug` | stable identifier |
| `title`, `description` | |
| `image` | local filename under `/images` |
| `sourceUrl` | provenance (private datasets only) |
| `cuisine` | the single browse facet (from source); `tags[]` carries derived diet/effort labels |
| `allergens[]` | from source, for reference/display |
| `prepTime` | prep+cook minutes for the recipe's base `serves` |
| `serves` | base portions the quantities are written for (default 2) |
| `nutrition?` | per-portion macros (kcal + protein/fat/saturates/carbs/sugars/fibre/salt), if available |
| `ingredients[]` | `{ rawLabel, name, qty?, unit?, ingredientId?, sourceRef? }` — `sourceRef` is a stable source id so one match reuses across recipes |
| `basics[]` | store-cupboard items (kept out of the buy list by default) |
| `instructions[]` | `{ order, text }` |
| `mainProtein?` | derived best-effort from source data (for variety) |

### User data (IndexedDB, exportable)

Conceptual; the exact record shapes are the TS types in `src/schema/userData.ts`.

| Store           | Notes                                                                                                                                   |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| `userData`      | per-recipe `{ stars?, notes?, userTags? }`, keyed by `recipeId` — see rating semantics                                                  |
| `cooked`        | one row per cook `{ recipeId, date }` — feeds "not cooked recently"                                                                     |
| `plans`         | `{ id, portions, recipeIds[] }` — MVP is a single current week                                                                          |
| `shopping`      | per-plan `{ checked[], extras[] }` — tick-off state + manual extras; the list itself is derived                                         |
| `settings`      | key/value rows (e.g. `householdSize`, `dataSource`)                                                                                     |
| `dictionary`    | the ingredient dictionary — seeded from the bundled default, then grown by **lazy binding at shopping time**; rides along in the export |
| `variantGroups` | *(planned)* recipe groups — see [`groups-spec.md`](groups-spec.md)                                                                      |

### Rating semantics (the household's sticky-note system, digitised)

- **★5** — favourite, really enjoy
- **★4** — nice
- **★3** — only for variety (an explicit "variety injector" pool)
- **★1–2** — binned
- **unrated** — triage backlog

## MVP scope

1. **Import** a dataset (`recipes.json` + images) into IndexedDB; ship a bundled demo set
   so first run shows something. Imported recipes carry **no** ingredient binding —
   binding is lazy, done in-app at shopping time (see *Architecture*).
2. **Browse / search / filter** — by cuisine, prep time, and your **★ rating**. (No-go
   proteins are excluded upstream when building the dataset, not filtered here.)
3. **Curate** — set ★1–5; fast keyboard triage of the unrated backlog.
4. **Plan a week** — manually add recipes; choose portions (default **2**,
   scalable to **4**/N); show cuisine / protein / time badges + a "not cooked
   recently" hint so variety is eyeballable.
5. **Shopping list** — parse + **merge** ingredients across the plan, **scale**
   to portions, group by aisle, list `basics` separately as "assumed in
   cupboard", tick off, add manual extras.
6. **Mark as cooked** (date) — builds history from day one.
7. **Export / Import** user data (backup/restore).

## Later (noted, not built)

- **Assisted planning** — "suggest a varied week" using stars + the four variety
  axes the household cares about: **cuisine, main protein, cooking time/effort,
  recency (not cooked recently)**. ★3s are the variety pool.
- Leftovers/batch awareness, multi-week plan history. (Per-serving nutrition is
  **captured at import and already shown** on the recipe page; a richer nutrition view
  could come later.)

## Known hard bits (bounded)

- **Ingredient parsing** — source quantities arrive as one string
  (`"320g chicken thighs"`, `"4 tbsp cornflour"`, `"2 mangetout"`). Need to split
  qty / unit / name and **merge like items with unit awareness** for the list.
- **Ingredient matching** — at shopping time the parsed name is fuzzy-matched to the
  canonical dictionary, returning **ranked candidates with confidence** (not a single
  guess), so the lazy-bind flow can offer "did you mean…?" or create-new fast.
- **`mainProtein` derivation** — heuristic from categories/tags/ingredients.
- **Slug enumeration** — typically a `sitemap.xml`; confirmed per-source in the
  (private) adapter.

## Stack

- **App:** React + Vite + TypeScript, IndexedDB (via a thin wrapper).
- **CLI:** Node + TypeScript, run **natively** (Node ≥22 strips types — no build
  step, no `tsx`).
- **Shared:** the generic `Recipe` schema as TS types, imported by both.
- **Hosting:** static — GitHub Pages and/or local. No server, no DB.
