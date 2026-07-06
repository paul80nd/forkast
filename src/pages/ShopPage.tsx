import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { CURRENT_PLAN_ID } from '../lib/plan'
import { usePersistentState } from '../hooks/usePersistentState'
import { useToast } from '../hooks/useToast'
import {
  getPlanShoppingList,
  toggleChecked,
  clearChecked,
  setChecked,
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
import { PURCHASE_UNITS, defaultPurchaseUnit } from '../lib/units'
import { shoppingListToText, shoppingListToHtml } from '../lib/shoppingExport'
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

export function ShopPage() {
  const plan = useLiveQuery(() => db.plans.get(CURRENT_PLAN_ID), [])
  const shopping = useLiveQuery(() => db.shopping.get(CURRENT_PLAN_ID), [])
  const list = useLiveQuery(() => getPlanShoppingList(), [])
  const dict = useLiveQuery(() => db.dictionary.toArray(), [])
  const bindings = useLiveQuery(() => db.bindings.toArray(), [])
  const [extraText, setExtraText] = useState('')
  const showToast = useToast()

  const portions = plan?.portions ?? 2

  // Gate loading on the derived list only. `plan` resolves to `undefined` both while loading AND
  // when there's simply no plan row yet (never planned a week) — gating on it would wedge the page
  // on "Loading…" forever. `list` always resolves to a real object (mealCount 0 when empty).
  if (list === undefined) return <p className="text-muted">Loading…</p>

  // Meals = recipes actually on the list; a plan can hold stale ids (e.g. recipes deleted by a
  // re-import) that no longer resolve, so count what the list is built from, not the raw ids.
  const mealCount = list.mealCount

  if (mealCount === 0) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-card p-8 text-center text-muted">
          No meals planned, so nothing to buy.{' '}
          <Link to="/plan" className="font-medium text-brand-ink underline underline-offset-2">
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

  // Plain-text checklist for copy/paste (notes app) or email — kept live so the preview and
  // clipboard reflect the current ticks. Mirrors getPlanShoppingListText's title.
  const shareTitle = `Shopping list · ${new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })}`
  const shareText = shoppingListToText(list, checked, extras, { title: shareTitle })
  const shareHtml = shoppingListToHtml(list, checked, extras, { title: shareTitle })

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>
            {itemCount} items · {mealCount} meals · for {portions}
          </span>
          {checked.size > 0 && (
            <button
              type="button"
              onClick={() => {
                const prev = [...checked]
                void clearChecked()
                showToast({
                  action: 'Undo',
                  onAction: () => void setChecked(prev),
                  message: `Cleared ${prev.length} tick${prev.length === 1 ? '' : 's'}`,
                })
              }}
              className="rounded-md px-2 py-1 text-muted hover:bg-sunken"
            >
              Clear ticks
            </button>
          )}
        </div>
      </div>

      {itemCount + extras.length > 0 && <ShareList text={shareText} html={shareHtml} />}

      <div className="mt-4 space-y-6">
        {/* Aisle buy-list: on wide screens the cards flow into two columns so the
            horizontal space is used instead of one tall single column. */}
        <div className="lg:columns-2 lg:gap-6">
          {list.aisles.map((group) => (
            <div key={group.aisle} className="mb-6 break-inside-avoid last:mb-0">
              <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                {group.aisle}
              </h2>
              <ul className="mt-1.5 divide-y divide-divider rounded-xl border border-line bg-card">
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
        </div>

        {list.unmatched.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold tracking-wide text-warn-ink uppercase">
              Check these <span className="font-normal normal-case text-warn-ink">· bind to merge across recipes</span>
            </h2>
            <ul className="mt-1.5 divide-y divide-divider rounded-xl border border-warn-tint bg-warn-wash lg:columns-2 lg:gap-6">
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
          <p className="text-sm text-muted">
            <span className="font-medium text-muted">Also (no quantity given):</span>{' '}
            {list.unquantified.join(', ')}
          </p>
        )}

        {/* Manual extras */}
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
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
              className="flex-1 rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
            >
              Add
            </button>
          </form>
          {extras.length > 0 && (
            <ul className="mt-2 divide-y divide-divider rounded-xl border border-line bg-card">
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
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Store cupboard <span className="font-normal text-muted">· assumed in</span>
            </h2>
            <ul className="mt-1.5 divide-y divide-divider rounded-xl border border-line bg-surface">
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

// Copy or email the shopping list. A collapsible panel with a live text preview (also the
// reliable manual-copy fallback), a plain-text copy tuned for Apple Notes' checklist, a
// rich-text copy for a styled email, and a plain mailto email link.
function ShareList({ text, html }: { text: string; html: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'text' | 'rich' | null>(null)

  function flash(which: 'text' | 'rich') {
    setCopied(which)
    setTimeout(() => setCopied(null), 1500)
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text)
      flash('text')
    } catch {
      // Clipboard blocked (permissions / insecure context) — the textarea below is selectable.
    }
  }

  // Put both HTML and a plain fallback on the clipboard so a paste into an email keeps the
  // styling but a plain target still gets text. Falls back to plain if rich isn't supported.
  async function copyRich() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        }),
      ])
      flash('rich')
    } catch {
      await navigator.clipboard.writeText(text).then(() => flash('rich')).catch(() => {})
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface"
      >
        {open ? 'Hide share' : 'Copy / share list'}
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-line bg-card p-3">
          <textarea
            readOnly
            value={text}
            onFocus={(e) => e.currentTarget.select()}
            rows={Math.min(16, text.split('\n').length + 1)}
            className="w-full rounded-md border border-line-strong bg-surface p-2 font-mono text-xs text-ink"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyText}
              className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800"
            >
              {copied === 'text' ? 'Copied ✓' : 'Copy text'}
            </button>
            <button
              type="button"
              onClick={copyRich}
              className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface"
            >
              {copied === 'rich' ? 'Copied ✓' : 'Copy rich'}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            <span className="font-medium">Copy text</span> for Apple Notes — paste, select all,
            then tap the checklist button for tickable boxes (already-ticked items are marked
            ✓). <span className="font-medium">Copy rich</span> pastes a styled list into an
            email or notes app.
          </p>
        </div>
      )}
    </div>
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
          className="fk-check"
        />
        <span className="min-w-0">
          <span
            className={`block ${
              checked ? 'text-muted line-through' : muted ? 'text-muted' : 'text-ink'
            }`}
          >
            {label}
          </span>
          {subline && (
            <span className={`block text-xs ${checked ? 'text-subtle' : 'text-muted'}`}>
              {subline}
            </span>
          )}
        </span>
      </label>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded px-1.5 text-muted hover:bg-sunken hover:text-muted"
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
    <li className="px-3 py-2 break-inside-avoid">
      <div className="flex items-center gap-3">
        <label className="flex flex-1 cursor-pointer items-center gap-3 select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleChecked(line.key)}
            className="fk-check"
          />
          <span className="min-w-0">
            <span className={checked ? 'text-muted line-through' : 'text-ink'}>
              {line.label}
            </span>
            {line.recipeCount != null && line.recipeCount > 1 && (
              <span className={`block text-xs ${checked ? 'text-subtle' : 'text-muted'}`}>
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
            className="shrink-0 rounded bg-warn-tint px-2 py-0.5 text-xs font-medium text-warn-ink hover:bg-warn-tint"
          >
            {open ? 'Cancel' : 'Bind'}
          </button>
        )}
      </div>
      {open && line.bindName && (
        <BindPanel
          name={line.bindName}
          recipeUnit={line.bindUnit}
          dict={dict}
          onDone={() => setOpen(false)}
        />
      )}
    </li>
  )
}

