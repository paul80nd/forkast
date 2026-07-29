import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getRelatedRecipes } from '../app/relatedRecipes'
import { RecipeCard } from './RecipeCard'
import { SegmentedControl } from './SegmentedControl'
import type { Stars } from '../schema/userData'

// "More like this / Something different" — related-recipe discovery on the recipe page. Similarity
// is structured-feature (ingredients / cuisine / protein / tags / effort / nutrition), computed
// on-demand in the app layer; "different" offers keeper-quality recipes that break this dish's
// pattern rather than the farthest oddities. Anchored on the *shown* recipe, so it tracks a variant
// swap. Live, so a new rating reflects in the "different" gate at once. Design:
// docs/related-recipes-spec.md.

type Mode = 'similar' | 'different'

const MODES: readonly Mode[] = ['similar', 'different']
const LABEL: Record<Mode, string> = { similar: 'More like this', different: 'Something different' }
const BLURB: Record<Mode, string> = {
  similar: 'Dishes that share ingredients, cuisine and style with this one.',
  different: 'Good recipes to ring the changes — a different cuisine, protein or effort.',
}

export function RelatedRecipes({ anchorId }: { anchorId: string }) {
  const [mode, setMode] = useState<Mode>('similar')
  const related = useLiveQuery(() => getRelatedRecipes(anchorId), [anchorId])

  if (!related) return null // loading — stay quiet rather than flash an empty shell
  // Nothing to relate to (tiny collection, or every candidate filtered out) — show nothing.
  if (related.similar.length === 0 && related.different.length === 0) return null

  const results = related[mode]

  return (
    <section className="mt-10 border-t border-divider pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Related recipes</h2>
        <SegmentedControl
          size="sm"
          ariaLabel="Related recipes mode"
          options={MODES}
          value={mode}
          onChange={setMode}
          format={(m) => LABEL[m]}
        />
      </div>
      <p className="mt-1 text-xs text-muted">{BLURB[mode]}</p>

      {results.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {mode === 'different'
            ? 'Nothing rated highly enough yet — rate a few recipes ★3+ to get suggestions.'
            : 'No close matches in your collection.'}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <RecipeCard key={r.recipe.id} recipe={r.recipe} stars={r.stars as Stars | undefined} />
          ))}
        </div>
      )}
    </section>
  )
}
