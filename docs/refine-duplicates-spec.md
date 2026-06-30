# Refine → Duplicates — feature spec

The **Duplicates** tab of Refine: find genuine near-duplicates — the *same* dish under a
different slug — and delete all but one. Part of the Refine section
([`refine-spec.md`](refine-spec.md)). Built 2026-06-29; proof in `features/duplicates.feature`.

> A **feature spec**: design + rationale; the executable proof is `features/duplicates.feature`.

## Same scorer, tighter preset

Duplicates is a second use of the *same* similarity scorer the [Group tab](refine-groups-spec.md)
uses — under a **tighter preset**, `DUPLICATE_OPTS` in `src/lib/similarity.ts`: high title
**and** ingredient overlap plus a high cluster-score floor.

**The title is the discriminator.** A protein/carb variant swaps a title word, so its title
overlap is low → that's a *group*, not a duplicate. A true duplicate is near-identical on
both title and ingredients → that's a delete. This single distinction is what separates the
two tabs cleanly without a separate algorithm.

`suggestDuplicateCandidates()` (`src/app/duplicates.ts`) feeds the scorer the **ungrouped**
recipes — recipes already in a group are curated-as-keep and excluded.

## The card UI

Mirrors the group suggester, but the action **deletes**. For each candidate cluster:

- The suggested **keeper** (`chooseKeeper` — highest ★, then most complete; pure + tested) is
  left **unticked**.
- Every other member is **pre-armed** for deletion.

So the common case — one keeper, the rest go — is a single confirm. The user can re-tick to
change which copies survive. Deletion goes through `deleteRecipes` (the total delete path; see
[`refine-cleanup-spec.md`](refine-cleanup-spec.md)). Thresholds are tunable by review.

The same side-by-side **Compare** as the Group tab is available, so you can verify two rows
really are the same dish before deleting.
