# Idea log for implementation

## Plan page review (2026-07-06)

Recommendations from reviewing the Plan page as a whole. Roughly priority-ordered; the top three
are the ones I'd do first.

### Features
- ✅ **Per-meal portions (leftovers / batch awareness).** ~~Portions is currently plan-wide ("Cooking
  for 2/4/6"). Allow overriding one meal (guests, or batch-cook for lunches) while the rest stay at
  the default. The shopping merge already scales per recipe (`factor = portions/serves`), so this is
  a per-meal portions map feeding the same maths.~~ **Built** — `WeekPlan.portionOverrides` +
  `setMealPortions` + the per-row `MealPortions` control; see
  [`docs/plan-portions-spec.md`](docs/plan-portions-spec.md).
- **Bring the manual picker up to the Suggest's level.** "Add meals" only offers ★3+ with a title
  search — no cuisine/protein/time filters and no include-unrated, unlike the suggester beside it.
  Add the same facets (reuse Browse's filter pipeline `src/lib/browseFilter.ts`) so manual adding
  isn't the poor cousin.
- **Weekly "at a glance" summary.** Alongside the cuisine/protein variety badges, show total active
  cook time and an effort balance (quick/medium/long nights — the suggester already bands prepTime),
  and optionally a per-week nutrition roll-up (macros are captured per recipe). *Why:* a glanceable
  sense of how heavy/varied the week is.
- **"Cooked this week" trail.** Marking cooked removes the meal silently (with undo). A small
  "cooked this week" strip (with un-cook) would close the loop and show what's been eaten, feeding
  the not-cooked-recently signal visibly.

### Polish
- **Unify variant swapping.** Two different UIs for the same action: a `<Select>` "Swap variant…"
  in the shortlist slot vs `⇄ N` chip buttons in the planned week. Pick one.
- **Multi-week / plan history.** Still a single current week (as speced for MVP). Noting it here as
  the natural home once day-assignment and cooked-history land.
