import { Link } from 'react-router-dom'
import { resolveAsset } from '../lib/assets'
import type { Recipe } from '../schema/recipe'

// A side-by-side comparison of a set of recipes: metadata rows plus ingredients, with the
// ingredients each recipe doesn't share with every other highlighted — so a protein/carb
// swap jumps out. Used by the Refine duplicates and variant tools.
export function CompareView({ recipes }: { recipes: Recipe[] }) {
  const counts = new Map<string, number>()
  for (const r of recipes) {
    const seen = new Set<string>()
    for (const ing of r.ingredients) {
      const key = ing.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const isShared = (name: string) => counts.get(name.trim().toLowerCase()) === recipes.length

  const metaRows: { label: string; value: (r: Recipe) => string }[] = [
    { label: 'Cuisine', value: (r) => r.cuisine || '—' },
    { label: 'Time', value: (r) => `${r.prepTime} min` },
    { label: 'Serves', value: (r) => String(r.serves) },
    { label: 'Main', value: (r) => r.mainProtein ?? '—' },
    { label: 'Energy', value: (r) => (r.nutrition ? `${Math.round(r.nutrition.kcal)} kcal` : '—') },
    { label: 'Allergens', value: (r) => (r.allergens.length ? r.allergens.join(', ') : '—') },
  ]

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-stone-200">
            <td className="p-2" />
            {recipes.map((r) => (
              <th key={r.id} className="p-2 text-left align-bottom font-semibold text-stone-700">
                <Link to={`/recipe/${r.id}`} className="block hover:text-orange-700 hover:underline">
                  {r.image ? (
                    <img
                      src={resolveAsset(r.image)}
                      alt=""
                      className="mb-1.5 aspect-[4/3] w-full max-w-40 rounded-md object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="mb-1.5 flex aspect-[4/3] w-full max-w-40 items-center justify-center rounded-md bg-stone-100 text-xs text-stone-400">
                      no image
                    </div>
                  )}
                  {r.title}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {metaRows.map((row) => (
            <tr key={row.label}>
              <th className="p-2 text-left align-top text-xs font-medium tracking-wide text-stone-400 uppercase">
                {row.label}
              </th>
              {recipes.map((r) => (
                <td key={r.id} className="p-2 align-top text-stone-700">
                  {row.value(r)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th className="p-2 text-left align-top text-xs font-medium tracking-wide text-stone-400 uppercase">
              Ingredients
            </th>
            {recipes.map((r) => (
              <td key={r.id} className="p-2 align-top">
                <ul className="space-y-0.5">
                  {r.ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className={isShared(ing.name) ? 'text-stone-500' : 'font-medium text-orange-700'}
                    >
                      {ing.name}
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="px-2 pb-2 text-xs text-stone-400">
        Highlighted ingredients aren’t shared by every recipe.
      </p>
    </div>
  )
}
