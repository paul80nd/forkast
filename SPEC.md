# Forkast — Spec v0.1

> An opinionated, local-first **meal planner** for one fussy household. It helps
> you curate a personal collection of recipes, plan a varied week, and generate a
> merged shopping list. You still cook from your own cards — Forkast is the
> *planning* layer, not a kitchen companion.

## Ethos & non-goals

- **Opinionated, not generic.** Built around one household's workflow. Shared
  in case the approach or the storage format is useful — **not** a general-purpose
  recipe manager. Go vibe your own. 🙂
- **Local-first.** No server, no database to install, nothing leaves your machine.
- **Public code, private data — always separated** (see *Privacy firewall*).

**Non-goals:** a generic recipe manager; an in-kitchen cooking/step mode; ever
publishing provider-sourced recipe data; any cloud sync or account system.

## Privacy firewall

The repo is **generic-input by design**. The separation is at the *adapter* layer,
not just the data:

- **Committed (public):** the generic `Recipe` schema, the SPA, a **generic
  importer** (`schema.org/Recipe` JSON-LD + plain JSON), and **fictional** demo
  recipes. `grep -ri <any-provider>` over the repo returns nothing.
- **Gitignored (local-only):** `adapters-private/` (provider-specific mapping
  code) and `data/private/` (your real dataset + images). Enforced by
  `.gitignore`.

## Architecture

One repo, three parts:

1. **Scraper / importer CLI** (TypeScript + Node, run via `tsx`)
   - Enumerates source recipe URLs (e.g. via a site's `sitemap.xml`).
   - Politely (rate-limited) fetches each recipe and maps it through a **private
     adapter** → the generic schema.
   - Downloads one image per recipe; runs the **ingredient parser**.
   - Emits `recipes.json` + `/images` into a data folder.
   - A committed **generic** adapter (schema.org JSON-LD) ships as the example;
     provider-specific adapters live in `adapters-private/`.

2. **Dataset** (generic JSON schema + images) — the shareable artefact and the
   real selling point of the public repo. Demo set committed; real set gitignored.

3. **SPA** (React + Vite + TypeScript) — import dataset → IndexedDB → browse /
   curate / plan / shop → export backup. Fully static; runs on GitHub Pages or
   locally. Targets **Safari** (and other modern browsers).

### Persistence model

- **Reference data** (`recipes.json` + images): produced by the scraper, imported
  into **IndexedDB** as the fast working copy. Always re-importable, so never
  precious.
- **User data** (stars, notes, cooked history, plans, shopping lists, settings):
  lives in IndexedDB; the **durable source of truth is an exported
  `curation.json`** on disk. One-click Export/Import.
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
| `cuisine`, `categories[]`, `tags[]` | |
| `allergens[]` | powers no-go filters (e.g. fish) |
| `prepTime` | `{ for2, for4 }` minutes |
| `sourceRating` | `{ average, count }` from source, if any |
| `ingredients[]` | `{ rawLabel, name, qty?, unit? }` — parsed best-effort |
| `basics[]` | store-cupboard items (kept out of the buy list by default) |
| `instructions[]` | `{ order, text }` |
| `mainProtein?` | derived, best-effort (for variety) |

### User data (IndexedDB, exportable)

| Field | Notes |
|---|---|
| `stars` | `{ recipeId → 1..5 }` — see rating semantics |
| `notes` / `userTags` | optional, per recipe |
| `cookedHistory` | `{ recipeId → [ISO date] }` — feeds "not cooked recently" |
| `plans` | `{ weekId → { recipeIds[], portions } }` |
| `shoppingList` | derived from a plan + `{ checked, manualExtras }` |
| `settings` | `{ householdSize: 2 }` |

### Rating semantics (the household's sticky-note system, digitised)

- **★5** — favourite, really enjoy
- **★4** — nice
- **★3** — only for variety (an explicit "variety injector" pool)
- **★1–2** — binned
- **unrated** — triage backlog

## MVP scope

1. **Import** a dataset (`recipes.json` + images) into IndexedDB; ship a bundled
   demo set so first run shows something.
2. **Browse / search / filter** — by cuisine, prep time, rating, and **exclude
   no-go ingredients/allergens** (fish).
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
- Nutrition view, leftovers/batch awareness, multi-week history.

## Known hard bits (bounded)

- **Ingredient parsing** — source quantities arrive as one string
  (`"320g chicken thighs"`, `"4 tbsp cornflour"`, `"2 mangetout"`). Need to split
  qty / unit / name and **merge like items with unit awareness** for the list.
- **`mainProtein` derivation** — heuristic from categories/tags/ingredients.
- **Slug enumeration** — typically a `sitemap.xml`; confirmed per-source in the
  (private) adapter.

## Stack

- **App:** React + Vite + TypeScript, IndexedDB (via a thin wrapper).
- **CLI:** Node + TypeScript via `tsx`.
- **Shared:** the generic `Recipe` schema as TS types, imported by both.
- **Hosting:** static — GitHub Pages and/or local. No server, no DB.
