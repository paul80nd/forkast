import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { RecipeImage } from './RecipeImage'
import { resolveDishes, variantLabel, type Dish } from '../lib/variants'
import type { Recipe } from '../schema/recipe'
import type { VariantOverride } from '../schema/userData'
import {
  suggestVariantMerges,
  setVariantOverride,
  setOverrideLead,
  addRecipeToDish,
  mergeDishes,
  removeFromOverride,
  dissolveOverride,
} from '../app/variants'
import { deleteRecipe } from '../app/cleanup'
import { Select, fieldBoxClass } from './Select'
import type { CandidateCluster } from '../lib/similarity'
import { CompareView } from './CompareView'

// Recipe/dish titles aren't prose — keep the browser (Safari especially) from autocorrecting,
// auto-capitalising or squiggle-spellchecking what you type into these search boxes.
const noAutocorrect = {
  autoCorrect: 'off',
  autoCapitalize: 'none',
  spellCheck: false,
  autoComplete: 'off',
} as const

const card = 'mt-5 rounded-xl border border-line bg-card p-4'
const chip = 'rounded-full border px-2.5 py-1 text-sm transition'
const primaryBtn =
  'rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50'

/** The override (if any) that governs a dish — the one pinning its lead. */
const overrideFor = (dish: Dish, overrides: VariantOverride[]) =>
  overrides.find((o) => o.recipeIds.includes(dish.lead.id))

export function VariantsTab({
  recipes,
  byId,
}: {
  recipes: Recipe[]
  byId: Map<string, Recipe>
}) {
  const overrides = useLiveQuery(() => db.variantOverrides.toArray(), []) ?? []
  const dishes = useMemo(
    () => resolveDishes(recipes, overrides).filter((d) => d.variants.length > 1),
    [recipes, overrides],
  )
  return (
    <>
      <VariantSuggestions byId={byId} />
      <VariantCreate recipes={recipes} byId={byId} />
      <VariantDishList dishes={dishes} overrides={overrides} recipes={recipes} />
    </>
  )
}

// ── Suggest ───────────────────────────────────────────────────────────────────

