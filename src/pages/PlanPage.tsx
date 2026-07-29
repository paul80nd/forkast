import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { NOGO_ALLERGENS } from '../data/nogo'
import { RecipeImage } from '../components/RecipeImage'
import { CURRENT_PLAN_ID, daysSince } from '../lib/plan'
import {
  addToPlan,
  addRecipesToPlan,
  removeFromPlan,
  insertIntoPlanAt,
  setPortions,
  setMealPortions,
  markCooked,
  unmarkCooked,
  swapPlanRecipe,
} from '../app/plan'
import { useToast } from '../hooks/useToast'
import { suggestWeekPlan } from '../app/suggest'
import { getUseUpStatus } from '../app/useUp'
import { resolveDishes, variantLabel } from '../lib/variants'
import { usePersistentState } from '../hooks/usePersistentState'
import { RecipeModal } from '../components/RecipeModal'
import { UseUpPanel } from '../components/UseUpPanel'
import { Select, fieldBoxClass } from '../components/Select'
import { Switch } from '../components/Switch'
import { SegmentedControl } from '../components/SegmentedControl'
import {
  filterRecipes,
  matchesRating,
  EMPTY_BROWSE_FILTER,
} from '../lib/browseFilter'
import type { Suggestion } from '../lib/suggest'
import type { Recipe } from '../schema/recipe'
import type { Stars } from '../schema/userData'

/** A shortlist slot under review — a suggested recipe plus its lock state. */
interface Slot extends Suggestion {
  locked: boolean
}

/** A fresh 32-bit seed per suggestion run, so weeks vary (deterministic only in tests). */
function freshSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}

const PORTION_OPTIONS = [2, 4, 6]
// Per-meal choices go a little wider than the plan default — 1 (a solo lunch), odd sizes for
// guests (5), and 8 for a big batch-cook. The plan default is folded in so it's always offered.
const MEAL_PORTION_OPTIONS = [1, 2, 3, 4, 5, 6, 8]

