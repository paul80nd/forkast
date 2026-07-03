import { Link } from 'react-router-dom'
import type { Recipe } from '../schema/recipe'
import type { Stars } from '../schema/userData'
import { resolveAsset } from '../lib/assets'

export function RecipeCard({
  recipe,
  stars,
  selected = false,
  onToggleSelect,
  variantCount,
}: {
  recipe: Recipe
  stars?: Stars
  selected?: boolean
  /** When provided, a selection tickbox is shown (for bulk actions in Browse). */
  onToggleSelect?: () => void
  /** Total versions of this dish; when > 1, a "swaps" badge marks the card as a lead. */
  variantCount?: number
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white dark:bg-stone-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        selected ? 'border-orange-400 ring-2 ring-orange-300' : 'border-stone-200'
      }`}
    >
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="relative">
          <img
            src={resolveAsset(recipe.image)}
            alt=""
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          {stars && (
            <span className="absolute top-2 left-2 rounded-full bg-white/90 dark:bg-stone-900/90 px-2 py-0.5 text-xs font-semibold text-amber-700 shadow-sm">
              {'★'.repeat(stars)}
            </span>
          )}
          {variantCount !== undefined && variantCount > 1 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 dark:bg-stone-900/90 px-2 py-0.5 text-xs font-semibold text-orange-700 shadow-sm">
              ⇄ {variantCount} versions
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
          <p className="mt-1 line-clamp-2 text-sm text-stone-600">{recipe.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600">
            <span>⏱ {recipe.prepTime} min</span>
            {recipe.mainProtein && <span className="capitalize">· {recipe.mainProtein}</span>}
          </div>
        </div>
      </Link>

      {/* Selection tickbox — a sibling of the Link (not nested in the anchor), so ticking
          never navigates. */}
      {onToggleSelect && (
        <label className="absolute top-2 right-2 flex cursor-pointer items-center rounded-md bg-white/90 dark:bg-stone-900/90 p-1 shadow-sm">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${recipe.title}`}
            className="fk-check"
          />
        </label>
      )}
    </div>
  )
}