function VariantSuggestions({ byId }: { byId: Map<string, Recipe> }) {
  const [suggestions, setSuggestions] = useState<CandidateCluster[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      setSuggestions(await suggestVariantMerges())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Suggested variants</h2>
        <button type="button" disabled={busy} onClick={run} className={primaryBtn}>
          {busy ? 'Finding…' : suggestions ? 'Refresh' : 'Find similar recipes'}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Recipes that read like the same dish but weren’t grouped automatically (the photos
        differ). Untick any that don’t belong, choose the original, then confirm.
      </p>
      {suggestions && suggestions.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          No suggestions — nothing looks like an ungrouped variant.
        </p>
      )}
      {suggestions && suggestions.length > 0 && (
        <>
          <p className="mt-3 text-xs text-muted">
            Showing {Math.min(suggestions.length, 25)} of {suggestions.length}.
          </p>
          <ul className="mt-2 space-y-3">
            {suggestions.slice(0, 25).map((c) => (
              <VariantCandidateCard
                key={c.recipeIds.join(',')}
                cluster={c}
                byId={byId}
                onDone={() => setSuggestions((cs) => (cs ?? []).filter((x) => x !== c))}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function VariantCandidateCard({
  cluster,
  byId,
  onDone,
}: {
  cluster: CandidateCluster
  byId: Map<string, Recipe>
  onDone: () => void
}) {
  const members = cluster.recipeIds
    .map((id) => byId.get(id))
    .filter((r): r is Recipe => r != null)
  const [included, setIncluded] = useState<Set<string>>(() => new Set(members.map((m) => m.id)))
  const [leadId, setLeadId] = useState(members[0]?.id ?? '')
  const [comparing, setComparing] = useState(false)

  const includedList = members.filter((m) => included.has(m.id))
  const lead = included.has(leadId) ? leadId : includedList[0]?.id ?? ''

  function toggle(id: string) {
    setIncluded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function confirm() {
    await setVariantOverride([...included], lead)
    onDone()
  }

  return (
    <li className="rounded-lg border border-line p-3">
      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={included.has(m.id)}
              onChange={() => toggle(m.id)}
              className="fk-check"
              aria-label={`Include ${m.title}`}
            />
            <label className="flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name={`lead-${cluster.recipeIds.join(',')}`}
                checked={lead === m.id}
                disabled={!included.has(m.id)}
                onChange={() => setLeadId(m.id)}
                className="fk-radio"
                aria-label={`Make ${m.title} the original`}
              />
              <span className="text-xs text-muted">lead</span>
            </label>
            <span className={`truncate ${included.has(m.id) ? 'text-ink' : 'text-muted line-through'}`}>
              {m.title}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" disabled={included.size < 2} onClick={confirm} className={primaryBtn}>
          Confirm variant group
        </button>
        <button
          type="button"
          onClick={() => setComparing((c) => !c)}
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-sunken"
        >
          {comparing ? 'Hide compare' : 'Compare'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-sunken"
        >
          Dismiss
        </button>
        <span className="ml-auto text-xs text-muted">
          {Math.round(cluster.score * 100)}% similar
        </span>
      </div>
      {comparing && includedList.length > 1 && <CompareView recipes={includedList} />}
    </li>
  )
}

// ── Manual create ───────────────────────────────────────────────────────────────

function VariantCreate({
  recipes,
  byId,
}: {
  recipes: Recipe[]
  byId: Map<string, Recipe>
}) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string[]>([])
  const [leadId, setLeadId] = useState('')
  const [busy, setBusy] = useState(false)

  const q = query.trim().toLowerCase()
  const results = q
    ? recipes.filter((r) => r.title.toLowerCase().includes(q) && !draft.includes(r.id)).slice(0, 8)
    : []
  const lead = draft.includes(leadId) ? leadId : draft[0] ?? ''

  function add(r: Recipe) {
    setDraft((d) => [...d, r.id])
    setQuery('')
  }
  async function create() {
    setBusy(true)
    try {
      await setVariantOverride(draft, lead)
      setDraft([])
      setLeadId('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold">Create a variant group</h2>
      <p className="mt-1 text-sm text-muted">
        Pick the recipes that are the same dish, choose the original, and group them by hand.
      </p>
      <div className="relative mt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes to add by title…"
          {...noAutocorrect}
          className="w-full rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-card shadow-md">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => add(r)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-brand-wash"
                >
                  <span className="truncate">{r.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {draft.length > 0 && (
        <div className="mt-3 space-y-2">
          {draft.map((id) => (
            <div key={id} className="flex items-center gap-2 text-sm">
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="create-lead"
                  checked={lead === id}
                  onChange={() => setLeadId(id)}
                  className="fk-radio"
                />
                <span className="text-xs text-muted">lead</span>
              </label>
              <span className="flex-1 truncate text-ink">{byId.get(id)?.title ?? id}</span>
              <button
                type="button"
                onClick={() => setDraft((d) => d.filter((x) => x !== id))}
                className="rounded px-2 py-1 text-muted hover:bg-sunken hover:text-muted"
                aria-label="Remove from draft"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button type="button" disabled={busy || draft.length < 2} onClick={create} className={primaryBtn}>
          Create variant group
        </button>
        <span className="text-xs text-muted">
          {draft.length < 2 ? 'Add at least two recipes.' : `${draft.length} selected`}
        </span>
      </div>
    </div>
  )
}

// ── Existing dishes ─────────────────────────────────────────────────────────────

type SortKey = 'size' | 'title'

function VariantDishList({
  dishes,
  overrides,
  recipes,
}: {
  dishes: Dish[]
  overrides: VariantOverride[]
  recipes: Recipe[]
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('size')
  const [visible, setVisible] = useState(50)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? dishes.filter((d) => d.variants.some((v) => v.title.toLowerCase().includes(q)))
      : dishes
    return [...list].sort((a, b) =>
      sort === 'title'
        ? a.lead.title.localeCompare(b.lead.title)
        : b.variants.length - a.variants.length || a.lead.title.localeCompare(b.lead.title),
    )
  }, [dishes, query, sort])

  const shown = filtered.slice(0, visible)

  return (
    <div className={card}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">Existing variant groups</h2>
        <span className="text-sm text-muted">{filtered.length} dishes</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setVisible(50)
          }}
          placeholder="Search dishes…"
          {...noAutocorrect}
          className={`${fieldBoxClass} min-w-56 flex-1 px-2.5 py-1.5 text-sm`}
        />
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort dishes"
        >
          <option value="size">Most versions</option>
          <option value="title">A–Z</option>
        </Select>
      </div>

      <ul className="mt-3 space-y-2">
        {shown.map((d) => (
          <VariantDishRow
            key={d.lead.id}
            dish={d}
            override={overrideFor(d, overrides)}
            recipes={recipes}
            allDishes={dishes}
          />
        ))}
      </ul>
      {visible < filtered.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 50)}
          className="mt-3 w-full rounded-md border border-line py-2 text-sm font-medium text-muted hover:bg-surface"
        >
          Show more ({filtered.length - visible} left)
        </button>
      )}
    </div>
  )
}

function VariantDishRow({
  dish,
  override,
  recipes,
  allDishes,
}: {
  dish: Dish
  override?: VariantOverride
  recipes: Recipe[]
  allDishes: Dish[]
}) {
  const [open, setOpen] = useState(false)
  const [comparing, setComparing] = useState(false)
  // Inline "add a recipe" / "merge into another group" search tools (one open at a time).
  const [tool, setTool] = useState<null | 'add' | 'merge'>(null)
  const [q, setQ] = useState('')
  const { lead, variants } = dish
  const memberIds = variants.map((v) => v.id)
  const memberSet = new Set(memberIds)

  const qLower = q.trim().toLowerCase()
  const addResults = qLower
    ? recipes.filter((r) => !memberSet.has(r.id) && r.title.toLowerCase().includes(qLower)).slice(0, 8)
    : []
  const mergeResults = qLower
    ? allDishes.filter((d) => d.lead.id !== lead.id && d.lead.title.toLowerCase().includes(qLower)).slice(0, 8)
    : []

  function openTool(t: 'add' | 'merge') {
    setTool((cur) => (cur === t ? null : t))
    setQ('')
  }
  async function addRecipe(id: string) {
    await addRecipeToDish(id, lead.id)
    setTool(null)
    setQ('')
  }
  async function mergeInto(target: Dish) {
    if (
      !window.confirm(
        `Merge “${lead.title}” (${variants.length} version${variants.length === 1 ? '' : 's'}) into ` +
          `“${target.lead.title}”?\n\nThey become one dish, led by “${target.lead.title}”.`,
      )
    )
      return
    await mergeDishes(lead.id, target.lead.id)
    setTool(null)
    setQ('')
  }

  async function makeLead(id: string) {
    if (override) await setOverrideLead(override.id, id)
    else await setVariantOverride(memberIds, id)
  }
  async function remove(id: string) {
    // Detaching one recipe leaves the rest grouped (an override; or the import key, minus
    // the pinned-away member). removeFromOverride also pins the removed recipe alone.
    if (override) await removeFromOverride(override.id, id)
    else await setVariantOverride([id], id)
  }
  async function del(m: Recipe) {
    // Delete the recipe outright (not just detach it) — for variants you never want, like
    // the "with dessert" combos. deleteRecipe cascades the override cleanup.
    if (!window.confirm(`Delete “${m.title}” for good? This can't be undone.`)) return
    await deleteRecipe(m.id)
  }

  return (
    <li className="rounded-lg border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-muted">{open ? '▾' : '▸'}</span>
        <span className="flex-1 truncate font-medium text-ink">{lead.title}</span>
        {override && (
          <span className="shrink-0 rounded-full bg-brand-tint px-1.5 py-0.5 text-xs font-medium text-brand-ink">
            edited
          </span>
        )}
        <span className="shrink-0 text-sm text-muted">{variants.length} versions</span>
      </button>

      {open && (
        <div className="border-t border-line p-3">
          <ul className="space-y-1.5">
            {variants.map((m) => {
              const isLead = m.id === lead.id
              return (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <RecipeImage image={m.image} className="size-9 shrink-0 rounded object-cover" />
                  <span className="flex-1 truncate text-ink">{m.title}</span>
                  <span
                    className={`${chip} ${isLead ? 'border-brand-500 bg-brand-700 text-white' : 'border-line text-muted'}`}
                  >
                    {isLead ? 'Original' : variantLabel(m.title, lead.title)}
                  </span>
                  {!isLead && (
                    <button
                      type="button"
                      onClick={() => void makeLead(m.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-brand-ink hover:bg-brand-wash"
                    >
                      Make lead
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(m.id)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-sunken hover:text-muted"
                    title="Remove from this dish (keeps the recipe)"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => void del(m)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted hover:bg-danger-50 hover:text-danger-ink"
                    title="Delete this recipe for good"
                  >
                    Delete
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openTool('add')}
              className="rounded-md px-2.5 py-1 text-sm font-medium text-muted hover:bg-sunken"
            >
              {tool === 'add' ? 'Close' : 'Add recipe'}
            </button>
            {allDishes.length > 1 && (
              <button
                type="button"
                onClick={() => openTool('merge')}
                className="rounded-md px-2.5 py-1 text-sm font-medium text-muted hover:bg-sunken"
                title="Merge this group into another dish"
              >
                {tool === 'merge' ? 'Close' : 'Merge into…'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setComparing((c) => !c)}
              className="rounded-md px-2.5 py-1 text-sm font-medium text-muted hover:bg-sunken"
            >
              {comparing ? 'Hide compare' : 'Compare'}
            </button>
            {override && (
              <button
                type="button"
                onClick={() => void dissolveOverride(override.id)}
                className="rounded-md px-2.5 py-1 text-sm font-medium text-muted hover:bg-danger-50 hover:text-danger-ink"
                title="Discard your edits and revert to the automatic grouping"
              >
                Revert to auto
              </button>
            )}
          </div>

          {tool && (
            <div className="relative mt-2">
              <input
                type="search"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  tool === 'add' ? 'Search a recipe to add…' : 'Search a group to merge into…'
                }
                {...noAutocorrect}
                className={`${fieldBoxClass} w-full px-2.5 py-1.5 text-sm`}
              />
              {tool === 'add' && addResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-card shadow-md">
                  {addResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => void addRecipe(r.id)}
                        className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-brand-wash"
                      >
                        {r.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {tool === 'merge' && mergeResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-card shadow-md">
                  {mergeResults.map((d) => (
                    <li key={d.lead.id}>
                      <button
                        type="button"
                        onClick={() => void mergeInto(d)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-brand-wash"
                      >
                        <span className="truncate">{d.lead.title}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {d.variants.length} versions
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {comparing && <CompareView recipes={variants} />}
        </div>
      )}
    </li>
  )
}
