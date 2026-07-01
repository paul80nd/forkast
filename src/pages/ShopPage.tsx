import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { CURRENT_PLAN_ID } from '../lib/plan'
import { usePersistentState } from '../hooks/usePersistentState'
import {
  getPlanShoppingList,
  toggleChecked,
  clearChecked,
  addExtra,
  toggleExtra,
  removeExtra,
  setBinding,
  unbind,
  createIngredient,
  setIngredientDensity,
  updateIngredient,
} from '../app/shopping'
import { matchIngredient } from '../lib/ingredientMatch'
import { AISLE_ORDER, DENSITY_PRESETS, type IngredientDef } from '../data/ingredients'
import type { ShopLine } from '../lib/shopping'
import type { Binding } from '../schema/userData'

/** Density only matters for weight/volume buys (bridging tbsp/tsp → grams); not for counts. */
function needsDensity(purchaseUnit: string): boolean {
  return purchaseUnit !== 'each'
}

/** How a purchase unit reads after an ingredient name, e.g. "in g" / "each". */
function buyUnitLabel(purchaseUnit: string): string {
  return purchaseUnit === 'each' ? 'each' : `in ${purchaseUnit}`
}

// Base "buy" units offered when creating a new dictionary ingredient (recipe units like tsp
// convert into these where a conversion exists).
const PURCHASE_UNITS = ['each', 'g', 'kg', 'ml', 'l']

