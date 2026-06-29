import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { RecipeCard } from '../components/RecipeCard'
import { usePersistentState } from '../hooks/usePersistentState'
import { deleteRecipes } from '../app/cleanup'
import type { Stars } from '../schema/userData'

type SortKey = 'rating' | 'time' | 'name'
type RatingFilter = 'all' | 'unrated' | '5' | '4plus' | '3plus'

export function BrowsePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  // Persisted so the browse view remembers its filters across navigation and reloads.
  const [query, setQuery] = usePersistentState('browse.query', '')
  const [cuisine, setCuisine] = usePersistentState('browse.cuisine', 'all')
  const [maxTime, setMaxTime] = usePersistentState('browse.maxTime', 0) // 0 = any
  const [rating, setRating] = usePersistentState<RatingFilter>('browse.rating', 'all')
  const [sort, setSort] = usePersistentState<SortKey>('browse.sort', 'rating')

  // Multi-select for bulk delete (ephemeral — cleared on leaving Browse).
  const [selected, setSelected] = useState<Set<string>>(new Set())
  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  async function deleteSelected() {
    const ids = [...selected]
    if (
      !window.confirm(
        `Delete ${ids.length} recipe${ids.length === 1 ? '' : 's'} for good?\n\n` +
          'This removes them and their ratings (re-import to restore).',
      )
    ) {
      return
    }
    await deleteRecipes(ids)
    setSelected(new Set())
  }

  const starsById = useMemo(() => {
    const m = new Map<string, Stars>()
    for (const u of userData ?? []) if (u.stars) m.set(u.recipeId, u.stars)
    return m
  }, [userData])

  const cuisines = useMemo(
    () => Array.from(new Set((recipes ?? []).map((r) => r.cuisine))).sort(),
    [recipes],
  )

  const filtered = useMemo(() => {
    let list = recipes ?? []
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.name.toLowerCase().includes(q)),
      )
    }
    if (cuisine !== 'all') list = list.filter((r) => r.cuisine === cuisine)
    if (maxTime > 0) list = list.filter((r) => r.prepTime <= maxTime)
    if (rating !== 'all') {
      list = list.filter((r) => {
        const s = starsById.get(r.id)
        if (rating === 'unrated') return s === undefined
        if (rating === '5') return s === 5
        if (rating === '4plus') return s !== undefined && s >= 4
        return s !== undefined && s >= 3 // 3plus
      })
    }

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title)
      if (sort === 'time') return a.prepTime - b.prepTime
      // Top rated = our own ★; unrated (0) sort last.
      return (starsById.get(b.id) ?? 0) - (starsById.get(a.id) ?? 0)
    })
  }, [recipes, query, cuisine, maxTime, rating, starsById, sort])

  // Render incrementally — show a page of cards, load more as the user scrolls.
  const PAGE = 50
  const [visible, setVisible] = useState(PAGE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Back to the top of the list whenever the filters change.
  useEffect(() => setVisible(PAGE), [query, cuisine, maxTime, rating, sort])

  // Grow the visible count when the bottom sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible((v) => v + PAGE)
      },
      { rootMargin: '400px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered.length, visible])

  if (recipes === undefined) {
    return <p className="text-stone-500">Loading recipes…</p>
  }

  const selectClass =
    'rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none'

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
        <span className="text-sm text-stone-500">
          {filtered.length} of {recipes.length} recipes
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or ingredient…"
          className={`${selectClass} min-w-56 flex-1`}
        />
        <select
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          className={selectClass}
        >
          <option value="all">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={maxTime}
          onChange={(e) => setMaxTime(Number(e.target.value))}
          className={selectClass}
        >
          <option value={0}>Any time</option>
          <option value={20}>≤ 20 min</option>
          <option value={30}>≤ 30 min</option>
          <option value={45}>≤ 45 min</option>
        </select>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value as RatingFilter)}
          className={selectClass}
        >
          <option value="all">Any rating</option>
          <option value="unrated">Unrated</option>
          <option value="5">★5 only</option>
          <option value="4plus">★4+</option>
          <option value="3plus">★3+</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={selectClass}
        >
          <option value="rating">Top rated (your ★)</option>
          <option value="time">Quickest</option>
          <option value="name">A–Z</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
          <span className="font-medium text-stone-700">{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-md px-2.5 py-1 font-medium text-stone-600 hover:bg-white"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="rounded-md bg-rose-600 px-3 py-1 font-medium text-white hover:bg-rose-700"
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-stone-500">
          No recipes match those filters.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, visible).map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                stars={starsById.get(r.id)}
                selected={selected.has(r.id)}
                onToggleSelect={() => toggleSelect(r.id)}
              />
            ))}
          </div>
          {visible < filtered.length && (
            <div ref={sentinelRef} className="mt-6 text-center text-sm text-stone-400">
              Loading more…
            </div>
          )}
        </>
      )}
    </section>
  )
}
