import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { AISLE_ORDER, INGREDIENTS, pluralOf, type IngredientDef } from '../data/ingredients'
import { getUnit } from '../lib/units'
import { updateIngredient, deleteIngredient } from '../app/shopping'
import { fieldBoxClass } from './Select'

// Config → Ingredients: the canonical dictionary the shopping list merges by. Each entry's
// display fields — name, plural, aisle — are editable inline; buy unit / density stay edited
// at shopping time (Shop → Your bindings), where their conversion effect is visible. Renaming
// only touches the dictionary entry, never the name→id bindings, so bound lines keep merging.
// A thin shell over the `updateIngredient` app-layer seam.
export function IngredientManager() {
  const dict = useLiveQuery(() => db.dictionary.toArray(), [])
  const bindings = useLiveQuery(() => db.bindings.toArray(), [])

  // How many ingredient names are bound to each dictionary entry — the "used" signal, since
  // merging is driven by the bindings table rather than a recipe-line ingredientId.
  const bindCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of bindings ?? []) m.set(b.ingredientId, (m.get(b.ingredientId) ?? 0) + 1)
    return m
  }, [bindings])

  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  if (dict === undefined || bindings === undefined)
    return <p className="text-muted">Loading…</p>

  // Fall back to the static seed if the Dexie dictionary is empty (e.g. before the first reseed);
  // those rows aren't real Dexie entries, so they can't be deleted.
  const fromDict = dict.length > 0
  const source = fromDict ? dict : INGREDIENTS
  const aisles = [...new Set([...AISLE_ORDER, ...source.map((d) => d.aisle)])]

  const q = filter.trim().toLowerCase()
  const sorted = [...source]
    .filter((d) => !q || d.name.toLowerCase().includes(q) || d.aisle.toLowerCase().includes(q))
    .sort((a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name))

  return (
    <>
      <h2 className="text-lg font-semibold">Ingredients</h2>
      <p className="mt-1 text-sm text-muted">
        The canonical dictionary the shopping list merges by. {source.length} ingredients.{' '}
        <span className="text-muted">Grows as you bind ingredients while shopping.</span> Buy unit
        and density are edited in Shop → Your bindings; unused (unbound) entries can be deleted.
      </p>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name or aisle…"
        aria-label="Filter ingredients"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`${fieldBoxClass} mt-3 w-full px-3 py-1.5 text-sm sm:max-w-xs`}
      />

      <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Plural</th>
              <th className="px-3 py-2 font-semibold">Aisle</th>
              <th className="px-3 py-2 font-semibold">Buy as</th>
              <th className="px-3 py-2 text-right font-semibold">Bound</th>
              <th className="px-3 py-2 text-right font-semibold sr-only">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {sorted.map((def) =>
              editing === def.id ? (
                <EditRow
                  key={def.id}
                  def={def}
                  aisles={aisles}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <ViewRow
                  key={def.id}
                  def={def}
                  bound={bindCount.get(def.id) ?? 0}
                  canDelete={fromDict}
                  onEdit={() => setEditing(def.id)}
                />
              ),
            )}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted">
                  No ingredients match “{filter.trim()}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ViewRow({
  def,
  bound,
  canDelete,
  onEdit,
}: {
  def: IngredientDef
  bound: number
  canDelete: boolean
  onEdit: () => void
}) {
  const unit = getUnit(def.purchaseUnit)
  // Only unbound entries can be removed — a bound one is a live merge target (delete it and its
  // lines silently un-merge), so it must be unbound in Shop → Your bindings first.
  const del = () => {
    if (window.confirm(`Delete the ingredient “${def.name}” from the dictionary?`)) {
      void deleteIngredient(def.id)
    }
  }
  return (
    <tr className={bound === 0 ? 'text-muted' : 'text-ink'}>
      <td className="px-3 py-1.5 font-medium">{def.name}</td>
      <td className="px-3 py-1.5 text-muted">
        {pluralOf(def)}
        {!def.plural && (
          <span className="ml-1 text-xs text-muted" title="auto-pluralised">
            (auto)
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 text-muted">{def.aisle}</td>
      <td className="px-3 py-1.5 text-muted">
        {unit.dimension === 'count' ? 'count' : unit.label}
      </td>
      <td className="px-3 py-1.5 text-right">{bound || '—'}</td>
      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-muted hover:text-ink"
        >
          Edit
        </button>
        {canDelete && bound === 0 && (
          <button
            type="button"
            onClick={del}
            title="Delete this unused ingredient"
            className="ml-2 text-xs font-medium text-muted hover:text-danger-ink"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  )
}

// Inline editor for one entry's display fields. Plural is optional: leave it blank to fall back
// to automatic pluralisation. Aisle is a free text with a datalist of the aisles already in use.
function EditRow({
  def,
  aisles,
  onDone,
}: {
  def: IngredientDef
  aisles: string[]
  onDone: () => void
}) {
  const [name, setName] = useState(def.name)
  const [plural, setPlural] = useState(def.plural ?? '')
  const [aisle, setAisle] = useState(def.aisle)
  const listId = `aisles-${def.id}`

  const save = async () => {
    await updateIngredient(def.id, {
      name: name.trim() || def.name,
      plural: plural.trim() || undefined,
      aisle: aisle.trim() || def.aisle,
    })
    onDone()
  }

  const cell = `${fieldBoxClass} w-full px-2 py-0.5 text-sm`
  return (
    <tr className="text-ink">
      <td className="px-3 py-1.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
          aria-label="Name"
          autoCorrect="off"
          spellCheck={false}
          className={cell}
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          value={plural}
          onChange={(e) => setPlural(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
          placeholder={pluralOf(def)}
          aria-label="Plural (blank = automatic)"
          autoCorrect="off"
          spellCheck={false}
          className={cell}
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          value={aisle}
          onChange={(e) => setAisle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void save()}
          list={listId}
          aria-label="Aisle"
          autoCorrect="off"
          spellCheck={false}
          className={cell}
        />
        <datalist id={listId}>
          {aisles.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </td>
      <td className="px-3 py-1.5 text-muted" />
      <td className="px-3 py-1.5" />
      <td className="px-3 py-1.5 text-right whitespace-nowrap">
        <button
          type="button"
          onClick={() => void save()}
          className="text-xs font-medium text-brand-ink hover:underline"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="ml-2 text-xs font-medium text-muted hover:text-ink"
        >
          Cancel
        </button>
      </td>
    </tr>
  )
}
