# Plan → Suggest a varied week — feature spec

The **assisted planning** layer on top of the manual Plan page: a *"suggest a varied week"*
action that proposes a balanced set of meals from your shortlist, which you then reroll, swap,
or accept. Provider-neutral by design.

> A **feature spec**: the design and rationale for one area, sitting alongside the whole-app
> [`spec.md`](spec.md) (this is the "Assisted planning" item under *Later*) and the
> cross-cutting [`decisions.md`](decisions.md). Living documentation — the build will ship with
> Gherkin scenarios in `features/`; the planned ones are listed at the foot.
>
> **Status: design settled (2026-06-30), not built.** Decisions resolved at the foot; ready to
> slice up and build.

## Why

The manual Plan page already lets you add meals and *eyeball* variety (cuisine / protein / time
badges + a "not cooked recently" hint). But with thousands of rated recipes, staring at the
shortlist to assemble a balanced week is exactly the chore the app should take off you. Every
input the household cares about is now captured:

| Signal | Source | Role in suggestion |
| --- | --- | --- |
| **★ quality** | Curate (`stars`) | Eligibility (★3+ pool) + a quality weight; ★4–5 favoured, ★3 are variety injectors |
| **◆ rotation** | Curate (`rotation`, 1–5) | How often you *want* it — caps how readily a favourite recurs; high = recovers fast, low = rarely |
| **Cuisine** | import (`cuisine`) | Variety axis |
| **Main protein** | import (`mainProtein`) | Variety axis |
| **Time / effort** | import (`prepTime`) | Variety axis (banded) |
| **Recency** | `cooked` history | "Not cooked recently" — recently-cooked is suppressed |
| **Variant groups** | Refine (`variantGroups`) | A group counts as **one unit**; never suggest two members of the same group |

The goal is a small, **non-destructive proposal** you refine, not an auto-populated plan —
consistent with the app's "never auto-apply" ethos (the group/duplicate suggesters propose, the
user confirms).

## The pool (eligibility)

A candidate is eligible when it is:

- **A keeper** — rated **★3+** (the planner's pool; ★1–2 are bin, unrated isn't ready).
- **Not a household no-go** — same exclusion the manual picker already applies (e.g. `fish`).
  (No-go *proteins* are excluded upstream at dataset build; this is the belt-and-braces runtime
  filter the Plan picker already uses.)
- **Not already on the plan**, and **not from a variant group already represented** on the plan
  or earlier in the same suggestion run.

Within a variant group, the **representative** member is chosen the same way the duplicate
keeper is (`chooseKeeper`-style): highest ★, then highest rotation, then least-recently cooked.
The user can later swap a suggested slot to any **sibling** in its group (see *UX*).

## The scoring model

Each candidate gets a **score** (higher = more wanted). The score blends an intrinsic part
(fixed per recipe) and a **dynamic variety penalty** that depends on what's already in the
basket — which is what makes the *week* varied rather than just "the top N recipes".

### Intrinsic terms

- **Quality** — increases with ★ (★5 > ★4 > ★3). ★3 deliberately sits well below ★4 so a week
  leans on favourites but can be spiced with variety injectors.
