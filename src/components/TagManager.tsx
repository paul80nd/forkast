import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { labelUsage, distinctLabels, type LabelKind } from '../lib/tags'
import { relabelRecipes } from '../app/tags'
import { fieldBoxClass } from './Select'
import type { Recipe } from '../schema/recipe'

// Config → Tags & allergens: tidy the free-label lists across the whole collection. Tags and
// allergens are listed separately with usage counts; each can be renamed, deleted, or (tick several)
// merged into one canonical spelling. All operations go through the `relabelRecipes` app-layer seam,
// which rewrites the recipes in place. A thin shell — the invariants live in src/app/tags.ts.
export function TagManager() {
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  if (recipes === undefined) return <p className="text-muted">Loading…</p>
  return (
    <div className="space-y-4">
      <LabelSection kind="tags" title="Tags" recipes={recipes} />
      <LabelSection kind="allergens" title="Allergens" recipes={recipes} />
    </div>
  )
}

function LabelSection({
  kind,
  title,
  recipes,
}: {
  kind: LabelKind
  title: string
  recipes: Recipe[]
}) {
  const usage = useMemo(() => labelUsage(recipes, kind), [recipes, kind])
  const allValues = useMemo(() => distinctLabels(recipes, kind), [recipes, kind])
  const noun = kind === 'tags' ? 'tag' : 'allergen'

  // Selection (lower-cased keys) for a multi-merge; rename buffer for a single inline rename.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')

  // Derive the selection from current usage, so labels that vanish after an edit fall out cleanly.
  const selectedUsage = usage.filter((u) => selected.has(u.value.toLowerCase()))
  const defaultTarget = [...selectedUsage].sort((a, b) => b.count - a.count)[0]?.value ?? ''

  const toggle = (key: string) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const startRename = (value: string) => {
    setRenaming(value)
    setRenameDraft(value)
  }
  const commitRename = () => {
    const from = renaming
    const to = renameDraft.trim()
    setRenaming(null)
    if (from && to && to !== from) void relabelRecipes(kind, [from], to)
  }

  const del = (value: string) => {
    if (window.confirm(`Delete the ${noun} “${value}” from all recipes?`)) {
      void relabelRecipes(kind, [value], '')
    }
  }

  const merge = () => {
    const target = mergeTarget.trim() || defaultTarget
    if (!target || selectedUsage.length < 2) return
    void relabelRecipes(
      kind,
      selectedUsage.map((u) => u.value),
      target,
    )
    setSelected(new Set())
    setMergeTarget('')
  }

  const listId = `merge-target-${kind}`

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">
        {usage.length} distinct {usage.length === 1 ? noun : `${noun}s`} across your recipes. Rename or
        delete one, or tick several to combine misspellings into a single spelling.
      </p>

      {usage.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No {noun}s yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-divider">
          {usage.map((u) => {
            const key = u.value.toLowerCase()
            const isRenaming = renaming === u.value
            return (
              <li key={key} className="flex items-center gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  aria-label={`Select ${u.value}`}
                  className="accent-brand-600"
                />
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitRename()
                      } else if (e.key === 'Escape') {
                        setRenaming(null)
                      }
                    }}
                    onBlur={commitRename}
                    aria-label={`Rename ${u.value}`}
                    className={`${fieldBoxClass} px-2 py-0.5 text-sm`}
                  />
                ) : (
                  <span className="text-sm text-ink">{u.value}</span>
                )}
                <span className="text-xs text-muted">
                  {u.count} recipe{u.count === 1 ? '' : 's'}
                </span>
                {!isRenaming && (
                  <div className="ml-auto flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startRename(u.value)}
                      className="text-xs font-medium text-muted hover:text-ink"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => del(u.value)}
                      className="text-xs font-medium text-muted hover:text-danger-ink"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {selectedUsage.length >= 2 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-2">
          <span className="text-sm">Combine {selectedUsage.length} into:</span>
          <input
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
            placeholder={defaultTarget}
            list={listId}
            aria-label={`Combine selected ${noun}s into`}
            className={`${fieldBoxClass} px-2 py-0.5 text-sm`}
          />
          <datalist id={listId}>
            {allValues.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <button
            type="button"
            onClick={merge}
            className="rounded-md bg-brand-700 px-3 py-1 text-sm font-medium text-white hover:bg-brand-800"
          >
            Merge
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected(new Set())
              setMergeTarget('')
            }}
            className="text-sm font-medium text-muted hover:text-ink"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
