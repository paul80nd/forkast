import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Recipe } from '../schema/recipe'
import type { VariantGroup } from '../schema/userData'
import {
  createGroup,
  deleteGroup,
  removeRecipeFromGroup,
  type GroupMemberInput,
} from '../app/groups'

// Refine: tidy the collection by linking related recipes into variant groups. Manual
// grouping for now (the similarity suggester and ★-cleanup come later). A thin shell over
// src/app/groups.ts — all the invariants live there.
export function RefinePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const groups = useLiveQuery(() => db.variantGroups.toArray(), [])
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<GroupMemberInput[]>([])
  const [axis, setAxis] = useState<'' | NonNullable<VariantGroup['axis']>>('')
  const [busy, setBusy] = useState(false)

  const byId = useMemo(
    () => new Map((recipes ?? []).map((r) => [r.id, r])),
    [recipes],
  )
  const groupedIds = useMemo(() => {
    const s = new Set<string>()
    for (const g of groups ?? []) for (const m of g.members) s.add(m.recipeId)
    return s
  }, [groups])

  if (recipes === undefined || groups === undefined) {
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
    'w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none'

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Refine</h1>
      <p className="mt-1 text-sm text-stone-500">
        Link related recipes — protein or carb swaps of the same dish — into a group. Each
        member keeps its own page; they just point at each other as “see also”.
      </p>

      {/* Create a group */}
      <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
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
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-md">
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
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm"
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
            <li key={g.id} className="rounded-xl border border-stone-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium tracking-wide text-stone-500 uppercase">
                  {g.axis ? `${g.axis} group` : 'group'}
                </span>
                <button
                  type="button"
                  onClick={() => deleteGroup(g.id)}
                  className="rounded px-2 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  Disband
                </button>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {g.members.map((m) => (
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
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
