import { Link } from 'react-router-dom'
import type { Recipe } from '../schema/recipe'
import type { Stars } from '../schema/userData'
import { RecipeImage } from './RecipeImage'

export function RecipeCard({
  recipe,
  stars,
  selected = false,
  selectMode = false,
  onToggleSelect,
  variantCount,
}: {
  recipe: Recipe
  stars?: Stars
  selected?: boolean
  /** In select mode the card shows a tickbox and clicking it toggles selection
      instead of opening the recipe (Browse bulk actions). */
  selectMode?: boolean
  onToggleSelect?: () => void
  /** Total versions of this dish; when > 1, a "swaps" badge marks the card as a lead. */
  variantCount?: number
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        selected ? 'border-brand-400 ring-2 ring-brand-300' : 'border-line'
      }`}
    >
      <Link
        to={`/recipe/${recipe.id}`}
        className="flex flex-1 flex-col"
        onClick={
          selectMode && onToggleSelect
            ? (e) => {
                e.preventDefault()
                onToggleSelect()
              }
            : undefined
        }
      >
        <div className="relative">
          <RecipeImage
            image={recipe.image}
            className="aspect-[4/3] w-full object-cover"
            loading="lazy"
          />
          {stars && (
            <span className="absolute top-2 left-2 rounded-full bg-card/90 px-2 py-0.5 text-xs font-semibold text-star-ink shadow-sm">
              {'★'.repeat(stars)}
            </span>
          )}
          {variantCount !== undefined && variantCount > 1 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-card/90 px-2 py-0.5 text-xs font-semibold text-brand-ink shadow-sm">
              ⇄ {variantCount} versions
            </span>
          )}
        </div>
        {/* Body grows; the footer pins to the bottom (mt-auto) so meta lines up
            across a grid of unequal-height cards. */}
        <div className="flex flex-1 flex-col p-3">
          <h3 className="leading-tight font-semibold">{recipe.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{recipe.description}</p>
          <div className="mt-auto flex items-baseline justify-between gap-2 pt-2.5">
            <span className="text-xs whitespace-nowrap text-muted">
              ⏱ {recipe.prepTime} min
              {recipe.mainProtein && <span className="capitalize"> · {recipe.mainProtein}</span>}
            </span>
            <span className="text-sm font-normal whitespace-nowrap">{recipe.cuisine}</span>
          </div>
        </div>
      </Link>

      {/* Selection tickbox — shown only in select mode, and a sibling of the Link (not
          nested in the anchor) so ticking never navigates. */}
      {selectMode && onToggleSelect && (
        <label className="absolute top-2 right-2 flex cursor-pointer items-center rounded-md bg-card/90 p-1 shadow-sm">
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
