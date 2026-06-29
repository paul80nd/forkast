import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { resolveAsset } from '../lib/assets'
import { StarRating } from '../components/StarRating'
import { setStars } from '../lib/curation'
import { CURRENT_PLAN_ID, addToPlan, removeFromPlan } from '../lib/plan'
import { seeAlsoFor } from '../app/groups'
import { deleteRecipe } from '../app/cleanup'

export function RecipePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  // undefined = loading, null = not found
  const recipe = useLiveQuery(async () => (await db.recipes.get(id)) ?? null, [id])
  const stars = useLiveQuery(async () => (await db.userData.get(id))?.stars, [id])
  const inPlan = useLiveQuery(
    async () => ((await db.plans.get(CURRENT_PLAN_ID))?.recipeIds ?? []).includes(id),
    [id],
  )
  const seeAlso = useLiveQuery(() => seeAlsoFor(id), [id])

  if (recipe === undefined) {
    return <p className="text-stone-500">Loading…</p>
  }

  if (recipe === null) {
    return (
      <section>
        <p className="text-stone-600">Recipe not found.</p>
        <Link to="/browse" className="mt-2 inline-block text-orange-600 hover:underline">
          ← Back to Browse
        </Link>
      </section>
    )
  }

  return (
    <section>
      <Link to="/browse" className="text-sm text-orange-600 hover:underline">
        ← Back to Browse
      </Link>

      <div className="mt-3 grid gap-6 md:grid-cols-[2fr_3fr]">
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
            {recipe.mainProtein && (
              <Fact label="Main" value={recipe.mainProtein} capitalize />
            )}
            <Fact label="Serves" value={`${recipe.serves}`} />
          </dl>

          <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
              Your rating
            </h3>
            <div className="mt-1.5">
              <StarRating
                size="lg"
                value={stars}
                onChange={(v) => setStars(recipe.id, v)}
              />
            </div>
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
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      a === 'fish'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recipe.tags.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
                Tags
              </h3>
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

            {/* Split button: primary add/remove from week, with secondary actions in a menu. */}
            <div className="relative flex shrink-0 items-stretch">
              {inPlan ? (
                <button
                  type="button"
                  onClick={() => removeFromPlan(recipe.id)}
                  className="rounded-l-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
                >
                  ✓ In week
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => addToPlan(recipe.id)}
                  className="rounded-l-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
                >
                  + Add to week
                </button>
              )}
              <button
                type="button"
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
                className={`rounded-r-md border-l px-2 py-1.5 text-sm font-medium ${
                  inPlan
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-orange-400 bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                ▾
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
                    className="absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setMenuOpen(false)
                        if (
                          window.confirm(
                            `Delete “${recipe.title}”?\n\nThis removes it and its ratings for good (re-import to restore).`,
                          )
                        ) {
                          await deleteRecipe(recipe.id)
                          navigate('/browse')
                        }
                      }}
                      className="block w-full px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Delete recipe
                    </button>
                  </div>
                </>
              )}
            </div>
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
                <span className="font-normal normal-case text-stone-400">
                  — variants of this dish
                </span>
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {seeAlso.map((s) => (
                  <li key={s.recipeId}>
                    <Link
                      to={`/recipe/${s.recipeId}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-sm text-stone-700 transition hover:border-orange-300 hover:text-orange-700"
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

          <h2 className="mt-6 text-sm font-semibold tracking-wide text-stone-500 uppercase">
            Method
          </h2>
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
    </section>
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
