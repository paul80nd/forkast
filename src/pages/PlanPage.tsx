import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { resolveAsset } from '../lib/assets'
import {
  CURRENT_PLAN_ID,
  addToPlan,
  removeFromPlan,
  setPortions,
  markCooked,
  daysSince,
} from '../lib/plan'
import type { Recipe } from '../schema/recipe'
import type { Stars } from '../schema/userData'

const PORTION_OPTIONS = [2, 4, 6]

function recency(dateISO: string | undefined): { text: string; warn: boolean } {
  if (!dateISO) return { text: 'not cooked yet', warn: false }
  const d = daysSince(dateISO)
  if (d <= 0) return { text: 'cooked today', warn: true }
  if (d === 1) return { text: 'cooked yesterday', warn: true }
  return { text: `cooked ${d}d ago`, warn: d <= 14 }
}

export function PlanPage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const userData = useLiveQuery(() => db.userData.toArray(), [])
  const plan = useLiveQuery(() => db.plans.get(CURRENT_PLAN_ID), [])
  const cooked = useLiveQuery(() => db.cooked.toArray(), [])
  const [pickerQuery, setPickerQuery] = useState('')

  const byId = useMemo(() => {
    const m = new Map<string, Recipe>()
    for (const r of recipes ?? []) m.set(r.id, r)
    return m
  }, [recipes])

  const starsById = useMemo(() => {
    const m = new Map<string, Stars>()
    for (const u of userData ?? []) if (u.stars) m.set(u.recipeId, u.stars)
    return m
  }, [userData])

  const lastCookedById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cooked ?? []) {
      const prev = m.get(c.recipeId)
      if (!prev || c.date > prev) m.set(c.recipeId, c.date)
    }
    return m
  }, [cooked])

  const plannedIds = plan?.recipeIds ?? []
  const portions = plan?.portions ?? 2
  const planned = plannedIds
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => r != null)

  // Variety tallies across the planned week.
  const cuisineCounts = useMemo(() => tally(planned.map((r) => r.cuisine)), [planned])
  const proteinCounts = useMemo(
    () => tally(planned.map((r) => r.mainProtein ?? 'other')),
    [planned],
  )

  // Picker candidates: keepers (★3+), not already planned, not a no-go (fish).
  const candidates = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return (recipes ?? [])
      .filter((r) => {
        const s = starsById.get(r.id)
        if (!s || s < 3) return false
        if (plannedIds.includes(r.id)) return false
        if (r.allergens.includes('fish')) return false
        if (q && !r.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        const sd = (starsById.get(b.id) ?? 0) - (starsById.get(a.id) ?? 0)
        if (sd !== 0) return sd
        // Then favour not-recently-cooked.
        const ad = lastCookedById.get(a.id)
        const bd = lastCookedById.get(b.id)
        if (!ad && bd) return -1
        if (ad && !bd) return 1
        if (ad && bd) return daysSince(bd) - daysSince(ad)
        return a.title.localeCompare(b.title)
      })
  }, [recipes, starsById, plannedIds, lastCookedById, pickerQuery])

  const favourites = candidates.filter((r) => (starsById.get(r.id) ?? 0) >= 4)
  const variety = candidates.filter((r) => starsById.get(r.id) === 3)

  if (recipes === undefined || userData === undefined) {
    return <p className="text-stone-500">Loading…</p>
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-stone-500">Cooking for</span>
          <div className="inline-flex overflow-hidden rounded-md border border-stone-300">
            {PORTION_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPortions(n)}
                className={`px-3 py-1 font-medium transition ${
                  portions === n
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-stone-600 hover:bg-stone-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* The week */}
      {planned.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
          Nothing planned yet — add meals from your shortlist below.
        </div>
      ) : (
        <>
          {/* Variety summary */}
          <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-stone-200 bg-white p-3 text-sm">
            <VarietyGroup label="Cuisines" counts={cuisineCounts} />
            <VarietyGroup label="Proteins" counts={proteinCounts} capitalize />
          </div>

          <ul className="mt-4 space-y-2">
            {planned.map((r) => {
              const rec = recency(lastCookedById.get(r.id))
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5"
                >
                  <Link to={`/recipe/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <img
                      src={resolveAsset(r.image)}
                      alt=""
                      className="size-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-stone-800">{r.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                        <span>{r.cuisine}</span>
                        {r.mainProtein && <span className="capitalize">· {r.mainProtein}</span>}
                        <span>· ⏱ {r.prepTime} min</span>
                        <span className={rec.warn ? 'text-amber-600' : 'text-stone-400'}>
                          · {rec.text}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => markCooked(r.id)}
                    className="rounded-md bg-green-50 px-2.5 py-1 text-sm font-medium text-green-700 hover:bg-green-100"
                    title="Mark as cooked (stamps today, removes from week)"
                  >
                    ✓ Cooked
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromPlan(r.id)}
                    className="rounded-md px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                    title="Remove from week"
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* Picker */}
      <div className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Add meals</h2>
          <input
            type="search"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search your shortlist…"
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none"
          />
        </div>

        <PickerStrip
          title="Your favourites"
          subtitle="★4–5"
          items={favourites}
          lastCookedById={lastCookedById}
        />
        <PickerStrip
          title="For variety"
          subtitle="★3 — variety injectors"
          items={variety}
          lastCookedById={lastCookedById}
        />

        {favourites.length === 0 && variety.length === 0 && (
          <p className="mt-3 text-sm text-stone-500">
            No more shortlisted recipes to add.{' '}
            <Link to="/curate" className="text-orange-600 hover:underline">
              Rate some more →
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}

function tally(values: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1)
  return m
}

function VarietyGroup({
  label,
  counts,
  capitalize,
}: {
  label: string
  counts: Map<string, number>
  capitalize?: boolean
}) {
  if (counts.size === 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold tracking-wide text-stone-400 uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {[...counts.entries()].map(([key, n]) => (
          <span
            key={key}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              n > 1 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
            } ${capitalize ? 'capitalize' : ''}`}
            title={n > 1 ? `${n}× — light on variety` : undefined}
          >
            {key}
            {n > 1 ? ` ×${n}` : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function PickerStrip({
  title,
  subtitle,
  items,
  lastCookedById,
}: {
  title: string
  subtitle: string
  items: Recipe[]
  lastCookedById: Map<string, string>
}) {
  if (items.length === 0) return null
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-stone-600">
        {title} <span className="text-stone-400">{subtitle}</span>
      </h3>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {items.map((r) => {
          const rec = recency(lastCookedById.get(r.id))
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => addToPlan(r.id)}
              className="group relative w-40 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              title="Add to week"
            >
              <img
                src={resolveAsset(r.image)}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="absolute top-1.5 right-1.5 rounded-full bg-orange-500 px-1.5 text-lg leading-6 font-bold text-white opacity-0 transition group-hover:opacity-100">
                +
              </span>
              <div className="p-2">
                <div className="truncate text-sm font-medium text-stone-800">{r.title}</div>
                <div className="mt-0.5 truncate text-xs text-stone-500">
                  {r.cuisine}
                  {r.mainProtein ? ` · ${r.mainProtein}` : ''}
                </div>
                <div className={`mt-0.5 truncate text-xs ${rec.warn ? 'text-amber-600' : 'text-stone-400'}`}>
                  {rec.text}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