// The lazy-bind picker: "did you mean?" candidates from the dictionary, a search box, and a
// create-new path. Binding is keyed on the ingredient name, so it merges every line of that
// name across the plan.
function BindPanel({
  name,
  recipeUnit,
  dict,
  onDone,
}: {
  name: string
  recipeUnit?: string
  dict: IngredientDef[]
  onDone: () => void
}) {
  const [query, setQuery] = useState(name)
  const [creating, setCreating] = useState(false)
  const [aisle, setAisle] = useState('Pantry')
  // Seed the buy unit from the line's own recipe unit (mass→g, volume→ml, count→each), so creating
  // an ingredient for "200 g …" defaults to g and "150 ml …" to ml, converting for free.
  const [unit, setUnit] = useState(() => defaultPurchaseUnit(recipeUnit))
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
    <div className="mt-2 rounded-lg border border-warn-tint bg-card p-2 text-sm">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search or name the ingredient…"
        className="w-full rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
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
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-sm text-ink transition hover:border-brand-300 hover:text-brand-ink"
                    title={`Bind to “${c.def.name}”`}
                  >
                    {c.def.name}{' '}
                    <span className="text-xs text-muted">· {c.def.aisle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-2 text-xs font-medium text-brand-ink hover:underline"
          >
            + Create “{query.trim() || name}” as a new ingredient…
          </button>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">
            Aisle
            <select
              value={aisle}
              onChange={(e) => setAisle(e.target.value)}
              className="mt-0.5 block rounded-md border border-line-strong bg-card px-2 py-1 text-sm"
            >
              {AISLE_ORDER.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            Bought in
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-0.5 block rounded-md border border-line-strong bg-card px-2 py-1 text-sm"
            >
              {PURCHASE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u === 'each' ? 'each (count)' : u}
                </option>
              ))}
            </select>
          </label>
          {needsDensity(unit) && (
            <label className="text-xs text-muted" title="Lets tbsp/tsp amounts convert to the buy unit">
              Density
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="mt-0.5 block rounded-md border border-line-strong bg-card px-2 py-1 text-sm"
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
            className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
          >
            Create &amp; bind
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-md px-2 py-1.5 text-sm text-muted hover:bg-sunken"
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
      <summary className="cursor-pointer text-xs font-semibold tracking-wide text-muted uppercase">
        Your bindings ({bindings.length})
      </summary>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter bindings…"
        className="mt-2 w-full rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
      />
      <ul className="mt-1.5 divide-y divide-divider rounded-xl border border-line bg-card">
        {filtered.slice(0, visible).map((b) => (
          <BindingRow key={b.name} binding={b} def={byId.get(b.ingredientId)} />
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-muted">No bindings match.</li>
        )}
      </ul>
      {visible < filtered.length && <div ref={sentinelRef} className="h-1" />}
    </details>
  )
}

function BindingRow({ binding, def }: { binding: Binding; def?: IngredientDef }) {
  const [editing, setEditing] = useState(false)
  const selectClass =
    'rounded-md border border-line-strong bg-card px-1.5 py-0.5 text-xs text-muted'
  return (
    <li className="px-3 py-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-muted">
          {binding.name}{' '}
          <span className="text-muted">
            → {def?.name ?? binding.ingredientId}
            {def && <span className="text-subtle"> ({buyUnitLabel(def.purchaseUnit)})</span>}
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {def && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              aria-expanded={editing}
              className="rounded px-1.5 text-xs text-muted hover:bg-sunken hover:text-muted"
            >
              {editing ? 'Done' : 'Edit'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void unbind(binding.name)}
            className="rounded px-1.5 text-xs text-muted hover:bg-sunken hover:text-danger-ink"
            title="Unbind — back to verbatim"
          >
            Unbind
          </button>
        </div>
      </div>

      {editing && def && (
        <div className="mt-2 flex flex-wrap items-end gap-2 pb-1">
          <label className="text-xs text-muted">
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
          <label className="text-xs text-muted">
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
            <label className="text-xs text-muted" title="Lets tbsp/tsp convert to the buy unit">
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
