# Recipe editing — feature spec

Recipes arrive from the one-shot import (or the demo seed) and were, until now, read-only in the
app — you could rate, note, plan, or delete one, but not fix a typo in its title or set your own
**recipe-card number**. This feature makes a recipe's **scalar text editable in the full recipe
view** (`title`, `description`, and the printed **card code** `recipeCode`, e.g. `R1196`), plus its
**tag and allergen lists**, which are **independently editable** — a per-section chip editor rather
than part of the whole-recipe edit.

> A **feature spec**: the design and rationale for one area, alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). Living documentation —
> the app-layer logic ships with a Gherkin scenario (`features/recipe-edit.feature`) plus a unit
> test for the pure normalisation; this prose keeps the *why*.

## Scope

- **Editable now:** `title`, `description`, `recipeCode` (scalar text, via one Edit mode); and
  `tags` + `allergens` (chip lists, each edited **independently** in place).
- **Deliberately not yet:** ingredients and method. Those carry parsed quantities, units, and
  shopping-time ingredient bindings, so editing them is a larger, separate job.
- The card code is a free string, not a number — it mirrors what's printed on the source's card
  (letters + digits), and is the same field the importer seeds best-effort.
- Tags/allergens are free strings, tidied on save: trimmed, blanks dropped, de-duplicated
  case-insensitively (first spelling wins). An empty list clears the field.

## Where edits live — mutate the reference table

Edits write **straight to the `recipes` table**, in place — they are *not* layered as a precious
per-recipe override in `userData` (the way [`variants-spec.md`](variants-spec.md) overrides
grouping). This follows the existing precedent: `deleteRecipe` (`src/app/cleanup.ts`) already
mutates that table, and the Save/Open backup snapshot carries the whole `recipes` set, so an edit
**exports and restores** with no extra plumbing.

**Trade-off (accepted):** a fresh re-import or a `DEMO_VERSION` re-seed can overwrite an edit —
exactly as either would resurrect a deleted recipe. The exported JSON is the durable record in
both cases. See the [decision entry](decisions.md#2026-07-06--editing-a-recipe-mutates-the-reference-table-in-place).

## Shape of the code

- **Pure** (`src/lib/recipeEdit.ts`): `normalizeRecipeEdit(patch)` trims the scalars; **omits a blank
  title** (so it can never overwrite the real one); maps a blank card code to `undefined` (clearing
  it); allows an empty description; and runs `tags`/`allergens` through `normalizeStringList`
  (trim, drop blanks, de-dupe). Unit-tested.
- **App layer** (`src/app/recipeEdit.ts`): `updateRecipeDetails(recipeId, patch)` — get, merge the
  cleaned patch, put. A no-op if the recipe is missing or the cleaned patch is empty. This is the
  seam the feature tests drive; `setRecipeTags` / `setRecipeAllergens` are thin wrappers over it.
- **UI** (`src/components/RecipeDetail.tsx`): an `editable` prop (true only on the full
  [`RecipePage`](../src/pages/RecipePage.tsx); the shared Plan-page modal stays read-only) gates all
  editing. The **Edit** button turns the title, description, and card code into inputs with **Save**
  (disabled while the title is blank) and **Cancel**. Tags and allergens instead use a `ChipEditor`
  each — its own **Edit / Done** toggle reveals a × on every chip and an add box; every add/remove
  **persists immediately** (no separate Save). All editing targets the **shown** variant, like
  ratings/notes, and resets on navigation or a variant swap.
