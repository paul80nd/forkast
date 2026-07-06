import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { RecipeCard } from '../components/RecipeCard'
import { Select, fieldBoxClass } from '../components/Select'
import { Switch } from '../components/Switch'
import { FilterPopover } from '../components/FilterPopover'
import { SkeletonCard } from '../components/SkeletonCard'
import { usePersistentState } from '../hooks/usePersistentState'
import { deleteRecipes } from '../app/cleanup'
import { resolveDishes, dishSizeByRecipe } from '../lib/variants'
import { distinctLabels } from '../lib/tags'
import {
  browseCards,
  deepLinkFilter,
  type AllergenMode,
  type BrowseFilter,
  type RatingFilter,
  type SortKey,
} from '../lib/browseFilter'
import type { Stars } from '../schema/userData'

export function BrowsePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  const overrides = useLiveQuery(() => db.variantOverrides.toArray(), [])
  // Persisted so the browse view remembers its filters across navigation and reloads.
  const [query, setQuery] = usePersistentState('browse.query', '')
  const [cuisine, setCuisine] = usePersistentState('browse.cuisine', 'all')
  const [maxTime, setMaxTime] = usePersistentState('browse.maxTime', 0) // 0 = any
  const [rating, setRating] = usePersistentState<RatingFilter>('browse.rating', 'all')
  // Tags filter positively (AND — a recipe must carry all selected); allergens either avoid
  // (hide any-of) or, in "only" mode, show recipes that do contain them.
  const [tags, setTags] = usePersistentState<string[]>('browse.tags', [])
  const [allergens, setAllergens] = usePersistentState<string[]>('browse.allergens', [])
  const [allergenMode, setAllergenMode] = usePersistentState<AllergenMode>('browse.allergenMode', 'avoid')
  const [sort, setSort] = usePersistentState<SortKey>('browse.sort', 'rating')
  // Collapse each dish's variants to one lead card (default on — the point of the feature).
  const [groupVariants, setGroupVariants] = usePersistentState('browse.groupVariants', true)

  // Deep-link from the tag manager: ?tag=<v> focuses on recipes carrying that tag; ?allergen=<v>
  // focuses on recipes containing that allergen (allergen "only" mode). Applied once on mount — it
  // clears the broad filters for a clean landing, then drops the query param.
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkApplied = useRef(false)
  useEffect(() => {
    if (deepLinkApplied.current) return
    deepLinkApplied.current = true
    const target = deepLinkFilter(searchParams.get('tag'), searchParams.get('allergen'))
    if (!target) return
    setQuery(target.query)
    setCuisine(target.cuisine)
    setTags(target.tags)
    setAllergens(target.allergens)
    setAllergenMode(target.allergenMode)
    setMaxTime(target.maxTime)
    setRating(target.rating)
    setSearchParams({}, { replace: true })
  }, [])

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
  const tagOptions = useMemo(() => distinctLabels(recipes ?? [], 'tags'), [recipes])
  const allergenOptions = useMemo(() => distinctLabels(recipes ?? [], 'allergens'), [recipes])

  // Effective dishes over the whole catalogue (import grouping + user overrides), so a
  // collapsed card's badge reflects the whole dish even when the list is filtered down.
  const dishSize = useMemo(
    () => dishSizeByRecipe(resolveDishes(recipes ?? [], overrides ?? [])),
    [recipes, overrides],
  )

  const filter = useMemo<BrowseFilter>(
    () => ({ query, cuisine, tags, allergens, allergenMode, maxTime, rating }),
    [query, cuisine, tags, allergens, allergenMode, maxTime, rating],
  )

  // Filter → collapse variants to one lead card per dish (when on) → sort. Pure; see browseFilter.
  const cards = useMemo(
    () => browseCards(recipes ?? [], overrides ?? [], filter, { groupVariants, sort }, starsById),
    [recipes, overrides, filter, groupVariants, sort, starsById],
  )

  // Render incrementally — show a page of cards, load more as the user scrolls. The paging
  // count + scroll position survive a trip into a recipe (sessionStorage), so returning from
  // a recipe doesn't dump you back at the top of a long list.
  const PAGE = 50
  const [visible, setVisible] = useState(() => {
    const saved = Number(sessionStorage.getItem('browse.visible') || 0)
    return saved > 0 ? saved : PAGE
  })
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Reset paging + selection + scroll when the filters change — but NOT on the initial mount,
  // so a Back from a recipe keeps the restored paging/scroll below.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    setVisible(PAGE)
    setSelected(new Set())
    window.scrollTo(0, 0)
  }, [query, cuisine, tags, allergens, allergenMode, maxTime, rating, sort, groupVariants])

  useEffect(() => {
    sessionStorage.setItem('browse.visible', String(visible))
  }, [visible])

  // Save the scroll position as you go; restore it once recipes have loaded (Back-from-recipe).
  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || recipes === undefined) return
    restored.current = true
    const y = Number(sessionStorage.getItem('browse.scrollY') || 0)
    if (y) requestAnimationFrame(() => window.scrollTo(0, y))
  }, [recipes])
  useEffect(() => {
    const onScroll = () => sessionStorage.setItem('browse.scrollY', String(window.scrollY))
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  // Real page-load sentinel: a skeleton grid while the store loads, so the grid doesn't jump.
  if (recipes === undefined) {
    return (
      <section>
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    )
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
  for (const t of tags)
    chips.push({ key: `tag:${t}`, label: t, clear: () => setTags((xs) => xs.filter((x) => x !== t)) })
  for (const a of allergens)
    chips.push({
      key: `allergen:${a}`,
      label: `${allergenMode === 'only' ? 'Has' : 'No'} ${a}`,
      clear: () => setAllergens((xs) => xs.filter((x) => x !== a)),
    })
  if (maxTime > 0) chips.push({ key: 'time', label: timeLabels[maxTime], clear: () => setMaxTime(0) })
  if (rating !== 'all')
    chips.push({ key: 'rating', label: ratingLabels[rating], clear: () => setRating('all') })
  const clearFilters = () => {
    setCuisine('all')
    setTags([])
    setAllergens([])
    setMaxTime(0)
    setRating('all')
  }
  const clearEverything = () => {
    clearFilters()
    setQuery('')
  }
  const toggleTag = (t: string) =>
    setTags((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]))
  const toggleAllergen = (a: string) =>
    setAllergens((xs) => (xs.includes(a) ? xs.filter((x) => x !== a) : [...xs, a]))
  const eyebrow = 'text-[11px] font-semibold tracking-wider text-muted uppercase'

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
        <span className="text-sm text-muted">
          {cards.length} {groupVariants ? 'dishes' : 'recipes'} of {recipes.length}
        </span>
      </div>

      {/* Calm bar: search + sort inline; the rest tucked behind Filters; applied filters
          shown as removable chips below. The whole bar (+ chips) sticks to the top as you
          scroll the list, so refining never means scrolling back up. */}
      <div className="sticky top-0 z-20 -mx-4 mt-3 border-b border-divider bg-surface px-4 pt-1.5 pb-3">
      <div className="flex flex-wrap items-center gap-2">
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
            {tagOptions.length > 0 && (
              <div>
                <span className={eyebrow}>Tags</span>
                <div className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {tagOptions.map((t) => {
                    const on = tags.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          on
                            ? 'border-brand-500 bg-brand-700 text-white'
                            : 'border-line bg-card text-ink hover:border-brand-300 hover:text-brand-ink'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {allergenOptions.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={eyebrow}>Allergens</span>
                  {/* Avoid = hide recipes containing any; Only = show recipes that do contain them. */}
                  <div className="flex gap-1 text-xs">
                    {(['avoid', 'only'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAllergenMode(m)}
                        aria-pressed={allergenMode === m}
                        className={`rounded-md px-2 py-0.5 font-medium capitalize transition ${
                          allergenMode === m ? 'bg-brand-700 text-white' : 'text-muted hover:text-ink'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                  {allergenOptions.map((a) => {
                    const on = allergens.includes(a)
                    const onClass =
                      allergenMode === 'only'
                        ? 'border-brand-500 bg-brand-700 text-white'
                        : 'border-warn-ink bg-warn-tint text-warn-ink'
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergen(a)}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          on
                            ? onClass
                            : 'border-line bg-card text-ink hover:border-brand-300 hover:text-brand-ink'
                        }`}
                      >
                        {a}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
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
      </div>

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
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-card px-6 py-11 text-center">
          <p className="text-base font-semibold text-ink">No recipes match those filters</p>
          <p className="mt-1 mb-3.5 text-sm text-muted">
            Try widening your search or clearing a filter.
          </p>
          <button
            type="button"
            onClick={clearEverything}
            className="rounded-md bg-brand-tint px-3 py-1.5 text-sm font-medium text-brand-ink hover:bg-brand-200"
          >
            Clear all filters
          </button>
        </div>
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
          {visible < cards.length ? (
            <div ref={sentinelRef} className="mt-6 text-center text-sm text-muted">
              Loading more…
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-muted">
              That's everything · {cards.length} {cards.length === 1 ? 'dish' : 'dishes'}
            </p>
          )}
        </>
      )}
    </section>
  )
}
