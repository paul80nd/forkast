# CLAUDE.md

Guidance for AI agents (and humans) working on Forkast. Documents conventions and
non-obvious gotchas. If something surprises you, tell the developer and add a note here.

> **Private context:** if a `HANDOVER.local.md` exists in the repo root (gitignored),
> **read it first** — it holds the current build status, next steps, and private
> context that is deliberately kept out of the committed repo.

## What this is

Forkast is an opinionated, local-first **meal planner**: curate recipes (★ ratings),
plan a varied week, generate a merged shopping list. Runs entirely in the browser
(IndexedDB); no server, no database to install. See [`SPEC.md`](SPEC.md) for the design.

## Privacy firewall — non-negotiable

The repo is **generic-input by design**. Provider knowledge is a *config*, not code:
the import engine, transforms, parser and matcher are all public; only a per-source
mapping config + the raw/real data are private. Enforced by `.gitignore`:

- **Never commit** anything under `data/private/` or `adapters-private/`, any
  `*.private.json` mapping config, and never add provider-specific names, URLs, or
  scraped recipe data to committed files.
- Committed data is **fictional demo data only** (`public/demo/`).
- The ingredient dictionary + unit system are generic knowledge and *are* public.
- **Config wires, code computes** — keep the committed engine/transforms generic
  (no provider name); the only secret bits are the source URL + field paths in the
  private config.
- `*.local.md` is gitignored for private notes/handover.

## Stack & commands

React 19 + Vite + TypeScript + Tailwind v4, Dexie (IndexedDB), HashRouter, Vitest.

```bash
npm run dev        # dev server (http://localhost:5173)
npm run build      # tsc -b && vite build — must pass before committing
npm test           # vitest run
npm run typecheck  # tsc -b
```

- **HashRouter** (not BrowserRouter) so it works on GitHub Pages / local serving with
  no rewrite config.
- **Target browser is Safari** → no File System Access API; persistence is IndexedDB
  (working store) + JSON **export** (durable backup).

## Architecture

Three parts, one repo: a **config-driven import pipeline** (not built yet), a
**dataset** (generic JSON + images), and the **SPA**.

The import pipeline is **three decoupled passes** — *CLI owns source-shape, SPA owns
ingredient identity*:

1. **Acquire (CLI, networked):** enumerate slugs (sitemap) → fetch → cache raw source
   JSON verbatim + one image each to `data/private/`. Idempotent (skip cached).
2. **Transform (CLI):** raw → generic `Recipe` schema via a **mapping config**, runs
   the ingredient parser + a **best-effort** match. Emits a candidate `recipes.json`
   + an unmatched/low-confidence list. Pure, re-runnable, no network.
3. **Review (SPA):** confirm/correct matches + create dictionary entries; only then is
   a recipe fully imported. The SPA only ever sees our schema, never raw provider JSON.

Run the CLI with **native Node** (≥22 strips TS types — no `tsx`, no build step).

- **Reference data** (recipes) seeds into IndexedDB from `public/demo/recipes.json` on
  first run; demo refreshes when `DEMO_VERSION` in `src/db/seed.ts` is bumped, but a
  user's own imported data (`dataSource === 'user'`) is never overwritten.
- **User data** (stars, plans, cooked history, shopping ticks) lives in IndexedDB;
  the durable backup is an exported JSON.

### Data model

- Generic, provider-neutral types in `src/schema/`.
- Each recipe ingredient line binds to a canonical `ingredientId` (the ingredient
  **dictionary**, `src/data/ingredients.ts`). This binding is what makes the shopping
  list merge across recipes — set **best-effort** at transform (fuzzy match → ranked
  candidates), then **confirmed in the SPA review**. The dictionary moves into
  IndexedDB (seeded from `ingredients.ts`) so review can grow it; it then exports with
  user data. Discovered ingredients live in browser state, **not** committed to
  `ingredients.ts` (which stays the demo/default seed).
