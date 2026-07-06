# Use up ingredients — feature spec

A **use-it-up** helper on the Plan page: keep a lightweight list of ingredients you have to cook
down (leftover spinach, half a jar of harissa), see which your planned week **doesn't** already
use, and get recipes across the collection that **do** — each addable straight to the week.
Provider-neutral by design.

> A **feature spec**: the design and rationale for one area, sitting alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). Living
> documentation — it ships with the Gherkin scenarios in `features/use-up.feature` (the
> executable proof) and unit tests for the pure matcher; this prose keeps the *why*.
>
> **Status: built 2026-07-06.** Pure logic `src/lib/useUp.ts` (+ unit tests), app seam
> `src/app/useUp.ts` (+ `features/use-up.feature`), and the `UseUpPanel` on the Plan page.

## Why

You often finish a week with odd ingredients left over, or buy something with only one recipe in
mind. The app already knows every recipe's ingredients; it should close the loop — *"what can I
make with the spinach before it wilts?"* — and drop the answer straight into the plan. It's the
mirror image of Shop: instead of *plan → buy*, it's *have → plan*.

## The list ("ingredients I have")

A **manually-curated list of ingredient names, no quantities** — deliberately not a pantry (see
the [decisions.md](decisions.md) entry, 2026-07-06). Each `UseUpItem` is a `name`, plus an optional
`ingredientId` when the entry was picked from the dictionary (which enables exact id/binding
matching and a stable label). Free-typed entries carry only a name and match by name tokens.

- Persisted as a **single `settings` row** (`key: 'useUp'`, a `UseUpItem[]`), exactly like the
  aisle order — no schema table, and it **rides along in the backup** snapshot automatically.
- Managed in the Plan-page **Use up ingredients** panel: an add box autocompletes from the
  dictionary (`matchIngredient`), free text is allowed, and each item is a removable chip.

## Unused vs on-plan

Each list item is flagged by whether **any recipe currently on the plan uses it**:

- **on plan** — a planned recipe already burns it down; nothing to do.
- **unused** — no planned recipe uses it; these are what suggestions target.

"Uses" is decided by the same matcher as suggestions (below), so an unbound recipe line counts.

## Suggestions (have → plan)

**Suggest recipes** ranks the **whole collection** by how many of the **unused** items each recipe
uses:

- **Coverage first** — most matched ingredients win; **★ breaks ties** (favourites first, so
  unrated/binned recipes sink but still appear — the widest useful net, per the settled decision).
- **Excluded:** recipes already on the plan, and household **no-go allergens** (belt-and-braces
  `['fish']`, mirroring the Suggest-a-week filter).
- Returns nothing when the list is empty or the plan already covers every listed ingredient.

Each result shows its image, ★, and a **"uses spinach, harissa · 2"** coverage line, with **Open**
(the read-only recipe pop-up) and **Add to plan** (reuses `addToPlan`, with a confirmation toast).
Non-destructive: nothing is written until you add.

## The matcher (works on unbound lines)

Most recipe lines carry no `ingredientId` (binding is lazy, done in Shop), so matching **cannot**
rely on canonical ids. `lineMatchesItem` (`src/lib/useUp.ts`, pure) tries, in order:

1. the line's own `ingredientId` equals the item's, or
2. an existing shopping-time **name binding** resolves the line to the item's id, or
3. **name tokens** match — one name's tokens (lowercased, singularised, stopwords dropped via the
   shared `tokenize`) are a **subset** of the other's. So "chicken" matches "chicken thighs" and
   "onion" matches "spring onions", while "pea" does **not** match "peach" (token subset, never
   character substring). Deliberately inclusive — a use-up list wants to catch every recipe that
   could use the ingredient.

Reuses `tokenize`/`jaccard` (`src/lib/similarity.ts`) and `normalizeName` (`src/lib/shopping.ts`,
the bindings key). The dictionary/binding machinery is otherwise untouched.

## Seams + tests

- **Pure** `src/lib/useUp.ts`: `namesMatch`, `lineMatchesItem`, `recipeUsesItem`, `coverageFor`,
  `planCoverage`, `rankUseUpRecipes` — no Dexie, unit-tested (`src/lib/useUp.test.ts`: id/binding/
  name matching, coverage, ranking order, no-go + already-planned exclusion, plan-coverage).
- **App** `src/app/useUp.ts`: `getUseUp`/`setUseUp`/`addUseUpItem`/`removeUseUpItem`,
  `getUseUpStatus`, `suggestUseUpRecipes` — the seam the UI and feature tests share.
- **UI** `src/components/UseUpPanel.tsx`, mounted on `PlanPage`.
- `features/use-up.feature` covers: on-plan vs unused flagging; coverage ranking; unused-only
  targeting (a covered ingredient stops driving suggestions); no-go exclusion; and adding a
  suggestion to the plan.

## Not built / later

- **No quantities / no shopping-list deduction** — the list is names only (the settled decision).
  A quantified pantry that also nets off the Shop list is a possible future, kept out of scope.
- Per-item **target toggles** (choose which unused items to search for) and a coverage threshold
  are easy follow-ups if the whole-collection net feels too wide.