- **Due-ness** — combines **recency** and **rotation** into one "is it due?" term:

  ```
  dueness = daysSinceCooked / expectedInterval(rotation)
  ```

  `expectedInterval` grows as rotation drops — an *On repeat* (◆5) recipe becomes due again
  quickly, a *Rarely* (◆1) one stays suppressed for a long time. Never-cooked recipes are
  treated as very due (but not infinitely — so a never-cooked ◆1 doesn't dominate). A recipe
  **cooked within a short cooldown** (e.g. ≤ N days) is hard-excluded regardless.

### Dynamic variety penalty

As each meal is chosen, candidates that **share an axis value** with the current basket are
penalised — one penalty each for a repeated **cuisine**, **main protein**, or **time band**
(prepTime banded into quick / medium / long). Penalties are **soft** (subtract from the score),
so a clearly superior recipe can still repeat an axis, but all else equal the suggester spreads
across cuisines, proteins, and effort levels.

### Selection — greedy weighted fill

1. **Seed the basket** with what's already planned (and any slots the user has **locked**) —
   their axis values count toward the variety penalty from the start.
2. **Repeat until the target count is reached:** score every remaining eligible candidate
   against the current basket, then pick one. Picking is **weighted-random among the top
   candidates** (not strictly the single top) so rerolls feel fresh and the same collection
   doesn't yield an identical week every time. A **seed** makes this deterministic for tests.
3. **Enforce group exclusion** as you go (adding a meal blocks its whole group).
4. **Stop early** if the eligible pool is exhausted (small collection / tight filters) — the
   suggester returns fewer than asked and says so, rather than repeating an axis to pad.

Greedy-with-dynamic-penalty is chosen over a global optimiser: it's simple, fast, explainable
("picked for variety — new cuisine this week"), and naturally supports **per-slot reroll**.

## UX

A **"Suggest a week"** button on the Plan page, with a target meal **count** control. It fills
the **remaining** slots (respecting meals already planned and the chosen portions), and presents
the result as a **reviewable shortlist**, not a committed plan:

- Each suggested slot shows the recipe, plus a short **"why"** (e.g. *favourite · new cuisine ·
  due*), and controls:
  - **Reroll** — replace this slot with the next-best candidate (the rejected one is excluded
    from this run).
  - **Lock** — keep this slot while rerolling the rest / re-suggesting.
  - **Swap variant** — when the recipe is in a group, switch to a named sibling.
  - **Remove** — drop the slot.
- A **variety summary** (reuses the manual page's cuisine/protein tally) shows the proposed week
  at a glance.
- **Accept** commits the shortlist into the plan (`addToPlan` each); **Re-suggest** rerolls all
  unlocked slots; dismiss leaves the plan untouched. Nothing is written until you accept.

The manual add/remove/portions/cooked flow is unchanged — the suggester sits above it.

## App layer & testing

Per house rules, the **pure selection logic** lives in `src/lib/suggest.ts` — deterministic
given `(candidates, basket, seed)`, no Dexie, **unit-tested** (scoring, the dueness curve, the
variety penalty, group exclusion, small-pool fallback). The **Dexie reads** that assemble the
candidate set and the **writes** that accept a suggestion go through `src/app/` (alongside the
existing plan writes).

> **House-keeping note:** the current plan writes live in `src/lib/plan.ts`, which does Dexie
> I/O — the same `src/lib` → `src/app` wrinkle Curate had before the rotation work. Building the
> suggester is a natural moment to move the plan Dexie writes to `src/app/plan.ts` and keep
> `src/lib` pure (the suggester's scorer being the first pure-lib resident).

Planned Gherkin (`features/suggest-week.feature`), driving the app layer against
`fake-indexeddb`:

- Suggests only keepers (★3+), never a no-go, never an already-planned recipe.
- Never suggests two members of the same variant group.
- Honours locked slots and fills only the remaining count.
- A recently-cooked recipe (inside the cooldown) is not suggested; a long-ago / never-cooked one
  is favoured.
- A low-rotation recipe recurs less readily than a high-rotation one at equal recency.
- Reroll replaces a slot without disturbing the others; Accept writes exactly the shortlist.
- With too small a pool, returns fewer than asked rather than repeating.

Determinism for tests comes from passing a fixed **seed** to the pure scorer; the UI uses a
fresh seed per run for variety.

## Decisions (settled 2026-06-30)

1. **Target week length — 5, adjustable.** A count control defaults to **5** and is **persisted**
   (like the Curate focus filters); change it per week for leftovers / guests.
2. **Propose-then-accept.** The suggestion is a **non-destructive shortlist**; nothing is written
   to the plan until you Accept. Matches the group/duplicate suggesters.
3. **Fresh each time.** Selection is **weighted-random among the leading candidates** (a softmax
   over the top scores), so re-suggesting / rerolling yields a different valid week. A **seed**
   per run makes it deterministic for tests; the UI uses a fresh seed each run.
4. **Soft variety.** Repeating a cuisine / protein / time-band is **penalised, not forbidden** —
   a standout recipe can still repeat an axis. Revisit toward harder constraints only if weeks
   feel samey.
5. **Favour favourites, no quota.** ★4–5 carry a real quality weight so a week leans on
   favourites, but there's **no hard minimum** — a ★3-heavy week is allowed if variety/dueness
   genuinely score it best.
6. **Multi-week awareness — out of scope.** Single current week, like the rest of Plan; revisit
   with multi-week history.

### Tuning starting points (first guess — tune by eye)

These set the *shape*; expect to adjust after seeing real weeks. All live as named constants on
the pure scorer so they're one place to turn.

- **Hard cooldown:** don't suggest anything **cooked in the last 7 days** (no re-suggesting this
  week's meals), regardless of score. Beyond that, dueness governs softly.
- **`expectedInterval(rotation)`** (days), roughly doubling as rotation drops:
  ◆5 ≈ 7 · ◆4 ≈ 14 · ◆3 ≈ 28 · ◆2 ≈ 56 · ◆1 ≈ 112. `dueness = daysSinceCooked / interval`
  (≥ 1 ≈ "due"). So an *On repeat* recipe is due again in a week; a *Rarely* one stays suppressed
  for months.
- **Never-cooked dueness capped at ≈ 2.0** (treated as "well overdue" but not infinite), so a
  brand-new ◆1 doesn't crowd out a due favourite.
- **Weights:** quality and dueness contribute on a comparable scale; each repeated variety axis
  subtracts a penalty of similar magnitude to one ★ step. Exact numbers TBD in the unit tests.
