import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { INGREDIENTS, INGREDIENTS_BY_ID, pluralOf } from '../data/ingredients'
import { getUnit } from '../lib/units'
import { ImportDataset } from '../components/ImportDataset'
import { BackupRestore } from '../components/BackupRestore'

export function ConfigPage() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])

  const { usage, issues } = useMemo(() => {
    const usage = new Map<string, number>()
    const issues: { recipe: string; rawLabel: string; problem: string }[] = []
    for (const r of recipes ?? []) {
      for (const ing of r.ingredients) {
        if (!ing.ingredientId) {
          issues.push({ recipe: r.title, rawLabel: ing.rawLabel, problem: 'not mapped to an ingredient' })
        } else if (!INGREDIENTS_BY_ID.has(ing.ingredientId)) {
          issues.push({
            recipe: r.title,
            rawLabel: ing.rawLabel,
            problem: `unknown ingredient id "${ing.ingredientId}"`,
          })
        } else {
          usage.set(ing.ingredientId, (usage.get(ing.ingredientId) ?? 0) + 1)
        }
      }
    }
    return { usage, issues }
  }, [recipes])

  if (recipes === undefined) return <p className="text-stone-500">Loading…</p>

  const sorted = [...INGREDIENTS].sort(
    (a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name),
  )

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Config</h1>

      <div className="mt-5 space-y-4">
        <ImportDataset />
        <BackupRestore />
      </div>

      <h2 className="mt-5 text-lg font-semibold">Ingredients</h2>
      <p className="mt-1 text-sm text-stone-500">
        The canonical dictionary the shopping list merges by. {INGREDIENTS.length}{' '}
        ingredients. <span className="text-stone-400">(Read-only for now — editing comes with the importer.)</span>
      </p>

      {issues.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <h3 className="text-sm font-semibold text-amber-700">
            {issues.length} issue{issues.length > 1 ? 's' : ''} to fix
          </h3>
          <ul className="mt-1.5 space-y-1 text-sm text-amber-800">
            {issues.map((i, n) => (
              <li key={n}>
                <span className="font-medium">{i.recipe}</span> — “{i.rawLabel}”:{' '}
                {i.problem}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white dark:bg-stone-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-xs tracking-wide text-stone-500 uppercase">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Plural</th>
              <th className="px-3 py-2 font-semibold">Aisle</th>
              <th className="px-3 py-2 font-semibold">Buy as</th>
              <th className="px-3 py-2 text-right font-semibold">Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sorted.map((def) => {
              const used = usage.get(def.id) ?? 0
              const unit = getUnit(def.purchaseUnit)
              return (
                <tr key={def.id} className={used === 0 ? 'text-stone-400' : 'text-stone-800'}>
                  <td className="px-3 py-1.5 font-medium">{def.name}</td>
                  <td className="px-3 py-1.5 text-stone-500">
                    {pluralOf(def)}
                    {!def.plural && (
                      <span className="ml-1 text-xs text-stone-400" title="auto-pluralised">
                        (auto)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-stone-500">{def.aisle}</td>
                  <td className="px-3 py-1.5 text-stone-500">
                    {unit.dimension === 'count' ? 'count' : unit.label}
                  </td>
                  <td className="px-3 py-1.5 text-right">{used || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
