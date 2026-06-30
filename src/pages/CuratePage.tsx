import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { applyRatingToGroup, clearCuration, setRotation, setStars } from '../app/curation'
import { ROTATION_LABELS, STAR_LABELS } from '../lib/curation'
import { RotationRating, StarRating } from '../components/RatingScale'
import { usePersistentState } from '../hooks/usePersistentState'
import { resolveAsset } from '../lib/assets'
import type { Recipe } from '../schema/recipe'
import type { Rotation, Stars, VariantGroup } from '../schema/userData'

export function CuratePage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  const groups = useLiveQuery(() => db.variantGroups.toArray(), [])
  // Filters scope Curate's whole working set — both the triage backlog and the rated
  // overview — so you can focus on one cuisine/protein at a time. Persisted (separately
  // from Browse) so the focus survives navigation and reload.
  const [fCuisine, setFCuisine] = usePersistentState('curate.cuisine', 'all')
  const [fProtein, setFProtein] = usePersistentState('curate.protein', 'all')
  // When on (default), rating a grouped recipe auto-applies that rating to its still-unrated
  // variants and drops them from the triage queue — you rarely want to score near-identical
  // dishes separately. Persisted so the preference sticks.
  const [applyToVariants, setApplyToVariants] = usePersistentState('curate.applyToVariants', true)

  const starsById = useMemo(() => {
    const m = new Map<string, Stars>()
    for (const u of userData ?? []) if (u.stars) m.set(u.recipeId, u.stars)
    return m
  }, [userData])

  const rotationById = useMemo(() => {
    const m = new Map<string, Rotation>()
    for (const u of userData ?? []) if (u.rotation) m.set(u.recipeId, u.rotation)
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

  // Reverse index recipeId → its variant group, so the triage card can offer to rate the
  // whole group at once (near-identical variants shouldn't be triaged independently).
  const groupByRecipe = useMemo(() => {
    const m = new Map<string, VariantGroup>()
    for (const g of groups ?? []) for (const mem of g.members) m.set(mem.recipeId, g)
    return m
  }, [groups])

  const inFilter = useMemo(() => {
    return (r: Recipe) =>
      (fCuisine === 'all' || r.cuisine === fCuisine) &&
      (fProtein === 'all' || r.mainProtein === fProtein)
  }, [fCuisine, fProtein])
  const filterActive = fCuisine !== 'all' || fProtein !== 'all'

  // The working set: recipes matching the active filter. Counts and both lists derive from it.
  const scoped = useMemo(() => (recipes ?? []).filter(inFilter), [recipes, inFilter])
  const byId = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])

  // Frozen triage queue: the unrated recipes in the active filter, captured when the filter
  // (or recipe set) changes — NOT when ratings change. So a card stays put while you rate it
  // (you advance explicitly) and Back/Skip can revisit cards already rated this session. A
  // ref holds the latest ratings so the capture doesn't re-run on every rating.
  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  // Keyboard phase for the current card: digits set the ★ first, then the ◆ rotation. Kept
  // local (not derived from the async-updated rating) so a fast "3 then 2" can't be misread.
  const [phase, setPhase] = useState<'stars' | 'rotation'>('stars')
  const starsRef = useRef(starsById)
  starsRef.current = starsById

  // Capture only once both tables have loaded (else an early recipes-only load would treat
  // already-rated recipes as unrated). `dataReady` flips false→true once, so this fires on
  // first load and on filter change — but not on each rating (which leaves recipes/filter
  // unchanged), keeping the card put while you rate it.
  const dataReady = recipes !== undefined && userData !== undefined
  useEffect(() => {
    if (!dataReady) return
    setQueue(
      recipes!
        .filter(inFilter)
        .filter((r) => !starsRef.current.has(r.id))
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((r) => r.id),
    )
    setIndex(0)
  }, [recipes, inFilter, dataReady])

  // Each new card starts in the ★ phase.
  useEffect(() => {
    setPhase('stars')
  }, [index])

  const currentId = queue[index]
  const current = currentId ? byId.get(currentId) : undefined
  const currentStars = currentId ? starsById.get(currentId) : undefined
  const currentRotation = currentId ? rotationById.get(currentId) : undefined
  const currentGroup = currentId ? groupByRecipe.get(currentId) : undefined

  const advance = () => setIndex((i) => Math.min(i + 1, queue.length))
  const back = () => setIndex((i) => Math.max(i - 1, 0))

  // When the toggle is on, fan the current card's finalised rating out to its unrated variants
  // and drop those (ahead of here) from the queue so they aren't triaged again. No-op otherwise.
  async function cascadeToVariants() {
    if (!applyToVariants || !currentGroup || !currentId) return
    const written = await applyRatingToGroup(currentId)
    if (written.length) {
      const siblings = new Set(written)
      setQueue((q) => q.filter((id, i) => i <= index || !siblings.has(id)))
    }
  }

  async function rateStars(v: Stars | undefined) {
    if (!currentId) return
    if (v === undefined) {
      void clearCuration(currentId) // clears rotation too — no orphan rotation on an unrated card
      setPhase('stars')
      return
    }
    await setStars(currentId, v)
    if (v <= 2) {
      await cascadeToVariants() // bin is final → fan out, then move on (rotation is moot)
      advance()
    } else {
      setPhase('rotation') // keeper → await the ◆ rotation, which finalises and cascades
    }
  }
  async function rateRotation(v: Rotation | undefined) {
    if (!currentId) return
    await setRotation(currentId, v)
    if (v !== undefined) {
      await cascadeToVariants() // keeper now complete (stars + rotation) → fan out, then move on
      advance()
    }
  }

  // Keyboard: digit sets ★ then ◆ (advancing as it goes), ←/→ (or S) navigate, Backspace clears.
  useEffect(() => {
    if (!currentId) return
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      if (e.key >= '1' && e.key <= '5') {
        const n = Number(e.key) as 1 | 2 | 3 | 4 | 5
        if (phase === 'rotation') rateRotation(n)
        else rateStars(n)
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 's') {
        advance()
      } else if (e.key === 'ArrowLeft') {
        back()
      } else if (e.key === 'Backspace') {
        void clearCuration(currentId!)
        setPhase('stars')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentId, phase, queue.length, applyToVariants])

  if (recipes === undefined || userData === undefined) {
    return <p className="text-stone-500">Loading…</p>
  }

  // Counts reflect the active filter (the working set), not the whole collection.
  const ratedCount = scoped.filter((r) => starsById.has(r.id)).length
  const remaining = queue.filter((id) => !starsById.has(id)).length

  const selectClass =
    'rounded-md border border-stone-300 bg-white dark:bg-stone-100 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none'

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Curate</h1>
        <span className="text-sm text-stone-500">
          {ratedCount} rated · {remaining} to triage
          {filterActive && ' (in filter)'}
        </span>
      </div>

      {/* Legend driven off the label maps so it can't drift: ★ = how good, ◆ = how often. */}
      <div className="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm text-stone-500">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {([5, 4, 3, 2, 1] as Stars[]).map((n) => (
            <span key={n} className="whitespace-nowrap">
              <span className="font-medium text-amber-500">★{n}</span>{' '}
              {STAR_LABELS[n]}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {([5, 4, 3, 2, 1] as Rotation[]).map((n) => (
            <span key={n} className="whitespace-nowrap">
              <span className="font-medium text-sky-500">◆{n}</span>{' '}
              {ROTATION_LABELS[n]}
            </span>
          ))}
        </div>
      </div>

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
        <label className="ml-auto flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={applyToVariants}
            onChange={(e) => setApplyToVariants(e.target.checked)}
            className="size-4 rounded border-stone-300 text-sky-500 focus:ring-sky-400"
          />
          Apply rating to variants
        </label>
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

            <div className="mt-auto space-y-2 pt-5">
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium tracking-wide text-stone-400 uppercase">
                  Rating
                </span>
                <StarRating size="lg" showLabel value={currentStars} onChange={rateStars} />
              </div>
              {/* Rotation appears once it's a keeper (★3+); set it to move on. */}
              {currentStars !== undefined && currentStars >= 3 && (
                <div className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium tracking-wide text-stone-400 uppercase">
                    How often
                  </span>
                  <RotationRating size="lg" showLabel value={currentRotation} onChange={rateRotation} />
                </div>
              )}
              {/* Group-aware rating: this card is one of a variant set. With the toggle on, the
                  rating fans out to the unrated variants (which then leave the queue); off, it's
                  just a heads-up with a one-click way to opt in for this session onward. */}
              {currentGroup && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      1 of {currentGroup.members.length} variants
                    </span>
                    {applyToVariants ? (
                      <span className="shrink-0 text-xs">rating also rates the unrated ones ↓</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setApplyToVariants(true)}
                        className="shrink-0 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-sky-700"
                      >
                        Rate them together
                      </button>
                    )}
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {currentGroup.members
                      .filter((m) => m.recipeId !== currentId)
                      .map((m) => {
                        const s = starsById.get(m.recipeId)
                        return (
                          <li key={m.recipeId} className="flex items-center gap-1.5">
                            {m.label && (
                              <span className="shrink-0 rounded bg-sky-100 px-1 font-medium">
                                {m.label}
                              </span>
                            )}
                            <span className="truncate">
                              {byId.get(m.recipeId)?.title ?? m.recipeId}
                            </span>
                            {s ? (
                              <span className="shrink-0 text-amber-600">
                                {'★'.repeat(s)}
                                {applyToVariants && <span className="ml-1 text-sky-400">kept</span>}
                              </span>
                            ) : (
                              <span className="shrink-0 text-sky-400">
                                {applyToVariants ? 'will match' : 'unrated'}
                              </span>
                            )}
                          </li>
                        )
                      })}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2 text-sm">
                <button
                  type="button"
                  onClick={back}
                  className="rounded-md px-2.5 py-1 text-stone-500 hover:bg-stone-100"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={advance}
                  className="rounded-md px-2.5 py-1 text-stone-500 hover:bg-stone-100"
                >
                  Skip →
                </button>
                <span className="ml-auto text-right text-xs text-stone-400">
                  {phase === 'rotation'
                    ? 'Now press 1–5 for how often'
                    : 'Press 1–5 to rate'}
                  <span className="ml-1 text-stone-300">· {index + 1}/{queue.length}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white dark:bg-stone-100 p-10 text-center">
          {queue.length === 0 ? (
            <>
              <p className="text-lg font-medium text-stone-700">
                {filterActive ? 'Nothing to triage in this filter 🎉' : 'All triaged 🎉'}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {filterActive
                  ? 'Clear the filter to triage the rest, or re-rate any below.'
                  : 'Every recipe has a rating. Re-rate any below.'}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-stone-700">End of the batch 🎉</p>
              <p className="mt-1 text-sm text-stone-500">
                {remaining > 0 ? `${remaining} skipped — ` : 'All rated. '}
                <button type="button" onClick={back} className="text-orange-600 hover:underline">
                  ← Back
                </button>{' '}
                to revisit, or re-rate any below.
              </p>
            </>
          )}
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
                    <RatedRow
                      key={r.id}
                      recipe={r}
                      stars={tier}
                      rotation={rotationById.get(r.id)}
                    />
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

function RatedRow({
  recipe,
  stars,
  rotation,
}: {
  recipe: Recipe
  stars: Stars
  rotation: Rotation | undefined
}) {
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
      {/* Rotation (how often) is a keeper concern — only offered for the planner's pool (★3+). */}
      {stars >= 3 && (
        <RotationRating
          size="sm"
          value={rotation}
          onChange={(v) => setRotation(recipe.id, v)}
        />
      )}
      <StarRating size="sm" value={stars} onChange={(v) => setStars(recipe.id, v)} />
    </li>
  )
}
