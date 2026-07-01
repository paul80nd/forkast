import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { resolveAsset } from '../lib/assets'
import { RotationRating, StarRating } from './RatingScale'
import { clearCuration, setRotation, setStars } from '../app/curation'
import { seeAlsoFor } from '../app/groups'
import type { Recipe } from '../schema/recipe'

// The shared recipe body — image + facts + editable ★/◆ rating panel + nutrition on the left,
// title/description/ingredients/method on the right. Used by the full RecipePage and the Plan-page
// modal, so both share one formatting (single source of truth). The rating panel is self-contained
// via the curation app layer; page-specific actions (add-to-week, delete) are injected as
// `headerActions` beside the title.
export function RecipeDetail({
  recipe,
  headerActions,
}: {
  recipe: Recipe
  headerActions?: ReactNode
}) {
  const stars = useLiveQuery(async () => (await db.userData.get(recipe.id))?.stars, [recipe.id])
  const rotation = useLiveQuery(async () => (await db.userData.get(recipe.id))?.rotation, [recipe.id])
  const seeAlso = useLiveQuery(() => seeAlsoFor(recipe.id), [recipe.id])

  return (
    <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
      {/* Left: image + at-a-glance facts */}
      <div>
        <img
          src={resolveAsset(recipe.image)}
          alt=""
          className="aspect-[4/3] w-full rounded-xl object-cover"
        />
        <dl className="mt-4 space-y-2 text-sm">
          <Fact label="Cuisine" value={recipe.cuisine} />
          <Fact label="Time" value={`${recipe.prepTime} min`} />
          {recipe.mainProtein && <Fact label="Main" value={recipe.mainProtein} capitalize />}
          <Fact label="Serves" value={`${recipe.serves}`} />
        </dl>

        <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Your rating
            </h3>
            {/* Reset to unrated — back into the Curate triage backlog, e.g. to cook it
                first before deciding (clears both the stars and any rotation). */}
            {(stars !== undefined || rotation !== undefined) && (
              <button
                type="button"
                onClick={() => void clearCuration(recipe.id)}
                title="Clear your rating — sends it back to triage"
                className="text-xs font-medium text-stone-400 hover:text-rose-600"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-1.5">
            <StarRating size="lg" showLabel value={stars} onChange={(v) => setStars(recipe.id, v)} />
          </div>
          {/* Rotation matters only for the planner's pool (★3+); mirrors Curate. */}
          {stars !== undefined && stars >= 3 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-stone-500">How often</span>
              <RotationRating
                showLabel
                value={rotation}
                onChange={(v) => setRotation(recipe.id, v)}
              />
            </div>
          )}
        </div>

        {recipe.allergens.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Allergens
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recipe.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {recipe.tags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Tags</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recipe.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {recipe.nutrition && (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Nutrition <span className="font-normal normal-case">(per serving)</span>
            </h3>
            <dl className="mt-1.5 space-y-1 text-sm">
              <Fact label="Energy" value={`${Math.round(recipe.nutrition.kcal)} kcal`} />
              <Fact label="Protein" value={`${recipe.nutrition.protein} g`} />
              <Fact
                label="Fat"
                value={`${recipe.nutrition.fat} g (${recipe.nutrition.saturates} g sat)`}
              />
              <Fact
                label="Carbs"
                value={`${recipe.nutrition.carbs} g (${recipe.nutrition.sugars} g sugar)`}
              />
              <Fact label="Fibre" value={`${recipe.nutrition.fibre} g`} />
              <Fact label="Salt" value={`${recipe.nutrition.salt} g`} />
            </dl>
          </div>
        )}
      </div>

      {/* Right: the recipe itself */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{recipe.title}</h1>
          {headerActions}
        </div>
        <p className="mt-2 text-stone-600">{recipe.description}</p>

        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-block text-sm text-orange-600 hover:underline"
          >
            View original ↗
          </a>
        )}

        {seeAlso && seeAlso.length > 0 && (
          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <h2 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              See also{' '}
              <span className="font-normal normal-case text-stone-400">— variants of this dish</span>
            </h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {seeAlso.map((s) => (
                <li key={s.recipeId}>
                  <Link
                    to={`/recipe/${s.recipeId}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white dark:bg-stone-100 px-2.5 py-1 text-sm text-stone-700 transition hover:border-orange-300 hover:text-orange-700"
                  >
                    {s.label && (
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-500">
                        {s.label}
                      </span>
                    )}
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-stone-500 uppercase">
          Ingredients
        </h2>
        <ul className="mt-2 divide-y divide-stone-100">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="text-stone-800">{ing.rawLabel}</span>
              {/* Parsed breakdown — for proof-reading imports */}
              <span className="shrink-0 font-mono text-xs text-stone-400">
                {ing.qty != null ? ing.qty : '—'}
                {ing.unit ? ` ${ing.unit}` : ''} · {ing.name}
              </span>
            </li>
          ))}
        </ul>

        {recipe.basics.length > 0 && (
          <p className="mt-3 text-sm text-stone-500">
            <span className="font-medium text-stone-600">Store cupboard:</span>{' '}
            {recipe.basics.join(', ')}
          </p>
        )}

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-stone-500 uppercase">Method</h2>
        <ol className="mt-2 space-y-3">
          {[...recipe.instructions]
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <li key={step.order} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                  {step.order}
                </span>
                <span className="text-stone-700">{step.text}</span>
              </li>
            ))}
        </ol>
      </div>
    </div>
  )
}

function Fact({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className={`text-right font-medium text-stone-800 ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
