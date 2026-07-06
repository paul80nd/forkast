import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { RecipeImage } from './RecipeImage'
import { RecipeModal } from './RecipeModal'
import { useToast } from '../hooks/useToast'
import { addToPlan } from '../app/plan'
import {
  addUseUpItem,
  removeUseUpItem,
  getUseUpStatus,
  suggestUseUpRecipes,
  type UseUpSuggestion,
} from '../app/useUp'
import { matchIngredient } from '../lib/ingredientMatch'
import type { Recipe } from '../schema/recipe'

// Plan-page panel: a lightweight "ingredients I want to cook down" list. Each entry shows whether
// the current week already uses it (so the rest are "unused"), and "Suggest recipes" ranks the
// collection by how many of those unused ingredients each recipe uses — add straight to the week.
// App seam + matching: src/app/useUp.ts / src/lib/useUp.ts. Design: docs/use-up-spec.md.
export function UseUpPanel() {
  const status = useLiveQuery(() => getUseUpStatus(), [])
  const dictionary = useLiveQuery(() => db.dictionary.toArray(), [])
  const recipes = useLiveQuery(() => db.recipes.toArray(), [])
  const showToast = useToast()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UseUpSuggestion[] | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [modalRecipe, setModalRecipe] = useState<Recipe | null>(null)

  const byId = useMemo(() => new Map((recipes ?? []).map((r) => [r.id, r])), [recipes])
  const items = status ?? []
  const unusedCount = items.filter((s) => !s.usedByPlan).length

  // Dictionary candidates for the typed name, minus what's already on the list.
  const candidates = useMemo(() => {
    const q = query.trim()
    if (!q || !dictionary) return []
    const have = new Set(items.map((s) => s.item.name.toLowerCase()))
    return matchIngredient(q, dictionary, 6).filter((m) => !have.has(m.def.name.toLowerCase()))
  }, [query, dictionary, items])

  async function add(name: string, ingredientId?: string) {
    await addUseUpItem({ name, ingredientId })
    setQuery('')
    setResults(null) // the list changed — old suggestions are stale
  }
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) await add(q)
  }
  async function suggest() {
    setSuggesting(true)
    try {
      setResults(await suggestUseUpRecipes())
    } finally {
      setSuggesting(false)
    }
  }
  async function addRecipe(s: UseUpSuggestion) {
    const r = byId.get(s.recipeId)
    await addToPlan(s.recipeId)
    setResults((rs) => rs?.filter((x) => x.recipeId !== s.recipeId) ?? null)
    showToast({
      message: (
        <>
          Added <span className="font-medium">{r?.title ?? 'recipe'}</span> to the week
        </>
      ),
    })
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-md border border-line-strong bg-card px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-sunken"
      >
        {open ? '▾' : '▸'} Use up ingredients
        {unusedCount > 0 && (
          <span className="ml-1.5 rounded-full bg-brand-wash px-1.5 text-xs text-brand-ink">
            {unusedCount} unused
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-muted">
            List ingredients you want to cook down. We’ll flag the ones your week doesn’t already use
            and suggest recipes that do.
          </p>

          {/* Add an ingredient (autocompleted from the dictionary; free text also allowed). */}
          <form onSubmit={onSubmit} className="relative mt-3 max-w-sm">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add an ingredient you have…"
              className="w-full rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
            {candidates.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-card shadow-lg">
                {candidates.map((m) => (
                  <li key={m.def.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void add(m.def.name, m.def.id)}
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm hover:bg-sunken"
                    >
                      <span>{m.def.name}</span>
                      <span className="text-xs text-muted">{m.def.aisle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>

          {/* The list, each item badged with its plan status. */}
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nothing on your list yet.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {items.map((s) => (
                <li
                  key={s.item.name}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-sunken py-1 pr-1 pl-2.5 text-sm"
                >
                  <span>{s.item.name}</span>
                  <span
                    className={`rounded-full px-1.5 text-xs ${
                      s.usedByPlan ? 'bg-info-100 text-info-700' : 'bg-brand-wash text-brand-ink'
                    }`}
                  >
                    {s.usedByPlan ? 'on plan' : 'unused'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeUseUpItem(s.item.name)}
                    className="rounded-full px-1 text-muted hover:bg-card hover:text-ink"
                    title={`Remove ${s.item.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {items.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={suggesting || unusedCount === 0}
                onClick={suggest}
                className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-50"
                title={unusedCount === 0 ? 'Your week already uses everything on your list' : undefined}
              >
                {suggesting ? 'Finding…' : 'Suggest recipes'}
              </button>
              {unusedCount === 0 && (
                <span className="text-xs text-muted">Your week already uses everything on your list.</span>
              )}
            </div>
          )}

          {/* Ranked suggestions. */}
          {results !== null && (
            <div className="mt-3">
              {results.length === 0 ? (
                <p className="text-sm text-muted">
                  No recipes found that use those ingredients.
                </p>
              ) : (
                <ul className="space-y-2">
                  {results.map((s) => {
                    const r = byId.get(s.recipeId)
                    if (!r) return null
                    return (
                      <li
                        key={s.recipeId}
                        className="flex items-center gap-3 rounded-xl border border-line bg-card p-2.5"
                      >
                        <RecipeImage
                          image={r.image}
                          className="size-12 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setModalRecipe(r)}
                            title="View recipe"
                            className="block max-w-full truncate text-left font-medium text-ink hover:text-brand-ink hover:underline"
                          >
                            {r.title}
                          </button>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                            {s.stars > 0 && <span className="text-star">{'★'.repeat(s.stars)}</span>}
                            <span>uses {s.matched.join(', ')}</span>
                            {s.matched.length > 1 && (
                              <span className="rounded-full bg-brand-wash px-1.5 text-brand-ink">
                                {s.matched.length}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void addRecipe(s)}
                          className="rounded-md border border-line-strong bg-card px-2.5 py-1 text-sm font-medium text-ink hover:bg-sunken"
                        >
                          Add to plan
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {modalRecipe && <RecipeModal recipe={modalRecipe} onClose={() => setModalRecipe(null)} />}
    </div>
  )
}
