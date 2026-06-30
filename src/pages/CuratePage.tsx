import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { setStars, STAR_LABELS } from '../lib/curation'
import { StarRating } from '../components/StarRating'
import { usePersistentState } from '../hooks/usePersistentState'
import { resolveAsset } from '../lib/assets'
import type { Recipe } from '../schema/recipe'
import type { Stars } from '../schema/userData'

export function CuratePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  const [cursor, setCursor] = useState(0)
  // Filters scope Curate's whole working set — both the triage backlog and the rated
  // overview — so you can focus on one cuisine/protein at a time. Persisted (separately
  // from Browse) so the focus survives navigation and reload.
  const [fCuisine, setFCuisine] = usePersistentState('curate.cuisine', 'all')
  const [fProtein, setFProtein] = usePersistentState('curate.protein', 'all')

  const starsById = useMemo(() => {
    const m = new Map<string, Stars>()
    for (const u of userData ?? []) if (u.stars) m.set(u.recipeId, u.stars)
    return m
  }, [userData])

  // Filter option lists drawn from the whole collection (the overview is filtered too, so
  // a fully-rated cuisine still needs to be selectable to review it).
  const cuisines = useMemo(
    () => Array.from(new Set((recipes ?? []).map((r) => r.cuisine).filter(Boolean))).sort(),
    [recipes],
  )
  const proteins = useMemo(
    () =>
      Array.from(
        new Set((recipes ?? []).map((r) => r.mainProtein).filter((p): p is string => Boolean(p))),
      ).sort(),
    [recipes],
  )

  const inFilter = useMemo(() => {
    return (r: Recipe) =>
      (fCuisine === 'all' || r.cuisine === fCuisine) &&
      (fProtein === 'all' || r.mainProtein === fProtein)
  }, [fCuisine, fProtein])
  const filterActive = fCuisine !== 'all' || fProtein !== 'all'

  // The working set: recipes matching the active filter. Counts and both lists derive from it.
  const scoped = useMemo(() => (recipes ?? []).filter(inFilter), [recipes, inFilter])
  const backlog = useMemo(
    () =>
      scoped
        .filter((r) => !starsById.has(r.id))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [scoped, starsById],
  )

  // Restart triage at the top of the list whenever the filter changes the backlog.
  useEffect(() => {
    setCursor(0)
  }, [fCuisine, fProtein])

  const current = backlog.length ? backlog[Math.min(cursor, backlog.length - 1)] : undefined

  // Keyboard triage: 1–5 rate, →/S skip, ← back.
  useEffect(() => {
    if (!current) return
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (e.key >= '1' && e.key <= '5') {
        void setStars(current!.id, Number(e.key) as Stars)
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 's') {
        setCursor((c) => Math.min(c + 1, backlog.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setCursor((c) => Math.max(c - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, backlog.length])

  if (recipes === undefined || userData === undefined) {
    return <p className="text-stone-500">Loading…</p>
  }

  // Counts reflect the active filter (the working set), not the whole collection.
  const ratedCount = scoped.length - backlog.length

  const selectClass =
    'rounded-md border border-stone-300 bg-white dark:bg-stone-100 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none'

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Curate</h1>
        <span className="text-sm text-stone-500">
          {ratedCount} rated · {backlog.length} to triage
          {filterActive && ' (in filter)'}
        </span>
      </div>

      <p className="mt-2 text-sm text-stone-500">
        <span className="font-medium text-stone-600">★5</span> favourite ·{' '}
        <span className="font-medium text-stone-600">★4</span> nice ·{' '}
        <span className="font-medium text-stone-600">★3</span> variety-only ·{' '}
        <span className="font-medium text-stone-600">★1–2</span> bin
      </p>

      {/* Focus the working set — rate one cuisine / protein at a time for consistency. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={fCuisine}
          onChange={(e) => setFCuisine(e.target.value)}
          aria-label="Filter by cuisine"
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
          value={fProtein}
          onChange={(e) => setFProtein(e.target.value)}
          aria-label="Filter by main protein"
          className={`${selectClass} capitalize`}
        >
          <option value="all">All proteins</option>
          {proteins.map((p) => (
            <option key={p} value={p} className="capitalize">
              {p}
            </option>
          ))}
        </select>
        {filterActive && (
          <button
            type="button"
            onClick={() => {
              setFCuisine('all')
              setFProtein('all')
            }}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Triage */}
      {current ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white dark:bg-stone-100 shadow-sm sm:flex">
          <Link to={`/recipe/${current.id}`} className="block sm:w-2/5">
            <img
              src={resolveAsset(current.image)}
              alt=""
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </Link>
          <div className="flex flex-1 flex-col p-5">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium">
                {current.cuisine}
              </span>
              <span>⏱ {current.prepTime} min</span>
              {current.mainProtein && (
                <span className="capitalize">· {current.mainProtein}</span>
              )}
            </div>
            <Link to={`/recipe/${current.id}`}>
              <h2 className="mt-2 text-xl font-semibold hover:underline">
                {current.title}
              </h2>
            </Link>
            <p className="mt-1 text-sm text-stone-500">{current.description}</p>

            <div className="mt-auto pt-5">
              <StarRating
                size="lg"
                onChange={(v) => v && setStars(current.id, v)}
              />
              <div className="mt-3 flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setCursor((c) => Math.max(c - 1, 0))}
                  className="rounded-md px-2.5 py-1 text-stone-500 hover:bg-stone-100"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCursor((c) => Math.min(c + 1, backlog.length - 1))
                  }
                  className="rounded-md px-2.5 py-1 text-stone-500 hover:bg-stone-100"
                >
                  Skip →
                </button>
                <span className="ml-auto text-xs text-stone-400">
                  Press <kbd className="rounded bg-stone-100 px-1">1</kbd>–
                  <kbd className="rounded bg-stone-100 px-1">5</kbd> to rate
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white dark:bg-stone-100 p-10 text-center">
          <p className="text-lg font-medium text-stone-700">
            {filterActive ? 'Nothing left to triage in this filter 🎉' : 'All triaged 🎉'}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {filterActive
              ? 'Clear the filter to triage the rest, or re-rate any below.'
              : 'Every recipe has a rating. Re-rate any below.'}
          </p>
        </div>
      )}

      {/* Rated overview — scoped to the active filter, like the triage backlog. */}
      {ratedCount > 0 && (
        <div className="mt-10 space-y-6">
          {([5, 4, 3, 2, 1] as Stars[]).map((tier) => {
            const items = scoped
              .filter((r) => starsById.get(r.id) === tier)
              .sort((a, b) => a.title.localeCompare(b.title))
            if (!items.length) return null
            return (
              <div key={tier}>
                <h3 className="text-sm font-semibold text-stone-600">
                  <span className="text-amber-500">{'★'.repeat(tier)}</span>{' '}
                  <span className="text-stone-400">{STAR_LABELS[tier]}</span>{' '}
                  <span className="text-stone-400">· {items.length}</span>
                </h3>
                <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white dark:bg-stone-100">
                  {items.map((r) => (
                    <RatedRow key={r.id} recipe={r} stars={tier} />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RatedRow({ recipe, stars }: { recipe: Recipe; stars: Stars }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <Link to={`/recipe/${recipe.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <img
          src={resolveAsset(recipe.image)}
          alt=""
          className="size-10 shrink-0 rounded-md object-cover"
        />
        <span className="truncate font-medium text-stone-800">{recipe.title}</span>
        <span className="shrink-0 text-xs text-stone-400">{recipe.cuisine}</span>
      </Link>
      <StarRating
        size="sm"
        value={stars}
        onChange={(v) => setStars(recipe.id, v)}
      />
    </li>
  )
}
