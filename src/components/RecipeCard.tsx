import { Link } from 'react-router-dom'
import type { Recipe } from '../schema/recipe'
import type { Stars } from '../schema/userData'
import { resolveAsset } from '../lib/assets'
import { deleteRecipe } from '../app/cleanup'

export function RecipeCard({ recipe, stars }: { recipe: Recipe; stars?: Stars }) {
  // The card is a Link, so stop the click from navigating before confirming the delete.
  function onDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (
      window.confirm(
        `Delete “${recipe.title}”?\n\nThis removes it and its ratings for good (re-import to restore).`,
      )
    ) {
      void deleteRecipe(recipe.id)
    }
  }

  return (
    <Link
      to={`/recipe/${recipe.id}`}
      className="block overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative">
        <img
          src={resolveAsset(recipe.image)}
          alt=""
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
        />
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete recipe"
          title="Delete recipe"
          className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-white hover:text-rose-700"
        >
          ✕
        </button>
        {stars && (
          <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-amber-600 shadow-sm">
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
        <p className="mt-1 line-clamp-2 text-sm text-stone-500">
          {recipe.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
          <span>⏱ {recipe.prepTime} min</span>
          {recipe.mainProtein && (
            <span className="capitalize">· {recipe.mainProtein}</span>
          )}
          {recipe.allergens.includes('fish') && (
            <span className="rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-700">
              fish
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
