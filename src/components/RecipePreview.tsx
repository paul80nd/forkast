import type { Recipe } from '../schema/recipe'

// Read-only recipe detail — meta, description, nutrition, ingredients, and method. Used for the
// inline preview in a suggestion card (so reviewing a proposed meal doesn't navigate away). The
// full RecipePage adds the editable rating panel + add-to-week actions on top of this content.
export function RecipePreview({ recipe }: { recipe: Recipe }) {
  return (
    <div className="border-t border-stone-200 px-3 py-3 text-sm">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
        <span>
          <span className="font-medium text-stone-600">Cuisine:</span> {recipe.cuisine}
        </span>
        <span>
          <span className="font-medium text-stone-600">Time:</span> {recipe.prepTime} min
        </span>
        <span>
          <span className="font-medium text-stone-600">Serves:</span> {recipe.serves}
        </span>
        {recipe.mainProtein && (
          <span className="capitalize">
            <span className="font-medium normal-case text-stone-600">Main:</span> {recipe.mainProtein}
          </span>
        )}
      </div>

      {recipe.description && <p className="mt-2 text-stone-600">{recipe.description}</p>}

      {recipe.nutrition && (
        <p className="mt-2 text-xs text-stone-500">
          <span className="font-medium text-stone-600">Per serving:</span>{' '}
          {Math.round(recipe.nutrition.kcal)} kcal · {recipe.nutrition.protein}g protein ·{' '}
          {recipe.nutrition.fat}g fat · {recipe.nutrition.carbs}g carbs
        </p>
      )}

      {recipe.allergens.length > 0 && (
        <p className="mt-2 text-xs text-stone-500">
          <span className="font-medium text-stone-600">Allergens:</span> {recipe.allergens.join(', ')}
        </p>
      )}

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Ingredients</h4>
          <ul className="mt-1.5 space-y-1 text-stone-700">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>{ing.rawLabel}</li>
            ))}
          </ul>
          {recipe.basics.length > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              <span className="font-medium text-stone-600">Store cupboard:</span>{' '}
              {recipe.basics.join(', ')}
            </p>
          )}
        </div>
        <div>
          <h4 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Method</h4>
          <ol className="mt-1.5 space-y-2">
            {[...recipe.instructions]
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <li key={step.order} className="flex gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                    {step.order}
                  </span>
                  <span className="text-stone-700">{step.text}</span>
                </li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
