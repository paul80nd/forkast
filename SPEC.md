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

- **Committed (public):** the generic `Recipe` schema, the SPA, the **config-driven
  import engine** (named transforms + ingredient parser + matcher) with an **example
  mapping config** (`schema.org/Recipe` JSON-LD), and **fictional** demo recipes.
  `grep -ri <any-provider>` over the repo returns nothing.
- **Gitignored (local-only):** your real dataset + images, and a small **per-source
  mapping config** (`*.private.json`) — i.e. *data + config, not code*. The provider's
  URL and field paths are the only secret bits; the engine, transforms, parser and
  matcher are all committed and generic. (`adapters-private/` is retained as an escape
  hatch for genuinely bespoke private code, but the aim is **config-only**.) Enforced
  by `.gitignore`.

## Architecture

One repo, three parts:

1. **Import pipeline** (TypeScript + Node) — **three deliberately decoupled passes**.
   The guiding split: the **CLI owns source-shape**, the **SPA owns ingredient
   identity**.

   - **Pass 1 — Acquire (CLI; the only networked pass).** Enumerate source recipe
     URLs (e.g. via a site's `sitemap.xml`), politely (rate-limited) fetch each, and
     cache the source's **raw JSON verbatim** + one image per recipe to a local
     folder. Idempotent — skip anything already cached. This is the inspect/tweak
     layer; nothing else touches the network.
   - **Pass 2 — Transform (CLI).** Map the raw cache → the generic `Recipe` schema,
     driven by a **mapping config**, running the **ingredient parser** and a
     **best-effort** ingredient match. Emits a *candidate* `recipes.json` + a list of
     unmatched / low-confidence ingredients. Pure and re-runnable — iterate the parser
     and dictionary without ever re-fetching.
   - **Pass 3 — Review (SPA).** Confirm/correct the ingredient matches and create new
     dictionary entries against the editable in-app dictionary. Only then is a recipe
     "fully imported"; the reviewed result is what you export. The SPA's only input is
     our own `Recipe` schema — provider-shaped JSON never reaches the browser.

   **Config over code.** Provider knowledge is a *config*, not a code adapter: the
   engine, the named transforms, the parser, the matcher and the example config are
   committed and generic; only a small per-source mapping config (URL + field paths)
   and the raw data stay private. The rule is **config wires, code computes** — if a
   source needs real logic, that becomes a new *generic* named transform in public
   code, never a mapping DSL.

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
| `dictionary` | the ingredient dictionary — seeded from the bundled default, then editable; import-review adds entries; rides along in the export |

### Rating semantics (the household's sticky-note system, digitised)

- **★5** — favourite, really enjoy
- **★4** — nice
- **★3** — only for variety (an explicit "variety injector" pool)
- **★1–2** — binned
- **unrated** — triage backlog

## MVP scope

1. **Import** a dataset (`recipes.json` + images) into IndexedDB; ship a bundled
   demo set so first run shows something. Imported recipes carry **best-effort**
   ingredient matches; a **review step** (against the editable ingredient dictionary,
   now living in IndexedDB) confirms/corrects them before they're fully in.
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
- **Ingredient matching** — the parsed name is fuzzy-matched to the canonical
  dictionary, returning **ranked candidates with confidence** (not a single guess), so
  the in-app review can offer "did you mean…?" or create-new fast.
- **`mainProtein` derivation** — heuristic from categories/tags/ingredients.
- **Slug enumeration** — typically a `sitemap.xml`; confirmed per-source in the
  (private) adapter.

## Stack

- **App:** React + Vite + TypeScript, IndexedDB (via a thin wrapper).
- **CLI:** Node + TypeScript, run **natively** (Node ≥22 strips types — no build
  step, no `tsx`).
- **Shared:** the generic `Recipe` schema as TS types, imported by both.
- **Hosting:** static — GitHub Pages and/or local. No server, no DB.
