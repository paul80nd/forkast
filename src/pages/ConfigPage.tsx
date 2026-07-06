import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { INGREDIENTS, pluralOf } from '../data/ingredients'
import { getUnit } from '../lib/units'
import { ImportDataset } from '../components/ImportDataset'
import { BackupRestore } from '../components/BackupRestore'
import { StorageUsage } from '../components/StorageUsage'
import { RecipeImages } from '../components/RecipeImages'
import { TagManager } from '../components/TagManager'

export function ConfigPage() {
  const [tab, setTab] = useState<'general' | 'labels'>('general')

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Config</h1>

      <div className="mt-4 flex gap-1 border-b border-line">
        {(['general', 'labels'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition ${
              tab === t
                ? 'border-brand-500 text-brand-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t === 'general' ? 'General' : 'Tags & allergens'}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'general' ? <GeneralTab /> : <TagManager />}
      </div>
    </section>
  )
}

function GeneralTab() {
  // The live dictionary + bindings (both small); no need to load every recipe. Ingredients are
  // bound lazily at shopping time, so a line without an ingredientId is normal, not an error.
  const dict = useLiveQuery(() => db.dictionary.toArray(), [])
  const bindings = useLiveQuery(() => db.bindings.toArray(), [])

  // How many ingredient names are bound to each dictionary entry — the "used" signal now that
  // merging is driven by the bindings table rather than a recipe-line ingredientId.
  const bindCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const b of bindings ?? []) m.set(b.ingredientId, (m.get(b.ingredientId) ?? 0) + 1)
    return m
  }, [bindings])

  if (dict === undefined || bindings === undefined)
    return <p className="text-muted">Loading…</p>

  // Fall back to the static seed if the Dexie dictionary is empty (e.g. before the first reseed).
  const source = dict.length ? dict : INGREDIENTS
  const sorted = [...source].sort(
    (a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name),
  )

  return (
    <>
      <div className="space-y-4">
        <ImportDataset />
        <BackupRestore />
        <StorageUsage />
        <RecipeImages />
      </div>

      <h2 className="mt-5 text-lg font-semibold">Ingredients</h2>
      <p className="mt-1 text-sm text-muted">
        The canonical dictionary the shopping list merges by. {source.length}{' '}
        ingredients.{' '}
        <span className="text-muted">Grows as you bind ingredients while shopping.</span>
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Plural</th>
              <th className="px-3 py-2 font-semibold">Aisle</th>
              <th className="px-3 py-2 font-semibold">Buy as</th>
              <th className="px-3 py-2 text-right font-semibold">Bound</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {sorted.map((def) => {
              const bound = bindCount.get(def.id) ?? 0
              const unit = getUnit(def.purchaseUnit)
              return (
                <tr key={def.id} className={bound === 0 ? 'text-muted' : 'text-ink'}>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
