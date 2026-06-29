import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Recipe } from '../schema/recipe'
import type { Stars } from '../schema/userData'
import { resolveAsset } from '../lib/assets'
import { deleteRecipe } from '../app/cleanup'

export function RecipeCard({ recipe, stars }: { recipe: Recipe; stars?: Stars }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function onDelete() {
    setMenuOpen(false)
    if (
      window.confirm(
        `Delete “${recipe.title}”?\n\nThis removes it and its ratings for good (re-import to restore).`,
      )
    ) {
      void deleteRecipe(recipe.id)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="relative">
          <img
            src={resolveAsset(recipe.image)}
            alt=""
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          {stars && (
            <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-amber-600 shadow-sm">
              {'★'.repeat(stars)}
            </span>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              {recipe.cuisine}
            </span>
          </div>
          <h3 className="mt-1.5 leading-tight font-semibold">{recipe.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-stone-500">{recipe.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
            <span>⏱ {recipe.prepTime} min</span>
            {recipe.mainProtein && <span className="capitalize">· {recipe.mainProtein}</span>}
            {recipe.allergens.includes('fish') && (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-700">
                fish
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Card actions — a sibling of the Link (not nested in the anchor), so clicks here
          never navigate. */}
      <div className="absolute right-2 bottom-2">
        <button
          type="button"
          aria-label="Recipe actions"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex size-7 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm transition hover:bg-white hover:text-stone-900"
        >
          ⋮
        </button>
        {menuOpen && (
          <>
            {/* Backdrop to close on outside click. */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 bottom-full z-20 mb-1 w-40 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={onDelete}
                className="block w-full px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Delete recipe
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
