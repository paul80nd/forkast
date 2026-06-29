import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { resolveAsset } from '../lib/assets'
import type { Recipe } from '../schema/recipe'
import type { VariantGroup } from '../schema/userData'
import {
  createGroup,
  deleteGroup,
  removeRecipeFromGroup,
  suggestGroupCandidates,
  type GroupMemberInput,
} from '../app/groups'
import { deleteRecipes } from '../app/cleanup'
import { suggestDuplicateCandidates } from '../app/duplicates'
import { chooseKeeper } from '../lib/duplicates'
import type { Stars } from '../schema/userData'
import type { CandidateCluster } from '../lib/similarity'

// Refine: tidy the collection by linking related recipes into variant groups. Manual
// grouping for now (the similarity suggester and ★-cleanup come later). A thin shell over
// src/app/groups.ts — all the invariants live there.
export function RefinePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const groups = useLiveQuery(() => db.variantGroups.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<GroupMemberInput[]>([])
  const [axis, setAxis] = useState<'' | NonNullable<VariantGroup['axis']>>('')
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState<CandidateCluster[] | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [tab, setTab] = useState<'group' | 'duplicates' | 'cleanup'>('group')

  async function runSuggest() {
    setSuggesting(true)
    try {
      setSuggestions(await suggestGroupCandidates())
    } finally {
      setSuggesting(false)
    }
  }
  // Drop a candidate from the list once it's been confirmed or dismissed.
  function dismiss(cluster: CandidateCluster) {
    setSuggestions((cs) => (cs ?? []).filter((c) => c !== cluster))
  }

  const byId = useMemo(
    () => new Map((recipes ?? []).map((r) => [r.id, r])),
    [recipes],
  )
  const groupedIds = useMemo(() => {
    const s = new Set<string>()
    for (const g of groups ?? []) for (const m of g.members) s.add(m.recipeId)
    return s
  }, [groups])

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

  if (recipes === undefined || groups === undefined || userData === undefined) {
    return <p className="text-stone-500">Loading…</p>
  }

  const draftIds = new Set(draft.map((d) => d.recipeId))
  const q = query.trim().toLowerCase()
  const results = q
    ? recipes.filter((r) => r.title.toLowerCase().includes(q) && !draftIds.has(r.id)).slice(0, 8)
    : []

  function addToDraft(r: Recipe) {
    setDraft((d) => [...d, { recipeId: r.id, label: r.mainProtein ?? '' }])
    setQuery('')
  }
  function setLabel(recipeId: string, label: string) {
    setDraft((d) => d.map((m) => (m.recipeId === recipeId ? { ...m, label } : m)))
  }
  function removeFromDraft(recipeId: string) {
    setDraft((d) => d.filter((m) => m.recipeId !== recipeId))
  }

  async function create() {
    setBusy(true)
    try {
      await createGroup(draft, axis || undefined)
      setDraft([])
      setAxis('')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full rounded-md border border-stone-300 bg-white dark:bg-stone-100 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none'

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Refine</h1>
      <p className="mt-1 text-sm text-stone-500">
        Tidy your collection: group related recipes, weed out duplicates, or clear out the
        ones you’ve binned.
      </p>

      <div className="mt-4 flex gap-1 border-b border-stone-200">
        {(['group', 'duplicates', 'cleanup'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition ${
              tab === t
                ? 'border-orange-500 text-orange-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {t === 'group'
              ? 'Group'
              : t === 'duplicates'
                ? 'Duplicates'
                : `Clean up${binned.length ? ` (${binned.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'group' && (
        <>
      {/* Suggested groups */}
      <div className="mt-5 rounded-xl border border-stone-200 bg-white dark:bg-stone-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Suggested groups</h2>
          <button
            type="button"
            disabled={suggesting}
            onClick={runSuggest}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {suggesting ? 'Finding…' : suggestions ? 'Refresh suggestions' : 'Find similar recipes'}
          </button>
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Recipes that look like the same dish with a swapped protein or carb. Untick any
          that don’t belong, then create the group.
        </p>

        {suggestions && suggestions.length === 0 && (
          <p className="mt-3 text-sm text-stone-500">
            No suggestions — nothing ungrouped looks similar enough.
          </p>
        )}
        {suggestions && suggestions.length > 0 && (
          <>
            <p className="mt-3 text-xs text-stone-400">
              Showing {Math.min(suggestions.length, 25)} of {suggestions.length}.
            </p>
            <ul className="mt-2 space-y-3">
              {suggestions.slice(0, 25).map((c) => (
                <SuggestionCard
                  key={c.recipeIds.join(',')}
                  cluster={c}
                  byId={byId}
                  onDone={() => dismiss(c)}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Create a group manually */}
      <div className="mt-5 rounded-xl border border-stone-200 bg-white dark:bg-stone-100 p-4">
        <h2 className="text-lg font-semibold">Group related recipes</h2>

        <div className="relative mt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes to add by title…"
            className={inputClass}
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-stone-200 bg-white dark:bg-stone-100 shadow-md">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => addToDraft(r)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-orange-50"
                  >
                    <span className="truncate">{r.title}</span>
                    {groupedIds.has(r.id) && (
                      <span className="shrink-0 text-xs text-amber-600">already grouped</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {draft.length > 0 && (
          <div className="mt-3 space-y-2">
            {draft.map((m) => (
              <div key={m.recipeId} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm text-stone-800">
                  {byId.get(m.recipeId)?.title ?? m.recipeId}
                  {groupedIds.has(m.recipeId) && (
                    <span className="ml-1.5 text-xs text-amber-600">(will move from its group)</span>
                  )}
                </span>
                <input
                  type="text"
                  value={m.label}
                  onChange={(e) => setLabel(m.recipeId, e.target.value)}
                  placeholder="label (e.g. Rice)"
                  className="w-32 rounded-md border border-stone-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeFromDraft(m.recipeId)}
                  className="rounded px-2 py-1 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                  aria-label="Remove from draft"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <select
            value={axis}
            onChange={(e) => setAxis(e.target.value as typeof axis)}
            className="rounded-md border border-stone-300 bg-white dark:bg-stone-100 px-2.5 py-1.5 text-sm"
          >
            <option value="">Axis (optional)</option>
            <option value="protein">Protein swap</option>
            <option value="carb">Carb swap</option>
            <option value="mixed">Mixed</option>
          </select>
          <button
            type="button"
            disabled={busy || draft.length < 2}
            onClick={create}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            Create group
          </button>
          <span className="text-xs text-stone-400">
            {draft.length < 2 ? 'Add at least two recipes.' : `${draft.length} selected`}
          </span>
        </div>
      </div>

      {/* Existing groups */}
      <h2 className="mt-6 text-lg font-semibold">
        Groups <span className="text-sm font-normal text-stone-400">({groups.length})</span>
      </h2>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">No groups yet.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} byId={byId} />
          ))}
        </ul>
      )}
        </>
      )}

      {tab === 'duplicates' && (
        <DuplicatesSection byId={byId} starsById={starsById} />
      )}

      {tab === 'cleanup' && (
        <>
          <p className="mt-4 text-sm text-stone-500">
            Recipes you’ve rated ★1–2. Tick the ones to delete for good — deletion sticks
            across re-imports (the export is your backup).
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
          className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {finding ? 'Finding…' : candidates ? 'Refresh' : 'Find duplicates'}
        </button>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        Recipes that look like the same dish — near-identical title and ingredients (not a
        protein/carb swap; those belong in a group). Tick the ones to delete; the suggested
        keeper is badged.
      </p>

      {candidates && candidates.length === 0 && (
        <p className="mt-3 text-sm text-stone-500">
          No duplicates — nothing ungrouped looks near-identical.
        </p>
      )}
      {candidates && candidates.length > 0 && (
        <>
          <p className="mt-3 text-xs text-stone-400">
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
        <span className="text-xs font-medium tracking-wide text-stone-400 uppercase">
          {Math.round(cluster.score * 100)}% similar
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setComparing((c) => !c)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
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
            className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
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
                className="size-4 rounded border-stone-300 text-rose-500 focus:ring-rose-400"
              />
              {stars ? (
                <span className="w-12 shrink-0 truncate text-xs text-amber-600">
                  {'★'.repeat(stars)}
                </span>
              ) : (
                <span className="w-12 shrink-0" />
              )}
              <Link
                to={`/recipe/${r.id}`}
                className={`min-w-0 truncate text-sm hover:text-orange-700 ${
                  checked.has(r.id) ? 'text-rose-600 line-through' : 'text-stone-800'
                }`}
              >
                {r.title}
              </Link>
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

// One suggested cluster: members pre-ticked with a label defaulted from mainProtein. Untick
// outliers, tweak labels, then create — or dismiss to hide it. Confirming/dismissing calls
// onDone so the parent drops it from the list.
function SuggestionCard({
  cluster,
  byId,
  onDone,
}: {
  cluster: CandidateCluster
  byId: Map<string, Recipe>
  onDone: () => void
}) {
  const [rows, setRows] = useState(
    cluster.recipeIds.map((recipeId) => ({
      recipeId,
      label: byId.get(recipeId)?.mainProtein ?? '',
      checked: true,
    })),
  )
  const [busy, setBusy] = useState(false)
  const [comparing, setComparing] = useState(false)
  const chosen = rows.filter((r) => r.checked)
  const members = cluster.recipeIds
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => r !== undefined)

  async function create() {
    setBusy(true)
    try {
      await createGroup(chosen.map(({ recipeId, label }) => ({ recipeId, label })))
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-lg border border-stone-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-stone-400 uppercase">
          {Math.round(cluster.score * 100)}% similar
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setComparing((c) => !c)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
          >
            {comparing ? 'Hide compare' : 'Compare'}
          </button>
          <button
            type="button"
            disabled={busy || chosen.length < 2}
            onClick={create}
            className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            Create group
          </button>
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
          >
            Dismiss
          </button>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.recipeId} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={r.checked}
              onChange={(e) =>
                setRows((rs) => rs.map((x, j) => (j === i ? { ...x, checked: e.target.checked } : x)))
              }
              className="size-4 rounded border-stone-300 text-orange-500 focus:ring-orange-400"
            />
            <span className={`flex-1 truncate text-sm ${r.checked ? 'text-stone-800' : 'text-stone-400'}`}>
              {byId.get(r.recipeId)?.title ?? r.recipeId}
            </span>
            <input
              type="text"
              value={r.label}
              onChange={(e) =>
                setRows((rs) => rs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              placeholder="label"
              className="w-28 rounded-md border border-stone-300 px-2 py-0.5 text-sm"
            />
          </li>
        ))}
      </ul>

      {comparing && <CompareView recipes={members} />}
    </li>
  )
}

// One saved group: its labelled members with a Compare toggle, plus disband / remove.
function GroupCard({ group, byId }: { group: VariantGroup; byId: Map<string, Recipe> }) {
  const [comparing, setComparing] = useState(false)
  const members = group.members
    .map((m) => byId.get(m.recipeId))
    .filter((r): r is Recipe => r !== undefined)

  return (
    <li className="rounded-xl border border-stone-200 bg-white dark:bg-stone-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-stone-500 uppercase">
          {group.axis ? `${group.axis} group` : 'group'}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setComparing((c) => !c)}
            className="rounded px-2 py-0.5 text-xs font-medium text-stone-500 hover:bg-stone-100"
          >
            {comparing ? 'Hide compare' : 'Compare'}
          </button>
          <button
            type="button"
            onClick={() => deleteGroup(group.id)}
            className="rounded px-2 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            Disband
          </button>
        </div>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {group.members.map((m) => (
          <li
            key={m.recipeId}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 py-1 pr-1 pl-2.5 text-sm"
          >
            {m.label && (
              <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-500">
                {m.label}
              </span>
            )}
            <Link to={`/recipe/${m.recipeId}`} className="hover:text-orange-700">
              {byId.get(m.recipeId)?.title ?? m.recipeId}
            </Link>
            <button
              type="button"
              onClick={() => removeRecipeFromGroup(m.recipeId)}
              className="rounded-full px-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600"
              aria-label="Remove from group"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {comparing && <CompareView recipes={members} />}
    </li>
  )
}

// Bulk-delete the 1–2★ recipes. Nothing is pre-selected (delete is destructive and real);
// tick, or select all, then confirm. Deletes cascade to groups via deleteRecipes.
function CleanupSection({ binned }: { binned: { recipe: Recipe; stars: Stars }[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  if (binned.length === 0) {
    return <p className="mt-2 text-sm text-stone-500">Nothing binned — nothing to clean up.</p>
  }

  const allSelected = binned.every((b) => selected.has(b.recipe.id))
  const count = binned.filter((b) => selected.has(b.recipe.id)).length

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(binned.map((b) => b.recipe.id)))
  }
  async function remove() {
    const ids = binned.map((b) => b.recipe.id).filter((id) => selected.has(id))
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
    <div className="mt-2 rounded-xl border border-stone-200 bg-white dark:bg-stone-100 p-3">
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="size-4 rounded border-stone-300 text-orange-500 focus:ring-orange-400"
          />
          Select all
        </label>
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={remove}
          className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 disabled:opacity-50"
        >
          Delete {count || ''} selected
        </button>
      </div>
      <ul className="mt-2 divide-y divide-stone-100">
        {binned.map(({ recipe, stars }) => (
          <li key={recipe.id} className="flex items-center gap-2 py-1.5">
            <input
              type="checkbox"
              checked={selected.has(recipe.id)}
              onChange={() => toggle(recipe.id)}
              className="size-4 rounded border-stone-300 text-orange-500 focus:ring-orange-400"
            />
            <span className="w-10 shrink-0 text-sm text-amber-600">{'★'.repeat(stars)}</span>
            <Link to={`/recipe/${recipe.id}`} className="flex-1 truncate text-sm text-stone-800 hover:text-orange-700">
              {recipe.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Side-by-side comparison of candidate recipes — metadata rows + an ingredient column each.
// Ingredients not shared by every recipe are highlighted, so the swapped line stands out.
function CompareView({ recipes }: { recipes: Recipe[] }) {
  const counts = new Map<string, number>()
  for (const r of recipes) {
    const seen = new Set<string>()
    for (const ing of r.ingredients) {
      const key = ing.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const isShared = (name: string) => counts.get(name.trim().toLowerCase()) === recipes.length

  const metaRows: { label: string; value: (r: Recipe) => string }[] = [
    { label: 'Cuisine', value: (r) => r.cuisine || '—' },
    { label: 'Time', value: (r) => `${r.prepTime} min` },
    { label: 'Serves', value: (r) => String(r.serves) },
    { label: 'Main', value: (r) => r.mainProtein ?? '—' },
    { label: 'Energy', value: (r) => (r.nutrition ? `${Math.round(r.nutrition.kcal)} kcal` : '—') },
    { label: 'Allergens', value: (r) => (r.allergens.length ? r.allergens.join(', ') : '—') },
  ]

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-stone-200">
            <td className="p-2" />
            {recipes.map((r) => (
              <th key={r.id} className="p-2 text-left align-bottom font-semibold text-stone-700">
                <Link to={`/recipe/${r.id}`} className="block hover:text-orange-700 hover:underline">
                  {r.image ? (
                    <img
                      src={resolveAsset(r.image)}
                      alt=""
                      className="mb-1.5 aspect-[4/3] w-full max-w-40 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="mb-1.5 flex aspect-[4/3] w-full max-w-40 items-center justify-center rounded-md bg-stone-100 text-xs text-stone-400">
                      no image
                    </div>
                  )}
                  {r.title}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {metaRows.map((row) => (
            <tr key={row.label}>
              <th className="p-2 text-left align-top text-xs font-medium tracking-wide text-stone-400 uppercase">
                {row.label}
              </th>
              {recipes.map((r) => (
                <td key={r.id} className="p-2 align-top text-stone-700">
                  {row.value(r)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th className="p-2 text-left align-top text-xs font-medium tracking-wide text-stone-400 uppercase">
              Ingredients
            </th>
            {recipes.map((r) => (
              <td key={r.id} className="p-2 align-top">
                <ul className="space-y-0.5">
                  {r.ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className={isShared(ing.name) ? 'text-stone-500' : 'font-medium text-orange-700'}
                    >
                      {ing.name}
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="px-2 pb-2 text-xs text-stone-400">
        Highlighted ingredients aren’t shared by every recipe.
      </p>
    </div>
  )
}
