import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { RecipeCard } from '../components/RecipeCard'
import { Select, fieldBoxClass } from '../components/Select'
import { Switch } from '../components/Switch'
import { FilterPopover } from '../components/FilterPopover'
import { usePersistentState } from '../hooks/usePersistentState'
import { deleteRecipes } from '../app/cleanup'
import { resolveDishes, dishSizeByRecipe } from '../lib/variants'
import type { Stars } from '../schema/userData'

type SortKey = 'rating' | 'time' | 'name'
type RatingFilter = 'all' | 'unrated' | '5' | '4plus' | '3plus'

export function BrowsePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  const overrides = useLiveQuery(() => db.variantOverrides.toArray(), [])
  // Persisted so the browse view remembers its filters across navigation and reloads.
  const [query, setQuery] = usePersistentState('browse.query', '')
  const [cuisine, setCuisine] = usePersistentState('browse.cuisine', 'all')
  const [maxTime, setMaxTime] = usePersistentState('browse.maxTime', 0) // 0 = any
  const [rating, setRating] = usePersistentState<RatingFilter>('browse.rating', 'all')
  const [sort, setSort] = usePersistentState<SortKey>('browse.sort', 'rating')
  // Collapse each dish's variants to one lead card (default on — the point of the feature).
  const [groupVariants, setGroupVariants] = usePersistentState('browse.groupVariants', true)

  // Multi-select for bulk delete (ephemeral — cleared on leaving Browse). Gated behind an
  // explicit "Select" mode so the normal grid stays tap-to-open.
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const exitSelect = () => {
    setSelectMode(false)
    setSelected(new Set())
  }
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

  // Effective dishes over the whole catalogue (import grouping + user overrides), so a
  // collapsed card's badge reflects the whole dish even when the list is filtered down.
  const dishSize = useMemo(
    () => dishSizeByRecipe(resolveDishes(recipes ?? [], overrides ?? [])),
    [recipes, overrides],
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
    return list
  }, [recipes, query, cuisine, maxTime, rating, starsById])

  // Collapse variants to one lead card per dish (when on), then sort the cards on show.
  const cards = useMemo(() => {
    const list = groupVariants
      ? resolveDishes(filtered, overrides ?? []).map((d) => d.lead)
      : filtered
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title)
      if (sort === 'time') return a.prepTime - b.prepTime
      // Top rated = our own ★; unrated (0) sort last.
      return (starsById.get(b.id) ?? 0) - (starsById.get(a.id) ?? 0)
    })
  }, [filtered, groupVariants, overrides, sort, starsById])

  // Render incrementally — show a page of cards, load more as the user scrolls.
  const PAGE = 50
  const [visible, setVisible] = useState(PAGE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Back to the top of the list, and clear any selection, whenever the filters change.
  useEffect(() => {
    setVisible(PAGE)
    setSelected(new Set())
  }, [query, cuisine, maxTime, rating, sort, groupVariants])

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
  }, [cards.length, visible])

  if (recipes === undefined) {
    return <p className="text-muted">Loading recipes…</p>
  }

  // Applied secondary filters, as removable chips shown below the bar.
  const timeLabels: Record<number, string> = { 20: '≤ 20 min', 30: '≤ 30 min', 45: '≤ 45 min' }
  const ratingLabels: Record<string, string> = {
    unrated: 'Unrated',
    '5': '★5 only',
    '4plus': '★4+',
    '3plus': '★3+',
  }
  const chips: { key: string; label: string; clear: () => void }[] = []
  if (cuisine !== 'all') chips.push({ key: 'cuisine', label: cuisine, clear: () => setCuisine('all') })
  if (maxTime > 0) chips.push({ key: 'time', label: timeLabels[maxTime], clear: () => setMaxTime(0) })
  if (rating !== 'all')
    chips.push({ key: 'rating', label: ratingLabels[rating], clear: () => setRating('all') })
  const clearFilters = () => {
    setCuisine('all')
    setMaxTime(0)
    setRating('all')
  }
  const eyebrow = 'text-[11px] font-semibold tracking-wider text-muted uppercase'

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
        <span className="text-sm text-muted">
          {cards.length} {groupVariants ? 'dishes' : 'recipes'} of {recipes.length}
        </span>
      </div>

      {/* Calm bar: search + sort inline; the rest tucked behind Filters; applied
          filters shown as removable chips below. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or ingredient…"
          className={`${fieldBoxClass} min-w-56 flex-1 px-2.5 py-1.5 text-sm`}
        />
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort recipes"
        >
          <option value="rating">Top rated (your ★)</option>
          <option value="time">Quickest</option>
          <option value="name">A–Z</option>
        </Select>
        <FilterPopover count={chips.length}>
          <div className="flex flex-col gap-3">
            <label className="block">
              <span className={eyebrow}>Cuisine</span>
              <Select
                block
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                aria-label="Filter by cuisine"
                className="mt-1.5"
              >
                <option value="all">All cuisines</option>
                {cuisines.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className={eyebrow}>Max time</span>
              <Select
                block
                value={maxTime}
                onChange={(e) => setMaxTime(Number(e.target.value))}
                aria-label="Filter by maximum cooking time"
                className="mt-1.5"
              >
                <option value={0}>Any time</option>
                <option value={20}>≤ 20 min</option>
                <option value={30}>≤ 30 min</option>
                <option value={45}>≤ 45 min</option>
              </Select>
            </label>
            <label className="block">
              <span className={eyebrow}>Rating</span>
              <Select
                block
                value={rating}
                onChange={(e) => setRating(e.target.value as RatingFilter)}
                aria-label="Filter by rating"
                className="mt-1.5"
              >
                <option value="all">Any rating</option>
                <option value="unrated">Unrated</option>
                <option value="5">★5 only</option>
                <option value="4plus">★4+</option>
                <option value="3plus">★3+</option>
              </Select>
            </label>
            {chips.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start rounded-md px-2 py-1 text-sm font-medium text-muted hover:bg-sunken"
              >
                Clear all filters
              </button>
            )}
          </div>
        </FilterPopover>
        <span aria-hidden className="mx-0.5 h-6 w-px self-stretch bg-divider" />
        <Switch checked={groupVariants} onChange={setGroupVariants} label="Group variants" />
        <button
          type="button"
          onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            selectMode
              ? 'border-brand-300 bg-brand-tint text-brand-ink'
              : 'border-line-strong bg-card text-muted hover:bg-sunken'
          }`}
        >
          {selectMode ? 'Done' : 'Select'}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              title={`Remove ${c.label}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-1 text-xs font-medium text-brand-ink"
            >
              {c.label} <span aria-hidden className="opacity-65">✕</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="px-1.5 py-1 text-xs text-muted hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {selectMode && (
        <div
          className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
            selected.size ? 'border-brand-200 bg-brand-wash' : 'border-line bg-sunken'
          }`}
        >
          <span className="font-medium text-ink">
            {selected.size ? `${selected.size} selected` : 'Tap cards to select'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!selected.size}
              onClick={() => setSelected(new Set())}
              className="rounded-md px-2.5 py-1 font-medium text-muted hover:bg-card disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={!selected.size}
              onClick={deleteSelected}
              className="rounded-md bg-danger-600 px-3 py-1 font-medium text-white hover:bg-danger-700 disabled:opacity-50"
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <p className="mt-10 text-center text-muted">
          No recipes match those filters.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.slice(0, visible).map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                stars={starsById.get(r.id)}
                selectMode={selectMode}
                selected={selected.has(r.id)}
                onToggleSelect={() => toggleSelect(r.id)}
                variantCount={groupVariants ? dishSize.get(r.id) : undefined}
              />
            ))}
          </div>
          {visible < cards.length && (
            <div ref={sentinelRef} className="mt-6 text-center text-sm text-muted">
              Loading more…
            </div>
          )}
        </>
      )}
    </section>
  )
}