// The picker's minimum-rating gate (a keeper-focused subset of Browse's RatingFilter) — paired
// with an "include unrated" toggle for the untriaged backlog, mirroring the suggester.
type PickRating = '3plus' | '4plus' | '5'
const PICK_RATING_LABELS: Record<PickRating, string> = {
  '3plus': '★3+ keepers',
  '4plus': '★4+',
  '5': '★5 only',
}
const TIME_OPTIONS = [
  { value: 0, label: 'Any time' },
  { value: 20, label: '≤ 20 min' },
  { value: 30, label: '≤ 30 min' },
  { value: 45, label: '≤ 45 min' },
]

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
  const overrides = useLiveQuery(() => db.variantOverrides.toArray(), [])
  // Manual "Add meals" picker filters — the same facets the suggester offers, so hand-picking
  // isn't the poor cousin. Persisted so they survive navigation, like Browse's filters.
  const [pickerQuery, setPickerQuery] = usePersistentState('pick.query', '')
  const [pickCuisine, setPickCuisine] = usePersistentState('pick.cuisine', 'all')
  const [pickProtein, setPickProtein] = usePersistentState('pick.protein', 'all')
  const [pickMaxTime, setPickMaxTime] = usePersistentState('pick.maxTime', 0) // 0 = any
  const [pickRating, setPickRating] = usePersistentState<PickRating>('pick.rating', '3plus')
  // Off by default — the picker leads with keepers; opt in to also surface the untriaged backlog.
  const [pickIncludeUnrated, setPickIncludeUnrated] = usePersistentState('pick.includeUnrated', false)
  // The recipe shown in the pop-up detail view (opened from a suggested or planned row); null = closed.
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null)
  const showToast = useToast()

  // Remove a meal (or mark it cooked) with an undo toast — both silently mutate the week off to
  // the side, so a confirmation that restores the meal to its slot guards against a mis-tap.
  function removeWithUndo(recipe: Recipe, slot: number) {
    void removeFromPlan(recipe.id)
    showToast({
      action: 'Undo',
      onAction: () => void insertIntoPlanAt(recipe.id, slot),
      message: (
        <>
          Removed <span className="font-medium">{recipe.title}</span> from the week
        </>
      ),
    })
  }
  async function cookWithUndo(recipe: Recipe, slot: number) {
    const cookedId = await markCooked(recipe.id)
    showToast({
      action: 'Undo',
      onAction: () => {
        void unmarkCooked(cookedId)
        void insertIntoPlanAt(recipe.id, slot)
      },
      message: (
        <>
          Marked <span className="font-medium">{recipe.title}</span> cooked
        </>
      ),
    })
  }

  // Assisted "suggest a varied week": a non-destructive shortlist you reroll / lock / swap /
  // accept. The target count persists; the shortlist is transient until accepted.
  const [suggestCount, setSuggestCount] = usePersistentState('plan.suggestCount', 5)
  // Draw from unrated recipes too (treated as a neutral ★3 ◆3), so the planner works before the
  // whole collection is triaged. On by default; persisted.
  const [includeUnrated, setIncludeUnrated] = usePersistentState('plan.includeUnrated', true)
  const [shortlist, setShortlist] = useState<Slot[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [suggestedEmpty, setSuggestedEmpty] = useState(false)
  // The "use up ingredients" tool folds into the same assistant bar; its badge counts the
  // listed ingredients the current week doesn't already use.
  const [useUpOpen, setUseUpOpen] = useState(false)
  const useUpStatus = useLiveQuery(() => getUseUpStatus(), [])
  const useUpUnused = (useUpStatus ?? []).filter((s) => !s.usedByPlan).length

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

  // Recipes carrying cooking notes — so a planned meal flags "read your notes before you cook".
  const notedIds = useMemo(() => {
    const s = new Set<string>()
    for (const u of userData ?? []) if (u.notes) s.add(u.recipeId)
    return s
  }, [userData])

  const lastCookedById = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cooked ?? []) {
      const prev = m.get(c.recipeId)
      if (!prev || c.date > prev) m.set(c.recipeId, c.date)
    }
    return m
  }, [cooked])

  // recipe id → its dish's variants (lead first), for the planned-meal version picker.
  // Effective grouping = import variants overlaid with user overrides.
  const dishByRecipe = useMemo(() => {
    const byRecipe = new Map<string, Recipe[]>()
    for (const d of resolveDishes(recipes ?? [], overrides ?? [])) {
      for (const v of d.variants) byRecipe.set(v.id, d.variants)
    }
    return byRecipe
  }, [recipes, overrides])
  // Which planned row has its version picker expanded.
  const [versionsOpenId, setVersionsOpenId] = useState<string | null>(null)

  const plannedIds = plan?.recipeIds ?? []
  const portions = plan?.portions ?? 2
  const planned = plannedIds
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => r != null)
  const plannedCount = planned.length

  // Suggest the meals to fill the week — a fresh shortlist, all unlocked.
  async function runSuggest() {
    setSuggesting(true)
    try {
      const res = await suggestWeekPlan({ count: suggestCount, seed: freshSeed(), includeUnrated })
      setShortlist(res.map((s) => ({ ...s, locked: false })))
      setSuggestedEmpty(res.length === 0)
    } finally {
      setSuggesting(false)
    }
  }

  // Reroll the unlocked slots, keeping locked ones (and their variety) in place.
  async function reSuggest() {
    setSuggesting(true)
    try {
      const locked = shortlist.filter((s) => s.locked)
      const res = await suggestWeekPlan({
        count: suggestCount,
        seed: freshSeed(),
        taken: locked.map((s) => s.id),
        includeUnrated,
      })
      let ri = 0
      const next: Slot[] = []
      for (const s of shortlist) {
        if (s.locked) next.push(s)
        else if (res[ri]) next.push({ ...res[ri++], locked: false })
      }
      while (ri < res.length) next.push({ ...res[ri++], locked: false })
      setShortlist(next)
    } finally {
      setSuggesting(false)
    }
  }

  // Replace one slot with a different pick, varied against the others and excluding the rejected.
  async function reroll(index: number) {
    const slot = shortlist[index]
    const others = shortlist.filter((_, i) => i !== index)
    const res = await suggestWeekPlan({
      count: plannedCount + shortlist.length, // basket = planned + others ⇒ need exactly 1
      seed: freshSeed(),
      taken: others.map((s) => s.id),
      exclude: [slot.id],
      includeUnrated,
    })
    if (res[0]) {
      setShortlist((sl) => sl.map((s, i) => (i === index ? { ...res[0], locked: s.locked } : s)))
    }
  }

  // Swap a slot to a named sibling in its variant group (no scoring — a direct choice).
  function swapVariant(index: number, siblingId: string) {
    setShortlist((sl) =>
      sl.map((s, i) => (i === index ? { ...s, id: siblingId, reasons: ['variant'] } : s)),
    )
  }
  function toggleLock(index: number) {
    setShortlist((sl) => sl.map((s, i) => (i === index ? { ...s, locked: !s.locked } : s)))
  }
  function removeSlot(index: number) {
    setShortlist((sl) => sl.filter((_, i) => i !== index))
  }
  async function acceptShortlist() {
    await addRecipesToPlan(shortlist.map((s) => s.id))
    setShortlist([])
    setSuggestedEmpty(false)
  }

  const shortlistRecipes = shortlist
    .map((s) => byId.get(s.id))
    .filter((r): r is Recipe => r != null)

  // Variety tallies across the planned week.
  const cuisineCounts = useMemo(() => tally(planned.map((r) => r.cuisine)), [planned])
  const proteinCounts = useMemo(
    () => tally(planned.map((r) => r.mainProtein ?? 'other')),
    [planned],
  )

  // Facet options for the picker, drawn from the whole catalogue.
  const cuisineOptions = useMemo(
    () => Array.from(new Set((recipes ?? []).map((r) => r.cuisine))).sort(),
    [recipes],
  )
  const proteinOptions = useMemo(
    () =>
      Array.from(
        new Set((recipes ?? []).map((r) => r.mainProtein).filter((p): p is string => !!p)),
      ).sort(),
    [recipes],
  )

  // Picker candidates: Browse's filter pipeline for the shared facets (query/cuisine/protein/time),
  // then the picker's own gate — a keeper minimum ★ (optionally union'd with the unrated backlog),
  // never already-planned, never a no-go (fish).
  const candidates = useMemo(() => {
    const filtered = filterRecipes(
      recipes ?? [],
      {
        ...EMPTY_BROWSE_FILTER,
        query: pickerQuery,
        cuisine: pickCuisine,
        protein: pickProtein,
        maxTime: pickMaxTime,
      },
      starsById,
    )
    return filtered
      .filter((r) => {
        if (plannedIds.includes(r.id)) return false
        if (r.allergens.some((a) => NOGO_ALLERGENS.includes(a))) return false
        const s = starsById.get(r.id)
        if (s === undefined) return pickIncludeUnrated
        return matchesRating(s, pickRating)
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
  }, [
    recipes,
    starsById,
    plannedIds,
    lastCookedById,
    pickerQuery,
    pickCuisine,
    pickProtein,
    pickMaxTime,
    pickRating,
    pickIncludeUnrated,
  ])

  const favourites = candidates.filter((r) => (starsById.get(r.id) ?? 0) >= 4)
  const variety = candidates.filter((r) => starsById.get(r.id) === 3)
  const unratedPicks = candidates.filter((r) => !starsById.has(r.id))
  const pickFiltersActive =
    pickerQuery.trim() !== '' ||
    pickCuisine !== 'all' ||
    pickProtein !== 'all' ||
    pickMaxTime > 0 ||
    pickRating !== '3plus' ||
    pickIncludeUnrated
  const clearPickFilters = () => {
    setPickerQuery('')
    setPickCuisine('all')
    setPickProtein('all')
    setPickMaxTime(0)
    setPickRating('3plus')
    setPickIncludeUnrated(false)
  }

  if (recipes === undefined || userData === undefined) {
    return <p className="text-muted">Loading…</p>
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Cooking for</span>
          <SegmentedControl
            ariaLabel="Cooking for"
            options={PORTION_OPTIONS}
            value={portions}
            onChange={setPortions}
          />
        </div>
      </div>

      {/* Plan assistant — Suggest a week + Use up ingredients, kept in one compact bar so the
          week below stays the main content. Each tool's detail sits inside this bar. */}
      <div className="mt-4 rounded-2xl border border-line bg-card p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <button
            type="button"
            disabled={suggesting}
            onClick={runSuggest}
            className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            {suggesting ? 'Thinking…' : 'Suggest a varied week'}
          </button>
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input
              type="number"
              min={1}
              max={14}
              value={suggestCount}
              onChange={(e) => setSuggestCount(Math.max(1, Math.min(14, Number(e.target.value) || 1)))}
              className="w-16 rounded-md border border-line-strong bg-card px-2 py-1 text-sm"
            />
            <span>meals a week</span>
          </label>
          <Switch
            checked={includeUnrated}
            onChange={setIncludeUnrated}
            label="Include unrated"
            title="Also draw from recipes you haven’t rated yet, treating them as a neutral ★3"
          />
          {plannedCount > 0 && (
            <span className="text-xs text-muted">
              fills {Math.max(0, suggestCount - plannedCount)} slots after {plannedCount} planned
            </span>
          )}
          {/* Use up ingredients — folds open below the bar, so the week isn't pushed down. */}
          <button
            type="button"
            onClick={() => setUseUpOpen((o) => !o)}
            aria-expanded={useUpOpen}
            className="ml-auto rounded-md px-2.5 py-1.5 text-sm font-medium text-brand-ink transition hover:bg-sunken"
          >
            {useUpOpen ? '▾' : '▸'} Use up ingredients
            {useUpUnused > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-wash px-1.5 text-xs text-brand-ink">
                {useUpUnused} unused
              </span>
            )}
          </button>
        </div>
        {useUpOpen && <UseUpPanel />}
      </div>

      {suggestedEmpty && shortlist.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          Nothing to suggest — your week may be full, or there aren’t enough rated,
          not-recently-cooked recipes.{' '}
          <Link to="/curate" className="text-brand-ink underline">
            Rate more →
          </Link>
        </p>
      )}

      {shortlist.length > 0 && (
        <div className="mt-4 rounded-2xl border border-info-200 bg-info-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-info-900">Suggested week</h2>
              <p className="text-xs text-info-700">
                A proposal — reroll, lock, or swap any, then accept. Nothing’s added yet.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={acceptShortlist}
                className="rounded-md bg-info-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-info-700"
              >
                Accept {shortlist.length} → week
              </button>
              <button
                type="button"
                disabled={suggesting}
                onClick={reSuggest}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-info-700 hover:bg-info-100 disabled:opacity-50"
              >
                Re-suggest
              </button>
              <button
                type="button"
                onClick={() => setShortlist([])}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-sunken"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Variety summary of the proposal */}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <VarietyGroup label="Cuisines" counts={tally(shortlistRecipes.map((r) => r.cuisine))} />
            <VarietyGroup
              label="Proteins"
              counts={tally(shortlistRecipes.map((r) => r.mainProtein ?? 'other'))}
              capitalize
            />
          </div>

          <ul className="mt-3 space-y-2">
            {shortlist.map((slot, i) => {
              const r = byId.get(slot.id)
              if (!r) return null
              const siblings = (dishByRecipe.get(slot.id) ?? []).filter((v) => v.id !== slot.id)
              return (
                <SuggestionSlot
                  key={slot.id}
                  recipe={r}
                  slot={slot}
                  unrated={!starsById.has(slot.id)}
                  lastCooked={lastCookedById.get(slot.id)}
                  siblings={siblings}
                  onOpen={() => setModalRecipe(r)}
                  onLock={() => toggleLock(i)}
                  onReroll={() => reroll(i)}
                  onSwap={(sid) => swapVariant(i, sid)}
                  onRemove={() => removeSlot(i)}
                />
              )
            })}
          </ul>
        </div>
      )}

      {/* The week */}
      {planned.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-card p-8 text-center">
          <p className="text-muted">Nothing planned yet.</p>
          <button
            type="button"
            disabled={suggesting}
            onClick={runSuggest}
            className="mt-3 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            {suggesting ? 'Thinking…' : 'Suggest a varied week'}
          </button>
          <p className="mt-2 text-xs text-muted">or add meals from the picker below.</p>
        </div>
      ) : (
        <>
          {/* Variety summary */}
          <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-line bg-card p-3 text-sm">
            <VarietyGroup label="Cuisines" counts={cuisineCounts} />
            <VarietyGroup label="Proteins" counts={proteinCounts} capitalize />
          </div>

          <ul className="mt-4 space-y-2">
            {planned.map((r, slot) => {
              const rec = recency(lastCookedById.get(r.id))
              const siblings = dishByRecipe.get(r.id) ?? [r]
              const hasVersions = siblings.length > 1
              const lead = siblings[0] ?? r
              const versionsOpen = versionsOpenId === r.id
              const mealPortions = plan?.portionOverrides?.[r.id] ?? portions
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-line bg-card p-2.5"
                >
                  <div className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <RecipeImage
                      image={r.image}
                      className="size-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      {/* Only the title opens the detail pop-up — clearest affordance for "more detail". */}
                      <button
                        type="button"
                        onClick={() => setModalRecipe(r)}
                        title="View recipe"
                        className="block max-w-full truncate text-left font-medium text-ink hover:text-brand-ink hover:underline"
                      >
                        {r.title}
                      </button>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span>{r.cuisine}</span>
                        {r.mainProtein && <span className="capitalize">· {r.mainProtein}</span>}
                        <span>· ⏱ {r.prepTime} min</span>
                        <span className={rec.warn ? 'text-warn-ink' : 'text-muted'}>
                          · {rec.text}
                        </span>
                        {notedIds.has(r.id) && (
                          <span
                            className="text-brand-ink"
                            title="You added notes on this recipe — open it to read them"
                          >
                            · <span aria-hidden="true">📝</span>
                            <span className="sr-only">has your notes</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasVersions && (
                    <button
                      type="button"
                      onClick={() => setVersionsOpenId(versionsOpen ? null : r.id)}
                      aria-expanded={versionsOpen}
                      className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                        versionsOpen
                          ? 'bg-brand-700 text-white hover:bg-brand-800'
                          : 'text-brand-ink hover:bg-brand-wash'
                      }`}
                      title="Swap this dish for another version"
                    >
                      ⇄ {siblings.length}
                    </button>
                  )}
                  <MealPortions
                    recipeId={r.id}
                    portions={portions}
                    effective={mealPortions}
                  />
                  <button
                    type="button"
                    onClick={() => void cookWithUndo(r, slot)}
                    className="rounded-md border border-line-strong bg-card px-2.5 py-1 text-sm font-medium text-ink hover:bg-sunken"
                    title="Mark as cooked (stamps today, removes from week)"
                  >
                    Mark cooked
                  </button>
                  <button
                    type="button"
                    onClick={() => removeWithUndo(r, slot)}
                    className="rounded-md px-2 py-1 text-muted hover:bg-sunken hover:text-muted"
                    title="Remove from week"
                  >
                    ✕
                  </button>
                  </div>
                  {hasVersions && versionsOpen && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
                      <span className="mr-1 text-xs font-medium tracking-wide text-muted uppercase">
                        Version
                      </span>
                      {siblings.map((m) => {
                        const isCurrent = m.id === r.id
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={isCurrent}
                            onClick={() => {
                              void swapPlanRecipe(r.id, m.id)
                              setVersionsOpenId(null)
                            }}
                            className={`rounded-full border px-2.5 py-1 text-sm transition ${
                              isCurrent
                                ? 'border-brand-500 bg-brand-700 text-white'
                                : 'border-line bg-card text-ink hover:border-brand-300 hover:text-brand-ink'
                            }`}
                          >
                            {m.id === lead.id ? 'Original' : variantLabel(m.title, lead.title)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* Picker — the same facets the suggester offers, so hand-picking a meal is a first-class path. */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold">Add meals</h2>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search title or ingredient…"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            className={`${fieldBoxClass} min-w-44 flex-1 px-2.5 py-1.5 text-sm`}
          />
          <Select
            value={pickCuisine}
            onChange={(e) => setPickCuisine(e.target.value)}
            aria-label="Filter by cuisine"
          >
            <option value="all">All cuisines</option>
            {cuisineOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {proteinOptions.length > 0 && (
            <Select
              value={pickProtein}
              onChange={(e) => setPickProtein(e.target.value)}
              aria-label="Filter by main protein"
              className="capitalize"
            >
              <option value="all">Any protein</option>
              {proteinOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          )}
          <Select
            value={pickMaxTime}
            onChange={(e) => setPickMaxTime(Number(e.target.value))}
            aria-label="Filter by maximum cooking time"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Select
            value={pickRating}
            onChange={(e) => setPickRating(e.target.value as PickRating)}
            aria-label="Minimum rating"
          >
            {(Object.keys(PICK_RATING_LABELS) as PickRating[]).map((r) => (
              <option key={r} value={r}>
                {PICK_RATING_LABELS[r]}
              </option>
            ))}
          </Select>
          <Switch
            checked={pickIncludeUnrated}
            onChange={setPickIncludeUnrated}
            label="Include unrated"
            title="Also surface recipes you haven’t rated yet"
          />
          {pickFiltersActive && (
            <button
              type="button"
              onClick={clearPickFilters}
              className="rounded-md px-2 py-1 text-sm font-medium text-muted hover:bg-sunken"
            >
              Clear
            </button>
          )}
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
        {pickIncludeUnrated && (
          <PickerStrip
            title="Unrated"
            subtitle="untriaged backlog"
            items={unratedPicks}
            lastCookedById={lastCookedById}
          />
        )}

        {candidates.length === 0 && (
          <p className="mt-3 text-sm text-muted">
            {pickFiltersActive ? (
              <>
                No recipes match those filters.{' '}
                <button type="button" onClick={clearPickFilters} className="text-brand-ink underline">
                  Clear filters
                </button>
              </>
            ) : (
              <>
                No more shortlisted recipes to add.{' '}
                <Link to="/curate" className="text-brand-ink underline">
                  Rate some more →
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      {modalRecipe && (
        <RecipeModal recipe={modalRecipe} onClose={() => setModalRecipe(null)} />
      )}
    </section>
  )
}

// One suggested meal: a compact row (image + meta + "why" tags + lock/reroll/swap/remove). Clicking
// the meal opens the full recipe detail in a pop-up — so reviewing a proposal never navigates away.
function SuggestionSlot({
  recipe,
  slot,
  unrated,
  lastCooked,
  siblings,
  onOpen,
  onLock,
  onReroll,
  onSwap,
  onRemove,
}: {
  recipe: Recipe
  slot: Slot
  unrated: boolean
  lastCooked: string | undefined
  siblings: Recipe[]
  onOpen: () => void
  onLock: () => void
  onReroll: () => void
  onSwap: (siblingId: string) => void
  onRemove: () => void
}) {
  const rec = recency(lastCooked)
  return (
    <li className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex items-center gap-3 p-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <RecipeImage image={recipe.image} className="size-14 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            {/* Only the title opens the detail pop-up — clearest affordance for "more detail". */}
            <button
              type="button"
              onClick={onOpen}
              title="View recipe"
              className="block max-w-full truncate text-left font-medium text-ink hover:text-brand-ink hover:underline"
            >
              {recipe.title}
            </button>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span>{recipe.cuisine}</span>
              {recipe.mainProtein && <span className="capitalize">· {recipe.mainProtein}</span>}
              <span>· ⏱ {recipe.prepTime} min</span>
              <span className={rec.warn ? 'text-warn-ink' : 'text-muted'}>· {rec.text}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {unrated && (
                <span className="rounded-full bg-warn-tint px-1.5 py-0.5 text-[11px] font-medium text-warn-ink">
                  unrated
                </span>
              )}
              {slot.reasons.map((why) => (
                <span key={why} className="rounded-full bg-info-100 px-1.5 py-0.5 text-[11px] font-medium text-info-700">
                  {why}
                </span>
              ))}
            </div>
          </div>
        </div>

        {siblings.length > 0 && (
          <Select
            size="sm"
            value=""
            onChange={(e) => e.target.value && onSwap(e.target.value)}
            aria-label="Swap to a variant"
            className="max-w-32 text-muted"
          >
            <option value="">Swap variant…</option>
            {siblings.map((m) => (
              <option key={m.id} value={m.id}>
                {variantLabel(m.title, recipe.title) || m.title}
              </option>
            ))}
          </Select>
        )}
        <button
          type="button"
          onClick={onLock}
          aria-pressed={slot.locked}
          title={slot.locked ? 'Locked — kept when re-suggesting' : 'Lock this slot'}
          className={`rounded-md px-2 py-1 text-sm transition ${
            slot.locked ? 'bg-info-100 text-info-700' : 'text-muted hover:bg-sunken hover:text-muted'
          }`}
        >
          {slot.locked ? '🔒' : '🔓'}
        </button>
        <button
          type="button"
          onClick={onReroll}
          title="Reroll this slot"
          className="rounded-md px-2 py-1 text-sm text-muted hover:bg-sunken hover:text-muted"
        >
          ↻
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove from suggestion"
          className="rounded-md px-2 py-1 text-muted hover:bg-sunken hover:text-muted"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

// Per-meal "cooking for N" — overrides the week default for one meal (guests / batch-cook). When
// it differs from the default it reads in brand ink so an off-default meal is glanceable; picking
// the default value clears the override (handled in setMealPortions).
function MealPortions({
  recipeId,
  portions,
  effective,
}: {
  recipeId: string
  portions: number
  effective: number
}) {
  const overridden = effective !== portions
  const options = [...new Set([...MEAL_PORTION_OPTIONS, portions, effective])].sort((a, b) => a - b)
  return (
    <label
      className="flex items-center gap-1 text-xs"
      title="Portions for this meal — override the week default for guests or batch-cooking"
    >
      <span className={overridden ? 'font-medium text-brand-ink' : 'text-muted'}>for</span>
      <span className="sr-only">Portions for this meal</span>
      <Select
        size="sm"
        value={effective}
        onChange={(e) => void setMealPortions(recipeId, Number(e.target.value))}
        aria-label="Portions for this meal"
        className={overridden ? 'border-brand-400 font-medium text-brand-ink' : 'text-muted'}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
            {n === portions ? ' (default)' : ''}
          </option>
        ))}
      </Select>
    </label>
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
      <span className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {[...counts.entries()].map(([key, n]) => (
          <span
            key={key}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              n > 1 ? 'bg-warn-tint text-warn-ink' : 'bg-sunken text-muted'
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
      <h3 className="text-sm font-medium text-muted">
        {title} <span className="text-muted">{subtitle}</span>
      </h3>
      <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {items.map((r) => {
          const rec = recency(lastCookedById.get(r.id))
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => addToPlan(r.id)}
              className="group relative w-40 shrink-0 overflow-hidden rounded-xl border border-line bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              title="Add to week"
            >
              <RecipeImage
                image={r.image}
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="absolute top-1.5 right-1.5 rounded-full bg-brand-700 px-1.5 text-lg leading-6 font-bold text-white opacity-0 transition group-hover:opacity-100">
                +
              </span>
              <div className="p-2">
                <div className="truncate text-sm font-medium text-ink">{r.title}</div>
                <div className="mt-0.5 truncate text-xs text-muted">
                  {r.cuisine}
                  {r.mainProtein ? ` · ${r.mainProtein}` : ''}
                </div>
                <div className={`mt-0.5 truncate text-xs ${rec.warn ? 'text-warn-ink' : 'text-muted'}`}>
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
