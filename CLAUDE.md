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

The repo is **generic-input by design**. The public/private split is at the *adapter*
layer, enforced by `.gitignore`:

- **Never commit** anything under `adapters-private/` or `data/private/`, and never
  add provider-specific names, URLs, or scraped recipe data to committed files.
- Committed data is **fictional demo data only** (`public/demo/`).
- The ingredient dictionary + unit system are generic knowledge and *are* public.
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

Three parts, one repo: a **scraper/importer CLI** (not built yet), a **dataset**
(generic JSON + images), and the **SPA**.

- **Reference data** (recipes) seeds into IndexedDB from `public/demo/recipes.json` on
  first run; demo refreshes when `DEMO_VERSION` in `src/db/seed.ts` is bumped, but a
  user's own imported data (`dataSource === 'user'`) is never overwritten.
- **User data** (stars, plans, cooked history, shopping ticks) lives in IndexedDB;
  the durable backup is an exported JSON.

### Data model

- Generic, provider-neutral types in `src/schema/`.
- Each recipe ingredient line binds to a canonical `ingredientId` (the ingredient
  **dictionary**, `src/data/ingredients.ts`). This binding is what makes the shopping
  list merge across recipes — set it at import.
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

Remaining for MVP:

1. **Export / Import** user data (the durable backup — IndexedDB ⇄ `curation.json`).
2. **Scraper / importer CLI** + generic `schema.org/Recipe` adapter (public);
   provider-specific adapters live in `adapters-private/`.
3. **Editable ingredient dictionary** (move dictionary into IndexedDB, seeded from the
   bundled default) — pairs with the importer's ingredient-mapping review UI.
