# Variants — one dish, many swaps (BUILT)

> **Status: built, and it *supersedes* the manual Recipe Groups feature** (which has been
> removed). The "groups vs variants" open question is resolved: variants are the single
> mechanism. Import seeds the grouping from a provider signal (`variantGroupKey`/
> `variantGroupLead`); the user curates it in **Refine → Variants**, with edits stored as a
> re-import-safe **override** layer. `groups-spec.md` / `refine-groups-spec.md` are retained
> only as historical design records.

## The problem

A single dish often exists as many near-identical recipes that differ only by a **swap**:

- **protein** — chicken breast ⇄ thigh ⇄ "double"; basa ⇄ cod
- **carb** — white rice ⇄ brown rice ⇄ cauliflower rice
- **bread / side** — sourdough ⇄ wholemeal pitta; "with dessert"; "with side"

Listing every one of these as its own card clutters Browse and adds no real variety (they're the
same meal). But **deleting** the extras loses genuinely useful options — you might actually want
the brown-rice version *this* week. So: keep them all, but present the dish **once**, and let the
swap be chosen at planning time.

## The shape (agreed)

**Keep variants as separate, first-class recipes; group them with a shared key; combine as a
*view*, never by embedding.** This mirrors [`groups-spec.md`](groups-spec.md)'s present-all,
link-not-embed stance, and keeps every variant searchable, re-import-safe, and — crucially —
directly plannable and shoppable (see *Planning* below).

### Data model (generic — the import supplies it)

Two optional, provider-neutral fields on `Recipe`:

- **`variantGroupKey?: string`** — recipes sharing a non-empty key are variants of one dish.
  How a provider *derives* the key is **provider-specific and lives in its private import
  adapter** — the app never learns the mechanism, only that two recipes share a key. (32-char
  opaque string in practice; costs ~309 KB across ~10k recipes — negligible.)
- **`variantGroupLead?: boolean`** — `true` on exactly one member per key: the **origin** / the
  default the app shows and pre-selects. The import provides a best-guess; the user can override
  (see below).

The key and lead flag are **import-provided signals**, not user data — they re-derive on every
import. Any **user override** (regrouping, re-designating the lead, splitting a variant out) is
**user data** and must survive re-import, exactly as group edits do today.

### Picking the lead (origin)

The origin is the recipe the others are elaborations of. Signal, in order:

1. **Oldest wins.** Variants are added *after* the base, so the earliest-created member is the
   origin. The provider knows creation order even when the app doesn't, so **the import picks the
   lead** and emits the generic `variantGroupLead` flag. (For our current source this is validated:
   the oldest member matches the plainest title ~79% of the time, and on inspection is the sensible
   base almost always; a different provider fills the flag from whatever "base recipe" signal it
   has — shortest title, an explicit base field, etc.)
2. **User override.** The import's pick is a *default*. If it's wrong for a group, the user
   re-designates the lead; that override is stored as user data and wins thereafter.

## Behaviour

### Browse — one card per dish
Collapse each `variantGroupKey` to its **lead** card (reusing the suggester's existing
one-member-per-group logic). Non-lead variants are **hidden from the main list but still
searchable / directly reachable** (they're real recipes, not deleted). This is the whole point:
the clutter goes away without losing anything.

### Recipe detail — the swap selector
On the lead's detail page, surface the **variant options**. The differences ("brown ⇄ cauliflower
rice", "chicken ⇄ thigh") are **computed live** by diffing the group's members — reuse the
Refine **Compare** ingredient-diff; nothing is precomputed or stored.

### Planning — choose the swap for the week
Because variants stay separate full recipes, planning needs **no new schema**:

- Adding a dish to the plan defaults to the **lead's** recipe id.
- Choosing a swap ("brown rice this week") just puts **that variant's** recipe id in the plan slot
  instead. The choice lives on the plan entry, so it's naturally **per-week**.
- The **shopping list is automatically correct** — it already reads the planned recipe's
  ingredients, so the brown-rice line falls out for free.
- The suggester likewise proposes the lead (one per group); swapping to a variant is the same
  id-substitution.

## Decisions (locked)

- **Variants are first-class recipes, not embedded deltas.** Rationale: re-import safety,
  searchability, and — the clincher — planning/shopping work with zero extra plumbing because the
  chosen variant *is* a recipe. Storage saving from deltas (~10–15 MB local) isn't worth the
  fragility of diffing/reapplying ingredient & instruction arrays.
- **Combine at view time.** The "one dish → lead + swaps" structure is built in memory from flat
  recipes + the shared key; deltas are derived, never persisted.
- **Mechanism stays private.** Only the generic `variantGroupKey` / `variantGroupLead` cross the
  boundary into `recipes.json`; how they're computed is a private import concern.

## As built

- **Effective grouping = import signal + user overrides.** Import seeds `variantGroupKey`/
  `variantGroupLead` on each `Recipe`. A `VariantOverride` user-data table (`{ recipeIds, leadId }`)
  layers on top: a recipe named by an override joins that override's dish (led by `leadId`),
  leaving its import group; everyone else groups by `variantGroupKey`. A single-member override
  **detaches** a recipe ("this isn't a variant"). Overrides are precious user data — they ride the
  backup and survive re-import. Pure resolution: `resolveDishes(recipes, overrides)` in
  `src/lib/variants.ts`; app seam `src/app/variants.ts` (`dishForRecipe`, `setVariantOverride`,
  `removeFromOverride`, `setOverrideLead`, `dissolveOverride`).
- **Refine → Variants** (replaces the old Group tab) is where the user curates: *suggest* merges the
  image-hash missed (text-match, kept only if a cluster spans >1 effective dish) → confirm + pick
  lead; *create* by hand; and an *all-dishes* list with re-lead / remove-member / revert-to-auto /
  **delete-recipe** (removes it outright via `deleteRecipe`, e.g. the unwanted "with dessert" combos —
  the delete cascade drops it from any override, promoting a new lead if it was the lead).
- **Resolved open questions:** *groups vs variants* → variants win, groups removed. *Lead-override
  storage/UI* → the override table + Refine → Variants (mirrors the old edit model). *Rating* →
  dish-level (Curate's group-aware rating fans onto the effective dish's unrated variants).
  *Recall gap* → the text-match suggester is the secondary net, folded into Refine → Variants.
- **Still open:** *search* (a hidden variant matching a query surfaces the variant directly today,
  not the lead-with-preselect); *counts/stats* for a readiness view; a *standing "default swap"*
  that isn't the lead (only per-week choice exists).

## Related

- [`groups-spec.md`](groups-spec.md) / [`refine-groups-spec.md`](refine-groups-spec.md) —
  **superseded** by this feature; kept as historical design records only.
- [`plan-suggest-spec.md`](plan-suggest-spec.md) — the suggester already collapses to one member
  per group; variants slot straight in.
