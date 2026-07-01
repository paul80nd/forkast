# Shop — feature spec

Shop is the **buy** stage: it turns the planned week into one merged, tick-off-able shopping
list. You still cook from your own cards — Shop just gets the right amounts into the basket in
one pass. Provider-neutral by design (the dictionary and unit system are generic knowledge).

> A **feature spec**: the design and rationale for one area, sitting alongside the whole-app
> [`spec.md`](spec.md) and the cross-cutting [`decisions.md`](decisions.md). It's living
> documentation — each piece ships with a Gherkin scenario in `features/shop.feature`, which is
> the executable proof, while this prose keeps the *why*.

## The derived list

The list is **derived**, never stored: `buildShoppingList` (`src/lib/shopping.ts`, pure +
unit-tested) takes the plan's recipes and portions and merges their ingredient lines. The app
seam `getPlanShoppingList` (`src/app/shopping.ts`) assembles the inputs from Dexie (recipes,
portions, dictionary, bindings) and calls it; `ShopPage` renders it via a live query, so it
recomputes whenever the plan, ratings, dictionary, or bindings change.

For each ingredient line:

- **Scale** to the plan's portions (`factor = portions / recipe.serves`).
- **Resolve** to a canonical dictionary ingredient — by the line's own `ingredientId` if set,
  else by a lazy **name binding** (below). Unresolved lines stay **verbatim** in a separate
  "Check these" group rather than being dropped.
- **Merge + convert**: sum a resolved ingredient in its **purchase unit** where the recipe unit
  converts to it (free within a dimension; volume↔mass needs a **density** — see below); where
  it doesn't convert, keep the recipe-unit amount as its own line.
- Lines are grouped by **aisle** (`AISLE_ORDER`, unknown aisles fall to the end) and sorted
  **alphabetically by name** within each aisle.

Each line reads **name-first** so it scans and sorts by ingredient: `dried chilli flakes · 11 g`,
`spring onions · × 2` (count uses `× N`; weight/volume uses the amount + unit).

Alongside the aisle groups the list carries: **`unmatched`** (verbatim, un-merged — the bind
targets), **`unquantified`** (no parseable quantity, e.g. "to taste"), and **`basics`**
(store-cupboard items, deduped, shown as "assumed in").

**Spot-check affordances on each line:** a merged line shows the recipe-unit **breakdown**
(`detail`, e.g. "3 tbsp") and **"from N recipes"** when it combines 2+ recipes, so the amounts
can be checked against the recipes while shopping. Names are pluralised only for countable
items with qty > 1 ("2 limes"); weight/volume names stay singular ("1 tbsp garam masala").

## Tick-off + extras

Tick-off state and manually-added extras are **per plan**, in the `shopping` store
(`{ id, checked[], extras[] }`), written through `toggleChecked` / `clearChecked` /
`addExtra` / `toggleExtra` / `removeExtra` in `src/app/shopping.ts`. The list itself is derived,
so only the ticks + extras are persisted.

## Lazy ingredient binding (at shopping time)

Imported recipes carry **no** `ingredientId`, so on real data almost every line starts
un-merged. Rather than a batch matcher, binding is **lazy and done in Shop**: bind an ingredient
to a dictionary entry (or create a new one, or leave it verbatim), and it merges from then on.

- **Keyed on ingredient name**, not the finer-grained source id — one binding merges every line
  of that name across the plan. See the [decisions.md](decisions.md) entry (2026-07-01) for the
  data that settled this (one name spans many source ids).
- Stored in the **`bindings`** table (`name → ingredientId`), resolved at list-build time.
  Recipes are **not** mutated, so bindings survive a re-import and ride along in the backup.
- The **dictionary** is a seeded, growable Dexie table (`dictionary`, `IngredientDef` rows),
  seeded from the built-in generic list on first run (`seedDictionaryIfEmpty`) and grown by
  create-at-shopping-time. Both tables are in the backup snapshot (v3).

### The bind flow (UI)

Each "Check these" line has a **Bind** toggle opening a picker:

- **Did you mean?** — ranked dictionary candidates from `matchIngredient` (`src/lib/
  ingredientMatch.ts`, pure): token overlap (singularised, stopwords dropped) with an exact-name
  match scoring 1 and substring containment floored at 0.85.
- A **search** box to find any dictionary entry.
- **Create new** — name + aisle + purchase unit (+ density preset when bought by weight/volume);
  `createIngredient` adds a dictionary entry (unique slug id) and binds in one step.

### Density (volume ↔ mass)

A weight-bought ingredient measured in spoons (tbsp/tsp) needs a **density** (`densityGPerMl`)
to convert to grams: `grams = ml × density` (1 tbsp = 15 ml, 1 tsp = 5 ml). `DENSITY_PRESETS`
(`src/data/ingredients.ts`) offers generic per-type approximations (dried herb ~0.2, ground
spice ~0.47, seeds ~0.55, flour ~0.55, sugar ~0.85, oil/sauce ~1.0, salt ~1.2) — good enough for
a shopping estimate. With a density set, the line converts to the buy unit and keeps the original
spoon amount in its `detail`; without one, it stays in the recipe unit.

### Managing bindings

A collapsible **"Your bindings"** panel lists the saved bindings, each showing the bound
ingredient and its buy unit ("cumin seeds → cumin seeds (in g)"). Per binding you can **Edit**
the ingredient's aisle, purchase unit, and density (`updateIngredient` / `setIngredientDensity`),
or **Unbind** (back to verbatim). The list has a filter box and 50-at-a-time infinite scroll
(mirrors Browse) since the dictionary grows over time.

## Seams + tests

- Pure logic in `src/lib/shopping.ts` (merge/convert/format) and `src/lib/ingredientMatch.ts`
  (ranking) — no Dexie, unit-tested.
- Dexie use-cases in `src/app/shopping.ts` (`getPlanShoppingList`, tick/extras, `setBinding`/
  `unbind`, `createIngredient`, `updateIngredient`) — the seam the UI and feature tests share.
- `features/shop.feature` covers merge, scale, verbatim, tick/extras, bind-merges,
  create-then-bind, density conversion, editing an ingredient, and the per-line recipe count.

## Not built / later

- **No aisle is derived** — an ingredient's aisle is whatever the dictionary entry says (set on
  create, editable in the bindings panel).
- A dedicated dictionary manager (beyond the bindings panel), bulk-bind, and richer
  create-ingredient fields (aliases, explicit plural) are possible later.
