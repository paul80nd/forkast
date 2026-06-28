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

## Conventions

- **Commit freely; do NOT `git push`** — pushing is the developer's. Surface commit SHAs.
- End commit messages with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Comments** explain what code does now (+ why if non-obvious); never narrate history.
- Keep the shopping/units logic pure and covered by Vitest.
- Always run `npm run build` and `npm test` before wrapping up.

## Current status & roadmap

Built: foundation, SPA scaffold, schema, demo data, Browse, recipe detail,
Curate (★ + triage), Plan (week board, variety hints, mark-cooked), Shop (merged
list + breakdowns), Config (read-only ingredients viewer).

Remaining for MVP, in build order (the import work pulls #9/#11 forward — getting
real data first is the point):

1. **Public pure core** — `parseIngredient` (label → qty/unit/name) +
   `matchIngredient` (fuzzy → **ranked candidates + confidence**), both Vitest-covered.
   No dependencies; committable on its own.
2. **CLI Pass 1 — Acquire** — generic engine + private mapping config → raw cache +
   images in `data/private/`.
3. **CLI Pass 2 — Transform** — config-driven → candidate `recipes.json` + best-effort
   matches + unmatched list.
4. **Editable ingredient dictionary** — move `src/data/ingredients.ts` into IndexedDB
   (seeded from the bundled default), Config becomes editable.
5. **SPA review UI (Pass 3)** — confirm/correct matches, create dictionary entries.
6. **Export / Import** user data (the durable backup — IndexedDB ⇄ `curation.json`),
   incl. the grown dictionary; "save & open" the processed state.
