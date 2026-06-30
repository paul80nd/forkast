# Refine → Clean up — feature spec

The **Clean up** tab of Refine: bulk-delete the recipes you've rated ★1–2 ("bin it" / "very
bin it"). Also the home of the **single delete path** that every delete in the app routes
through. Part of the Refine section ([`refine-spec.md`](refine-spec.md)). Built 2026-06-29;
proof in `features/cleanup.feature`.

> A **feature spec**: design + rationale; the executable proof is `features/cleanup.feature`.

## ★-driven cleanup

Lists the recipes you've binned, **split into two lists by tier** (built 2026-06-30) — because
★1 and ★2 mean different things even though both usually end in deletion:

- **★1 · Very bin it** — "you hate these; select all and clear them out in bulk."
- **★2 · Bin it** — "you don't like these, but here's a chance to reconsider before they go."

Each list has its **own** select-all + delete, so you can blitz the ★1s and pick through the
★2s independently. The subtle framing nudge — bulk-delete vs. reconsider — is the whole point;
mechanically both call the same delete path. In each list you **tick** the ones to remove (or
"select all"), then **confirm**. Nothing is pre-selected — deletion is destructive and real (no
tombstones; see *Import & deletion model* in [`refine-spec.md`](refine-spec.md)), so the
conservative default is to select nothing. A list is hidden entirely when that tier is empty.

## The single delete path (total)

All deletion calls `deleteRecipes` in `src/app/cleanup.ts`, and it is **total** — this is what
makes a later re-import start clean rather than inheriting stale curation:

- **Cascades to groups** — removes the recipe from its variant group, dissolving the group if
  that drops it below two members.
- **Purges the recipe's user data** — its stars/notes, cooked history, and its slot in any
  plan. (Plan-derived shopping ticks are left; stale keys are simply ignored.)

So re-importing a previously-deleted recipe starts it **clean**, with no stale rating or
orphaned group membership.

## Delete is reachable outside Refine too

The same total delete path is wired to direct actions, for clearing things out without
★-rating first:

- **Browse multi-select** — a checkbox per card, then a **"Delete selected"** bar (selection
  clears when filters change).
- **Recipe page** — a **"Delete recipe"** item in the "Add to week" split-button dropdown.

Both confirm before deleting.

## Images — orphaned on delete, pruned offline

Deleting a recipe leaves its **image file on disk orphaned**: the browser can't touch the
filesystem (Safari, no File System Access API), and an orphan is harmless — nothing references
it, and the image route only ever serves files a surviving recipe points at.

Reclaiming the disk space is a deliberate **offline prune**, not an in-app action:
**`scripts/prune-private.ts`** (committed, generic, native Node ≥22) takes a Save/Open export
and deletes every `raw/`, `clean/`, and `images/` file whose recipe is no longer in the
export. It keeps `raw/<slug>.json` + `clean/<slug>.json` by slug and `images/<recipe.image>`
by the literal image filename (extensions vary — `.jpg`/`.jpeg`/`.png`), dry-runs by default,
and only unlinks with `--confirm` (refusing an empty export, which would delete everything).

```
node scripts/prune-private.ts <export.json>            # dry-run: orphans + counts
node scripts/prune-private.ts <export.json> --confirm  # actually unlink
```

The workflow: refine the collection in-app, **Config → Save** a backup, then run the prune
against that export to shrink the private file cache to match.
