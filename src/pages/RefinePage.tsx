import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { STAR_LABELS } from '../lib/curation'
import type { Recipe } from '../schema/recipe'
import { deleteRecipes } from '../app/cleanup'
import { suggestDuplicateCandidates } from '../app/duplicates'
import { chooseKeeper } from '../lib/duplicates'
import type { Stars } from '../schema/userData'
import type { CandidateCluster } from '../lib/similarity'
import { VariantsTab } from '../components/VariantsTab'
import { CompareView } from '../components/CompareView'

// Refine: tidy the collection — curate the variant groupings (src/components/VariantsTab),
// weed out near-duplicates, or bulk-delete the ★1–2 recipes you've binned. Thin shells over
// the app layer (variants / duplicates / cleanup); the invariants live there.
export function RefinePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  const [tab, setTab] = useState<'variants' | 'duplicates' | 'cleanup'>('variants')

  const byId = useMemo(
    () => new Map((recipes ?? []).map((r) => [r.id, r])),
    [recipes],
  )

  const starsById = useMemo(() => {
    const m = new Map<string, Stars>()
    for (const u of userData ?? []) if (u.stars) m.set(u.recipeId, u.stars)
    return m
  }, [userData])

  // Recipes rated 1–2★ ("bin it" / "very bin it"), worst first — the cleanup candidates.
  const binned = useMemo(() => {
    return (recipes ?? [])
      .map((r) => ({ recipe: r, stars: starsById.get(r.id) }))
      .filter((x): x is { recipe: Recipe; stars: Stars } => x.stars === 1 || x.stars === 2)
      .sort((a, b) => a.stars - b.stars || a.recipe.title.localeCompare(b.recipe.title))
  }, [recipes, starsById])

  if (recipes === undefined || userData === undefined) {
    return <p className="text-stone-600">Loading…</p>
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Refine</h1>
      <p className="mt-1 text-sm text-stone-600">
        Tidy your collection: group related recipes, weed out duplicates, or clear out the
        ones you’ve binned.
      </p>

      <div className="mt-4 flex gap-1 border-b border-stone-200">
        {(['variants', 'duplicates', 'cleanup'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition ${
              tab === t
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-stone-600 hover:text-stone-700'
            }`}
          >
            {t === 'variants'
              ? 'Variants'
              : t === 'duplicates'
                ? 'Duplicates'
                : `Clean up${binned.length ? ` (${binned.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'variants' && <VariantsTab recipes={recipes} byId={byId} />}

      {tab === 'duplicates' && (
        <DuplicatesSection byId={byId} starsById={starsById} />
      )}

      {tab === 'cleanup' && (
        <>
          <p className="mt-4 text-sm text-stone-600">
            Recipes you’ve binned, split by how you rated them. Deletion sticks across
            re-imports (the export is your backup).
          </p>
          <CleanupSection binned={binned} />
        </>
      )}
    </section>
  )
}

// Duplicates: find clusters of near-identical recipes (tight similarity) and delete the
// spares. Mirrors the group suggester's card UI, but the action removes the ticked rows.
// Nothing is pre-ticked (deletion is destructive); the keeper (highest ★, then most
// complete) is badged as a hint. A thin shell over src/app/duplicates.ts.
function DuplicatesSection({
  byId,
  starsById,
}: {
  byId: Map<string, Recipe>
  starsById: Map<string, Stars>
}) {
  const [candidates, setCandidates] = useState<CandidateCluster[] | null>(null)
  const [finding, setFinding] = useState(false)

  async function run() {
    setFinding(true)
    try {
      setCandidates(await suggestDuplicateCandidates())
    } finally {
      setFinding(false)
    }
  }
  function dismiss(cluster: CandidateCluster) {
    setCandidates((cs) => (cs ?? []).filter((c) => c !== cluster))
  }

  return (
    <div className="mt-5 rounded-xl border border-stone-200 bg-white dark:bg-stone-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Duplicates</h2>
        <button
          type="button"
          disabled={finding}
          onClick={run}
          className="rounded-md bg-[#2a673a] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#245330] disabled:opacity-50"
        >
          {finding ? 'Finding…' : candidates ? 'Refresh' : 'Find duplicates'}
        </button>
      </div>
      <p className="mt-1 text-sm text-stone-600">
        Recipes that look like the same dish — near-identical title and ingredients (not a
        protein/carb swap; those belong in a group). Tick the ones to delete; the suggested
        keeper is badged.
      </p>

      {candidates && candidates.length === 0 && (
        <p className="mt-3 text-sm text-stone-600">
          No duplicates — nothing ungrouped looks near-identical.
        </p>
      )}
      {candidates && candidates.length > 0 && (
        <>
          <p className="mt-3 text-xs text-stone-600">
            Showing {Math.min(candidates.length, 25)} of {candidates.length}.
          </p>
          <ul className="mt-2 space-y-3">
            {candidates.slice(0, 25).map((c) => (
              <DuplicateCard
                key={c.recipeIds.join(',')}
                cluster={c}
                byId={byId}
                starsById={starsById}
                onDone={() => dismiss(c)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

// One duplicate cluster: keeper badged + unticked, the rest pre-ticked for deletion. Compare
// to be sure, then "Delete selected" removes the ticked recipes for good (cascades via
// deleteRecipes). Dismiss hides the cluster without touching anything.
function DuplicateCard({
  cluster,
  byId,
  starsById,
  onDone,
}: {
  cluster: CandidateCluster
  byId: Map<string, Recipe>
  starsById: Map<string, Stars>
  onDone: () => void
}) {
  const members = cluster.recipeIds
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => r !== undefined)
  const keeperId = useMemo(
    () =>
      chooseKeeper(
        members.map((r) => ({
          id: r.id,
          stars: starsById.get(r.id),
          ingredientCount: r.ingredients.length,
          hasImage: Boolean(r.image),
        })),
      ),
    [members, starsById],
  )
  // Nothing pre-armed — deletion is destructive, so the user ticks what to remove. The
  // keeper is only a hint (badged), not a default selection.
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [comparing, setComparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const count = checked.size

  function toggle(id: string) {
    setChecked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  async function remove() {
    if (count === 0) return
    if (
      !window.confirm(
        `Delete ${count} recipe${count === 1 ? '' : 's'} for good?\n\n` +
          'This can’t be undone (re-import to restore).',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteRecipes([...checked])
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-lg border border-stone-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-stone-600 uppercase">
          {Math.round(cluster.score * 100)}% similar
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setComparing((c) => !c)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
          >
            {comparing ? 'Hide compare' : 'Compare'}
          </button>
          <button
            type="button"
            disabled={busy || count === 0}
            onClick={remove}
            className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 disabled:opacity-50"
          >
            Delete selected{count ? ` (${count})` : ''}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
          >
            Dismiss
          </button>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5">
        {members.map((r) => {
          const stars = starsById.get(r.id)
          const isKeeper = r.id === keeperId
          return (
            <li key={r.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked.has(r.id)}
                onChange={() => toggle(r.id)}
                className="size-4 rounded border-stone-300 accent-rose-500 focus:ring-rose-400"
              />
              {stars ? (
                <span className="w-12 shrink-0 truncate text-xs text-amber-700">
                  {'★'.repeat(stars)}
                </span>
              ) : (
                <span className="w-12 shrink-0" />
              )}
              <span
                className={`min-w-0 truncate text-sm ${
                  checked.has(r.id) ? 'text-rose-600 line-through' : 'text-stone-800'
                }`}
              >
                {r.title}
              </span>
              {isKeeper && (
                <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                  keep
                </span>
              )}
              <span aria-hidden className="flex-1" />
            </li>
          )
        })}
      </ul>

      {comparing && <CompareView recipes={members} />}
    </li>
  )
}

// Bulk-delete the binned recipes, split into two lists by tier: ★1 ("very bin it" — delete
// in bulk) and ★2 ("bin it" — a chance to reconsider). Each list deletes independently.
function CleanupSection({ binned }: { binned: { recipe: Recipe; stars: Stars }[] }) {
  if (binned.length === 0) {
    return <p className="mt-2 text-sm text-stone-600">Nothing binned — nothing to clean up.</p>
  }
  const ones = binned.filter((b) => b.stars === 1)
  const twos = binned.filter((b) => b.stars === 2)

  return (
    <div className="mt-3 space-y-5">
      {ones.length > 0 && (
        <CleanupList
          items={ones}
          tier={1}
          prompt="You hate these — select all and clear them out in bulk."
        />
      )}
      {twos.length > 0 && (
        <CleanupList
          items={twos}
          tier={2}
          prompt="You don’t like these, but here’s a chance to reconsider before they go."
        />
      )}
    </div>
  )
}

// One tier's bin list with its own selection. Nothing is pre-selected (delete is destructive
// and real); tick, or select all, then confirm. Deletes cascade to groups via deleteRecipes.
function CleanupList({
  items,
  tier,
  prompt,
}: {
  items: { recipe: Recipe; stars: Stars }[]
  tier: Stars
  prompt: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const allSelected = items.every((b) => selected.has(b.recipe.id))
  const count = items.filter((b) => selected.has(b.recipe.id)).length

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((b) => b.recipe.id)))
  }
  async function remove() {
    const ids = items.map((b) => b.recipe.id).filter((id) => selected.has(id))
    if (ids.length === 0) return
    if (
      !window.confirm(
        `Delete ${ids.length} recipe${ids.length === 1 ? '' : 's'} for good?\n\n` +
          'This can’t be undone (re-import to restore).',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await deleteRecipes(ids)
      setSelected(new Set())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white dark:bg-stone-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-stone-700">
            <span className="text-amber-700">{'★'.repeat(tier)}</span>{' '}
            {STAR_LABELS[tier]}{' '}
            <span className="font-normal text-stone-600">· {items.length}</span>
          </h3>
          <p className="mt-0.5 text-xs text-stone-600">{prompt}</p>
        </div>
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={remove}
          className="shrink-0 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 disabled:opacity-50"
        >
          Delete {count || ''} selected
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 border-t border-stone-100 pt-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="size-4 rounded border-stone-300 accent-orange-500 focus:ring-orange-400"
        />
        Select all
      </label>
      <ul className="mt-1 divide-y divide-stone-100">
        {items.map(({ recipe }) => (
          <li key={recipe.id} className="flex items-center gap-2 py-1.5">
            <input
              type="checkbox"
              checked={selected.has(recipe.id)}
              onChange={() => toggle(recipe.id)}
              className="size-4 rounded border-stone-300 accent-orange-500 focus:ring-orange-400"
            />
            <Link to={`/recipe/${recipe.id}`} className="flex-1 truncate text-sm text-stone-800 hover:text-orange-700">
              {recipe.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