- **Units** (`src/lib/units.ts`): count / volume / mass dimensions; conversion within a
  dimension is free, volume↔mass needs a per-ingredient density (optional).
- **Shopping merge rule** (`src/lib/shopping.ts`): scale to portions, sum each
  ingredient in its **purchase unit** where convertible; otherwise keep the **recipe
  unit** as its own line (a separate line is fine). Pure + unit-tested — keep it that way.
- Pluralisation: dictionary `plural` is an optional override; falls back to `pluralize`.
- Recipes optionally carry `nutrition` (per-portion macros), a `sourceCode` (short
  source/catalogue code, e.g. a physical card's reference), and each ingredient an
  optional `sourceRef` (stable source id → match once, auto-apply across recipes);
  `tags` holds derived diet/effort labels. All optional and back-compatible.

## Conventions

- **Commit freely; do NOT `git push`** — pushing is the developer's. Surface commit SHAs.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Comments** explain what code does now (+ why if non-obvious); never narrate history.
- Keep the shopping/units logic pure and covered by Vitest.
- Always run `npm run build` and `npm test` before wrapping up.

## Testing

Two tiers, one runner (Vitest 4):

1. **Unit** — `src/**/*.test.ts`, next to the code. For tight, pure logic
   (`parseQuantity`, `units`, `shopping` merge, dataset validation). Import from
   `vitest` explicitly (no globals); keep fixtures local.
2. **Feature (Gherkin)** — spec-driven, **living documentation**. `.feature` files in
   `features/`, step defs in `features/steps/*.steps.ts` via `@amiceli/vitest-cucumber`.
   Steps drive the **app layer** (see below) against **`fake-indexeddb`** — real Dexie
   code paths, no browser, no React render ("just below the UI"). `test/setup.ts`
   installs `fake-indexeddb/auto`; `test/factories.ts` builds valid records. Each
   scenario's `Background` resets the store (per-scenario isolation).

`npm test` runs both; `npm run test:features` runs only the feature layer. New features
should land with a `.feature` describing the behaviour — it's the regression net.
`vitest.config.ts` wires includes + setup; `tsconfig.app.json` also type-checks
`test/` + `features/` so `npm run build` catches errors there too.

## Application layer (`src/app/`)

Use-cases that orchestrate Dexie + pure libs (e.g. `importRecipeDataset`). This is the
seam the UI **and** the feature tests both call — pages stay thin shells over these,
so behaviour is tested below the React layer. Pure shaping/validation stays in
`src/lib/` (e.g. `parseRecipeDataset`), the Dexie write in `src/app/`. New page logic
that touches IndexedDB should grow here rather than inline in components.

## Current status & roadmap

Built: foundation, SPA scaffold, schema, demo data, Browse, recipe detail,
Curate (★ + triage), Plan (week board, variety hints, mark-cooked), Shop (merged
list + breakdowns), Config (read-only ingredients viewer).

The CLI import pipeline (acquire → clean → cull → transform) is **done**; it emits a
`RecipeDataset` already in our schema. Ingredient matching is now **lazy / in-app**
(bind at shopping time), not a batch step — see the private handover for the full story.

Remaining for MVP:

1. **SPA dataset import** ✅ — file-picker in Config → `parseRecipeDataset` (pure,
   `src/lib/dataset.ts`) → `importRecipeDataset` (`src/app/dataset.ts`) → IndexedDB as
   `dataSource='user'`. Unit + Gherkin covered (`features/import-dataset.feature`).
2. **Image serving** — the open problem: ~727 MB of images can't be committed or held
   as IndexedDB blobs (Safari idle-eviction). Pick a static-serve strategy.
3. **Lazy bind/create-ingredient flow** at shopping time (+ `matchIngredient` helper),
   growing the dictionary in IndexedDB.
4. **Tag management** — rename(=merge)/delete tags, persisted + exported.
5. **Export / Import** user data (the durable backup — IndexedDB ⇄ `curation.json`),
   incl. the grown dictionary; "save & open" the processed state.
