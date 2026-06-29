# CLAUDE.md

Guidance for agents/humans on Forkast — conventions and non-obvious gotchas only. If
something here surprises you or proves wrong, tell the developer and update this file.

> **Read `HANDOVER.local.md` first** (repo root, gitignored): current build status, next
> steps, and private context deliberately kept out of the committed repo.

## What this is

An opinionated, local-first **meal planner**: curate recipes (★ ratings), plan a varied
week, generate a merged shopping list. Browser-only (IndexedDB); no server. See
[`SPEC.md`](SPEC.md) for the design.

## Privacy firewall — non-negotiable

Generic-input by design: provider knowledge is *config + data*, never code. Enforced by
`.gitignore`.

- **Never commit** anything under `data/private/` or `adapters-private/`, any
  `*.private.json`, or any provider name / URL / scraped recipe in a committed file —
  `grep -ri <provider>` over the repo must return nothing.
- Committed data is **fictional demo only** (`public/demo/`). The ingredient dictionary
  and unit system are generic knowledge and *are* public.
- `*.local.md` is gitignored (private notes/handover).

## Stack & commands

React 19 · Vite · TypeScript · Tailwind v4 · Dexie (IndexedDB) · HashRouter · Vitest 4.

```bash
npm run dev            # http://localhost:5173
npm run build          # tsc -b && vite build
npm test               # unit + feature tests
npm run test:features  # feature (Gherkin) tests only
```

- **HashRouter** (not BrowserRouter) — static hosting (GitHub Pages / local) with no
  rewrite config.
- **Target browser is Safari** → no File System Access API; persistence is IndexedDB
  (working store) + JSON **export** (the durable backup — Safari may evict idle IDB).
- CLI/scripts run on **native Node ≥22** (strips TS types — no build step, no `tsx`).

## Architecture

Two committed parts: the **SPA** and the generic **schema** (`src/schema/`, provider-
neutral). A private, one-shot CLI import pipeline (done) emits a finished `RecipeDataset`
in that schema — its internals + provider specifics live in the handover. The SPA only
ever sees our schema, never raw provider JSON.

- **App layer (`src/app/`)** — use-cases orchestrating Dexie + pure libs (e.g.
  `importRecipeDataset`). This is the seam the UI **and** the feature tests both call:
  pages stay thin shells, so behaviour is tested below React. Pure shaping/validation
  stays in `src/lib/` (e.g. `parseRecipeDataset`); the Dexie write goes in `src/app/`.
- **Reference data** (recipes) seeds into IndexedDB from `public/demo/recipes.json` on
  first run, and re-seeds when `DEMO_VERSION` (`src/db/seed.ts`) is bumped — but **never
  when `dataSource === 'user'`** (a real import sets this, so user data is never
  clobbered).
- **User data** (stars, plans, cooked history, shopping ticks) lives in IndexedDB; its
  durable backup is an exported JSON.

### Data model (the non-obvious bits)

- **Ingredient binding:** each recipe line may carry a canonical `ingredientId` (the
  dictionary, `src/data/ingredients.ts`) — this binding is what **merges the shopping
  list across recipes**. Imports leave it empty; binding is **lazy**, done in-app at
  shopping time and reused thereafter (the dictionary then grows in IndexedDB and exports
  with user data). Unbound lines still shop, just verbatim / un-merged.
- **Units** (`src/lib/units.ts`): count / volume / mass; conversion within a dimension is
  free, volume↔mass needs a per-ingredient density (optional).
- **Shopping merge** (`src/lib/shopping.ts`): scale to portions, sum each ingredient in
  its **purchase unit** where convertible, else keep the **recipe unit** as its own line.
  Pure + unit-tested — keep it that way.
- Pluralisation: dictionary `plural` overrides; otherwise `pluralize`.
- Optional, back-compatible recipe fields: `nutrition` (per-portion macros), ingredient
  `sourceRef` (stable source id → bind once, reuse across recipes), `tags` (derived
  diet/effort labels + source categories).

## Testing

Two tiers, one runner (Vitest 4):

- **Unit** — `src/**/*.test.ts` beside the code, for tight pure logic (`parseQuantity`,
  `units`, `shopping`, dataset validation). Import from `vitest` explicitly (no globals);
  keep fixtures local.
- **Feature (Gherkin)** — living documentation. `.feature` files in `features/`, steps in
  `features/steps/*.steps.ts` via `@amiceli/vitest-cucumber`. Steps drive the **app
  layer** against **`fake-indexeddb`** — real Dexie code paths, no browser, no React
  ("just below the UI"). `test/setup.ts` installs `fake-indexeddb/auto`;
  `test/factories.ts` builds valid records; each scenario's `Background` resets the store
  (per-scenario isolation). `tsconfig.app.json` also type-checks `test/` + `features/`,
  so `npm run build` catches errors there too.

## House rules

- **Green before every commit:** `npm run build` *and* `npm test` both pass. No exceptions.
- **Every new feature ships with a Gherkin scenario** covering it — that's the regression
  net and the living docs. Tight, focused logic also gets unit tests.
- **New IndexedDB logic goes in `src/app/`**, not inline in components.
- Keep `src/lib/` pure (no Dexie, no I/O) and unit-tested.
- **Commit freely; never `git push`** — pushing is the developer's. Surface commit SHAs.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Comments** explain what the code does now (+ why if non-obvious); never narrate history.
- Honour the **privacy firewall** on every change.
