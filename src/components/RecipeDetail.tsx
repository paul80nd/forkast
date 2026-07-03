import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { resolveAsset } from '../lib/assets'
import { RotationRating, StarRating } from './RatingScale'
import { clearCuration, setRotation, setStars } from '../app/curation'
import { dishForRecipe } from '../app/variants'
import { ingredientDelta, variantLabel } from '../lib/variants'
import { formatScaledQty, scaledIngredientLabel, servingFactor } from '../lib/scaleServings'
import { SegmentedControl } from './SegmentedControl'
import { CheckItem } from './CheckItem'
import type { Recipe } from '../schema/recipe'

// The shared recipe body — image + facts + editable ★/◆ rating panel + nutrition on the left,
// title/description/ingredients/method on the right. Used by the full RecipePage and the Plan-page
// modal, so both share one formatting (single source of truth). The rating panel is self-contained
// via the curation app layer; page-specific actions (add-to-week, delete) are injected via
// `headerActions`, called with the currently-shown variant so those actions target the chosen swap.
//
// When the recipe is one of a variant group, a version selector lets the reader swap the shown
// recipe in place (protein/carb/side swaps) and see the ingredient diff versus the lead.
export function RecipeDetail({
  recipe: anchor,
  headerActions,
}: {
  recipe: Recipe
  headerActions?: (shown: Recipe) => ReactNode
}) {
  // The anchor's effective dish (import grouping + user overrides), ordered lead-first.
  const dish = useLiveQuery(() => dishForRecipe(anchor.id), [anchor.id])
  const members = dish?.variants ?? [anchor]
  const lead = dish?.lead ?? anchor

  // Which variant is on show — defaults to the one navigated to; reset when the page changes.
  const [shownId, setShownId] = useState(anchor.id)
  useEffect(() => setShownId(anchor.id), [anchor.id])
  // The whole body below renders this `recipe` — the shown variant, not necessarily the anchor.
  const recipe = members.find((m) => m.id === shownId) ?? anchor

  const stars = useLiveQuery(async () => (await db.userData.get(recipe.id))?.stars, [recipe.id])
  const rotation = useLiveQuery(async () => (await db.userData.get(recipe.id))?.rotation, [recipe.id])

  const delta = recipe.id === lead.id ? null : ingredientDelta(lead, recipe)

  // Cook-along state: serving scaler + ingredient/step check-offs. All ephemeral (a cook aid,
  // not curation) and reset when the shown variant changes. Quantities recompute live off the
  // factor; nutrition is per-serving and stays put.
  const [serves, setServes] = useState(recipe.serves)
  const [checkedIng, setCheckedIng] = useState<Set<number>>(new Set())
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())
  const [showParsed, setShowParsed] = useState(false)
  useEffect(() => {
    setServes(recipe.serves)
    setCheckedIng(new Set())
    setCheckedSteps(new Set())
  }, [recipe.id])
  const factor = servingFactor(serves, recipe.serves)
  const serveOptions = Array.from(new Set([recipe.serves, 2, 4, 6])).sort((a, b) => a - b)
  const toggle = (set: Set<number>, key: number) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  }

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
          {/* Serving scaler — recomputes the ingredient quantities below live. */}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Serves</dt>
            <dd className="m-0">
              <SegmentedControl
                size="sm"
                ariaLabel="Scale servings"
                options={serveOptions}
                value={serves}
                onChange={setServes}
              />
            </dd>
          </div>
          {recipe.recipeCode && <Fact label="Card" value={recipe.recipeCode} />}
        </dl>

        <div className="mt-4 rounded-lg border border-line bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Your rating
            </h3>
            {/* Reset to unrated — back into the Curate triage backlog, e.g. to cook it
                first before deciding (clears both the stars and any rotation). */}
            {(stars !== undefined || rotation !== undefined) && (
              <button
                type="button"
                onClick={() => void clearCuration(recipe.id)}
                title="Clear your rating — sends it back to triage"
                className="text-xs font-medium text-muted hover:text-danger-ink"
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
              <span className="text-xs text-muted">How often</span>
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
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Allergens
            </h3>
            {/* Warn (honey) tone so these read as "contains", not just another descriptive label. */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recipe.allergens.map((a) => (
                <span
                  key={a}
                  className="rounded bg-warn-tint px-1.5 py-0.5 text-xs font-medium text-warn-ink"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {recipe.tags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Tags</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recipe.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-sunken px-2 py-0.5 text-xs text-muted"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {recipe.nutrition && (
          <div className="mt-4 rounded-lg border border-line bg-surface p-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Nutrition{' '}
              <span className="font-normal tracking-normal text-subtle normal-case">
                · per serving
              </span>
            </h3>
            {/* Energy leads as the headline; macros read as quieter label/value rows below. */}
            <div className="mt-2 flex items-baseline justify-between gap-2 border-b border-divider pb-2">
              <span className="text-sm text-muted">Energy</span>
              <span className="font-display text-lg font-semibold whitespace-nowrap text-ink">
                {Math.round(recipe.nutrition.kcal)} kcal
              </span>
            </div>
            <dl className="mt-1.5 space-y-0.5 text-sm">
              <NutriRow label="Protein" main={`${recipe.nutrition.protein} g`} />
              <NutriRow
                label="Fat"
                main={`${recipe.nutrition.fat} g`}
                detail={`(${recipe.nutrition.saturates} g sat)`}
              />
              <NutriRow
                label="Carbs"
                main={`${recipe.nutrition.carbs} g`}
                detail={`(${recipe.nutrition.sugars} g sugar)`}
              />
              <NutriRow label="Fibre" main={`${recipe.nutrition.fibre} g`} />
              <NutriRow label="Salt" main={`${recipe.nutrition.salt} g`} />
            </dl>
          </div>
        )}
      </div>

      {/* Right: the recipe itself */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{recipe.title}</h1>
          {headerActions?.(recipe)}
        </div>
        <p className="mt-2 text-muted">{recipe.description}</p>

        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-block text-sm text-brand-ink hover:underline"
          >
            View original ↗
          </a>
        )}

        {members.length > 1 && (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-wash p-3">
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Versions{' '}
              <span className="font-normal normal-case text-muted">
                — {members.length} swaps of this dish
              </span>
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {members.map((m) => {
                const isShown = m.id === recipe.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setShownId(m.id)}
                    className={`rounded-full border px-2.5 py-1 text-sm transition ${
                      isShown
                        ? 'border-brand-500 bg-brand-700 text-white'
                        : 'border-line bg-card text-ink hover:border-brand-300 hover:text-brand-ink'
                    }`}
                  >
                    {m.id === lead.id ? 'Original' : variantLabel(m.title, lead.title)}
                  </button>
                )
              })}
            </div>
            {delta && (delta.added.length > 0 || delta.removed.length > 0) ? (
              <p className="mt-2 text-sm">
                <span className="font-medium text-muted">Swap vs original: </span>
                {delta.removed.map((n) => (
                  <span key={`-${n}`} className="mr-2 whitespace-nowrap text-danger-ink">
                    − {n}
                  </span>
                ))}
                {delta.added.map((n) => (
                  <span key={`+${n}`} className="mr-2 whitespace-nowrap text-positive-ink">
                    + {n}
                  </span>
                ))}
              </p>
            ) : delta ? (
              <p className="mt-2 text-sm text-muted">
                Same ingredients as the original — differs in amounts or method.
              </p>
            ) : null}
          </div>
        )}


        <div className="mt-6 flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Ingredients
            {factor !== 1 && (
              <span className="ml-2 text-xs font-normal tracking-normal text-brand-ink normal-case">
                · scaled for {serves}
              </span>
            )}
          </h2>
          {/* The parsed qty·name breakdown is dev-facing (import proof-reading) — off by default. */}
          <button
            type="button"
            onClick={() => setShowParsed((v) => !v)}
            className="shrink-0 text-xs text-muted hover:text-ink"
          >
            {showParsed ? 'Hide parsed' : 'Show parsed'}
          </button>
        </div>
        <ul className="mt-2 divide-y divide-divider">
          {recipe.ingredients.map((ing, i) => (
            <CheckItem
              key={i}
              checked={checkedIng.has(i)}
              onToggle={() => setCheckedIng((s) => toggle(s, i))}
              trailing={
                showParsed && (
                  <span className="shrink-0 font-mono text-xs whitespace-nowrap text-subtle">
                    {ing.qty != null ? formatScaledQty(ing.qty * factor) : '—'}
                    {ing.unit ? ` ${ing.unit}` : ''} · {ing.name}
                  </span>
                )
              }
            >
              {scaledIngredientLabel(ing, factor)}
            </CheckItem>
          ))}
        </ul>

        {recipe.basics.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            <span className="font-medium text-muted">Store cupboard:</span>{' '}
            {recipe.basics.join(', ')}
          </p>
        )}

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-muted uppercase">Method</h2>
        {/* Tick steps off as you cook — the number becomes a ✓ and the step dims. */}
        <ol className="mt-2 divide-y divide-divider">
          {[...recipe.instructions]
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <CheckItem
                key={step.order}
                marker="step"
                index={step.order}
                checked={checkedSteps.has(step.order)}
                onToggle={() => setCheckedSteps((s) => toggle(s, step.order))}
              >
                {step.text}
              </CheckItem>
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
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right font-medium text-ink ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

// One macro row: bold amount, with an optional muted detail (sat/sugar) — amounts never wrap.
function NutriRow({ label, main, detail }: { label: string; main: string; detail?: string }) {
  return (
    <div className="flex justify-between gap-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right">
        <span className="font-medium whitespace-nowrap text-ink">{main}</span>
        {detail && <span className="whitespace-nowrap text-muted"> {detail}</span>}
      </dd>
    </div>
  )
}