export function ShopPage() {
  const plan = useLiveQuery(() => db.plans.get(CURRENT_PLAN_ID), [])
  const shopping = useLiveQuery(() => db.shopping.get(CURRENT_PLAN_ID), [])
  const list = useLiveQuery(() => getPlanShoppingList(), [])
  const dict = useLiveQuery(() => db.dictionary.toArray(), [])
  const bindings = useLiveQuery(() => db.bindings.toArray(), [])
  const [extraText, setExtraText] = useState('')

  const portions = plan?.portions ?? 2

  if (plan === undefined || list === undefined) return <p className="text-stone-500">Loading…</p>

  // Meals = recipes actually on the list; a plan can hold stale ids (e.g. recipes deleted by a
  // re-import) that no longer resolve, so count what the list is built from, not the raw ids.
  const mealCount = list.mealCount

  if (mealCount === 0) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-white dark:bg-stone-100 p-8 text-center text-stone-500">
          No meals planned, so nothing to buy.{' '}
          <Link to="/plan" className="text-orange-600 hover:underline">
            Plan a week →
          </Link>
        </div>
      </section>
    )
  }

  const checked = new Set(shopping?.checked ?? [])
  const extras = shopping?.extras ?? []
  const itemCount =
    list.aisles.reduce((n, a) => n + a.lines.length, 0) + list.unmatched.length

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <span>
            {itemCount} items · {mealCount} meals · for {portions}
          </span>
          {checked.size > 0 && (
            <button
              type="button"
              onClick={() => clearChecked()}
              className="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
            >
              Clear ticks
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {list.aisles.map((group) => (
          <div key={group.aisle}>
            <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {group.aisle}
            </h2>
            <ul className="mt-1.5 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white dark:bg-stone-100">
              {group.lines.map((line) => (
                <CheckRow
                  key={line.key}
                  label={line.label}
                  detail={line.detail}
                  recipeCount={line.recipeCount}
                  checked={checked.has(line.key)}
                  onToggle={() => toggleChecked(line.key)}
                />
              ))}
            </ul>
          </div>
        ))}

        {list.unmatched.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-amber-600 uppercase">
              Check these <span className="font-normal normal-case text-amber-500">· bind to merge across recipes</span>
            </h2>
            <ul className="mt-1.5 divide-y divide-stone-100 rounded-xl border border-amber-200 bg-amber-50">
              {list.unmatched.map((line) => (
                <UnmatchedRow
                  key={line.key}
                  line={line}
                  checked={checked.has(line.key)}
                  dict={dict ?? []}
                />
              ))}
            </ul>
          </div>
        )}

        {bindings && bindings.length > 0 && (
          <BindingsPanel bindings={bindings} dict={dict ?? []} />
        )}

        {list.unquantified.length > 0 && (
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-600">Also (no quantity given):</span>{' '}
            {list.unquantified.join(', ')}
          </p>
        )}

        {/* Manual extras */}
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
            Extras
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addExtra(extraText)
              setExtraText('')
            }}
            className="mt-1.5 flex gap-2"
          >
            <input
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              placeholder="Add anything else…"
              className="flex-1 rounded-md border border-stone-300 bg-white dark:bg-stone-100 px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
            >
              Add
            </button>
          </form>
          {extras.length > 0 && (
            <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white dark:bg-stone-100">
              {extras.map((e, i) => (
                <CheckRow
                  key={i}
                  label={e.text}
                  checked={e.checked}
                  onToggle={() => toggleExtra(i)}
                  onRemove={() => removeExtra(i)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Store cupboard */}
        {list.basics.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Store cupboard <span className="font-normal text-stone-400">· assumed in</span>
            </h2>
            <ul className="mt-1.5 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-stone-50">
              {list.basics.map((b) => {
                const key = `basic|${b}`
                return (
                  <CheckRow
                    key={key}
                    label={b}
                    muted
                    checked={checked.has(key)}
                    onToggle={() => toggleChecked(key)}
                  />
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

// Compose the merge subline: recipe-unit breakdown and/or "from N recipes" (only when a line
// actually combines 2+ recipes) — so you can spot-check the amounts against the recipes.
function mergeSubline(detail?: string, recipeCount?: number): string | undefined {
  const parts: string[] = []
  if (detail) parts.push(detail)
  if (recipeCount && recipeCount > 1) parts.push(`from ${recipeCount} recipes`)
  return parts.length ? parts.join(' · ') : undefined
}

function CheckRow({
  label,
  detail,
  recipeCount,
  checked,
  onToggle,
  onRemove,
  muted,
}: {
  label: string
  detail?: string
  recipeCount?: number
  checked: boolean
  onToggle: () => void
  onRemove?: () => void
  muted?: boolean
}) {
  const subline = mergeSubline(detail, recipeCount)
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <label className="flex flex-1 cursor-pointer items-center gap-3 select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="size-4 accent-orange-500"
        />
        <span className="min-w-0">
          <span
            className={`block ${
              checked ? 'text-stone-400 line-through' : muted ? 'text-stone-500' : 'text-stone-800'
            }`}
          >
            {label}
          </span>
          {subline && (
            <span className={`block text-xs ${checked ? 'text-stone-300' : 'text-stone-400'}`}>
              {subline}
            </span>
          )}
        </span>
      </label>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          title="Remove"
        >
          ✕
        </button>
      )}
    </li>
  )
}

// An unmatched shopping line: tickable like any other, plus a "Bind" toggle that opens the
// binder so it can be merged into a canonical ingredient across the plan.
function UnmatchedRow({
  line,
  checked,
  dict,
}: {
  line: ShopLine
  checked: boolean
  dict: IngredientDef[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-3">
        <label className="flex flex-1 cursor-pointer items-center gap-3 select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleChecked(line.key)}
            className="size-4 accent-orange-500"
          />
          <span className="min-w-0">
            <span className={checked ? 'text-stone-400 line-through' : 'text-stone-800'}>
              {line.label}
            </span>
            {line.recipeCount != null && line.recipeCount > 1 && (
              <span className={`block text-xs ${checked ? 'text-stone-300' : 'text-stone-400'}`}>
                from {line.recipeCount} recipes
              </span>
            )}
          </span>
        </label>
        {line.bindName && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-200"
          >
            {open ? 'Cancel' : 'Bind'}
          </button>
        )}
      </div>
      {open && line.bindName && (
        <BindPanel name={line.bindName} dict={dict} onDone={() => setOpen(false)} />
      )}
    </li>
  )
}

// The lazy-bind picker: "did you mean?" candidates from the dictionary, a search box, and a
// create-new path. Binding is keyed on the ingredient name, so it merges every line of that
// name across the plan.
function BindPanel({
  name,
  dict,
  onDone,
}: {
  name: string
  dict: IngredientDef[]
  onDone: () => void
}) {
  const [query, setQuery] = useState(name)
  const [creating, setCreating] = useState(false)
  const [aisle, setAisle] = useState('Pantry')
  const [unit, setUnit] = useState('g')
  const [density, setDensity] = useState('') // '' = none, else g/ml as string
  const candidates = useMemo(() => matchIngredient(query, dict, 6), [query, dict])

  async function bindTo(id: string) {
    await setBinding(name, id)
    onDone()
  }
  async function create() {
    const def = await createIngredient({
      name: query.trim() || name,
      aisle,
      purchaseUnit: unit,
      densityGPerMl: needsDensity(unit) && density ? Number(density) : undefined,
    })
    await setBinding(name, def.id)
    onDone()
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-white p-2 text-sm dark:bg-stone-100">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search or name the ingredient…"
        className="w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none dark:bg-stone-100"
      />

      {!creating ? (
        <>
          {candidates.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {candidates.map((c) => (
                <li key={c.def.id}>
                  <button
                    type="button"
                    onClick={() => void bindTo(c.def.id)}
                    className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-sm text-stone-700 transition hover:border-orange-300 hover:text-orange-700"
                    title={`Bind to “${c.def.name}”`}
                  >
                    {c.def.name}{' '}
                    <span className="text-xs text-stone-400">· {c.def.aisle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-2 text-xs font-medium text-orange-600 hover:underline"
          >
            + Create “{query.trim() || name}” as a new ingredient…
          </button>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-stone-500">
            Aisle
            <select
              value={aisle}
              onChange={(e) => setAisle(e.target.value)}
              className="mt-0.5 block rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:bg-stone-100"
            >
              {AISLE_ORDER.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Bought in
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-0.5 block rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:bg-stone-100"
            >
              {PURCHASE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u === 'each' ? 'each (count)' : u}
                </option>
              ))}
            </select>
          </label>
          {needsDensity(unit) && (
            <label className="text-xs text-stone-500" title="Lets tbsp/tsp amounts convert to the buy unit">
              Density
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="mt-0.5 block rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:bg-stone-100"
              >
                <option value="">— (don't convert spoons)</option>
                {DENSITY_PRESETS.map((p) => (
                  <option key={p.label} value={p.gPerMl}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => void create()}
            className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
          >
            Create &amp; bind
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-md px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}

// Manage saved name→ingredient bindings: filter, edit the ingredient's aisle / buy unit /
// density, or unbind. Windowed (infinite scroll) since the dictionary grows large over time.
const BINDINGS_PAGE = 50

function BindingsPanel({ bindings, dict }: { bindings: Binding[]; dict: IngredientDef[] }) {
  const [query, setQuery] = usePersistentState('shop.bindingsQuery', '')
  const [visible, setVisible] = useState(BINDINGS_PAGE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const byId = useMemo(() => new Map(dict.map((d) => [d.id, d])), [dict])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bindings
      .filter(
        (b) =>
          !q || b.name.includes(q) || (byId.get(b.ingredientId)?.name.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [bindings, byId, query])

  useEffect(() => setVisible(BINDINGS_PAGE), [query])
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisible((v) => v + BINDINGS_PAGE)
      },
      { rootMargin: '300px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered.length, visible])

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs font-semibold tracking-wide text-stone-500 uppercase">
        Your bindings ({bindings.length})
      </summary>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter bindings…"
        className="mt-2 w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none dark:bg-stone-100"
      />
      <ul className="mt-1.5 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white dark:bg-stone-100">
        {filtered.slice(0, visible).map((b) => (
          <BindingRow key={b.name} binding={b} def={byId.get(b.ingredientId)} />
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-stone-400">No bindings match.</li>
        )}
      </ul>
      {visible < filtered.length && <div ref={sentinelRef} className="h-1" />}
    </details>
  )
}

function BindingRow({ binding, def }: { binding: Binding; def?: IngredientDef }) {
  const [editing, setEditing] = useState(false)
  const selectClass =
    'rounded-md border border-stone-300 bg-white px-1.5 py-0.5 text-xs text-stone-600 dark:bg-stone-100'
  return (
    <li className="px-3 py-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-stone-600">
          {binding.name}{' '}
          <span className="text-stone-400">
            → {def?.name ?? binding.ingredientId}
            {def && <span className="text-stone-300"> ({buyUnitLabel(def.purchaseUnit)})</span>}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {def && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              aria-expanded={editing}
              className="rounded px-1.5 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void unbind(binding.name)}
            className="rounded px-1.5 text-xs text-stone-400 hover:bg-stone-100 hover:text-rose-600"
            title="Unbind — back to verbatim"
          >
            Unbind
          </button>
        </div>
      </div>

      {editing && def && (
        <div className="mt-2 flex flex-wrap items-end gap-2 pb-1">
          <label className="text-xs text-stone-500">
            Aisle
            <select
              value={def.aisle}
              onChange={(e) => void updateIngredient(def.id, { aisle: e.target.value })}
              className={`mt-0.5 block ${selectClass}`}
            >
              {AISLE_ORDER.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Bought in
            <select
              value={def.purchaseUnit}
              onChange={(e) => void updateIngredient(def.id, { purchaseUnit: e.target.value })}
              className={`mt-0.5 block ${selectClass}`}
            >
              {PURCHASE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u === 'each' ? 'each (count)' : u}
                </option>
              ))}
            </select>
          </label>
          {needsDensity(def.purchaseUnit) && (
            <label className="text-xs text-stone-500" title="Lets tbsp/tsp convert to the buy unit">
              Density
              <select
                value={def.densityGPerMl ?? ''}
                onChange={(e) =>
                  void setIngredientDensity(def.id, e.target.value ? Number(e.target.value) : undefined)
                }
                className={`mt-0.5 block ${selectClass}`}
              >
                <option value="">no spoon conversion</option>
                {DENSITY_PRESETS.map((p) => (
                  <option key={p.label} value={p.gPerMl}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
    </li>
  )
}
