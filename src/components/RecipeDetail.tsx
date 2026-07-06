import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useRecipeImage } from '../hooks/useRecipeImage'
import { RotationRating, StarRating } from './RatingScale'
import { ImageLightbox } from './ImageLightbox'
import { fieldBoxClass } from './Select'
import { clearCuration, setNotes, setRotation, setStars } from '../app/curation'
import { setRecipeAllergens, setRecipeTags, updateRecipeDetails } from '../app/recipeEdit'
import { distinctLabels } from '../lib/tags'
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
  editable = false,
}: {
  recipe: Recipe
  headerActions?: (shown: Recipe) => ReactNode
  /** Offer in-place editing of the recipe's scalar text (full page only; off in the Plan modal). */
  editable?: boolean
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
  // Notes you've written are worth reading before you cook, so they sit *above* the method when
  // present; an empty notes box stays tucked below it (see the two RecipeNotes slots).
  const savedNotes = useLiveQuery(async () => (await db.userData.get(recipe.id))?.notes ?? '', [recipe.id])
  const hasNotes = Boolean(savedNotes?.trim())

  // Autocomplete for the tag/allergen add-boxes: the distinct labels already used across the
  // collection, so new entries reuse an existing spelling instead of inventing near-duplicates.
  // Only needed while editing (`editable`); the empty default keeps the query off otherwise.
  const allRecipes = useLiveQuery(async () => (editable ? await db.recipes.toArray() : []), [editable])
  const tagOptions = distinctLabels(allRecipes ?? [], 'tags')
  const allergenOptions = distinctLabels(allRecipes ?? [], 'allergens')

  const delta = recipe.id === lead.id ? null : ingredientDelta(lead, recipe)

  // Cook-along state: serving scaler + ingredient/step check-offs. All ephemeral (a cook aid,
  // not curation) and reset when the shown variant changes. Quantities recompute live off the
  // factor; nutrition is per-serving and stays put.
  const [serves, setServes] = useState(recipe.serves)
  const [checkedIng, setCheckedIng] = useState<Set<number>>(new Set())
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set())
  const [showParsed, setShowParsed] = useState(false)
  // Click-to-enlarge: the thumbnail is cropped 4:3, so a lightbox shows the whole image bigger.
  const [zoomed, setZoomed] = useState(false)
  // In-place editing of the recipe's scalar text (title / description / card code). Offered only on
  // the full page (`editable`); the draft seeds from the shown recipe and is reset on navigation/swap.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ title: '', description: '', recipeCode: '' })
  const startEdit = () => {
    setDraft({ title: recipe.title, description: recipe.description, recipeCode: recipe.recipeCode ?? '' })
    setEditing(true)
  }
  const saveEdit = async () => {
    await updateRecipeDetails(recipe.id, draft)
    setEditing(false)
  }
  // Prefer the image pack (falls back to the base/dev route); the enlarged view reuses it.
  const imageSrc = useRecipeImage(recipe.image)
  useEffect(() => {
    setServes(recipe.serves)
    setCheckedIng(new Set())
    setCheckedSteps(new Set())
    setEditing(false)
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
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label="View a larger image"
          className="block w-full cursor-zoom-in overflow-hidden rounded-xl"
        >
          <img
            src={imageSrc}
            alt=""
            className="aspect-[4/3] w-full object-cover transition hover:brightness-95"
          />
        </button>
        {zoomed && (
          <ImageLightbox
            src={imageSrc}
            label={`${recipe.title} — larger image`}
            onClose={() => setZoomed(false)}
          />
        )}
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
          {editing ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Card</dt>
              <dd className="m-0">
                <input
                  type="text"
                  value={draft.recipeCode}
                  onChange={(e) => setDraft((d) => ({ ...d, recipeCode: e.target.value }))}
                  aria-label="Recipe card number"
                  placeholder="e.g. R1196"
                  className={`${fieldBoxClass} w-28 px-2 py-1 text-right text-sm`}
                />
              </dd>
            </div>
          ) : (
            recipe.recipeCode && <Fact label="Card" value={recipe.recipeCode} />
          )}
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

        {/* Warn (honey) tone so allergens read as "contains", not just another descriptive label. */}
        <ChipEditor
          key={`allergens-${recipe.id}`}
          label="Allergens"
          items={recipe.allergens}
          editable={editable}
          onChange={(next) => void setRecipeAllergens(recipe.id, next)}
          suggestions={allergenOptions}
          chipClass="inline-flex items-center rounded bg-warn-tint px-1.5 py-0.5 text-xs font-medium text-warn-ink"
        />

        <ChipEditor
          key={`tags-${recipe.id}`}
          label="Tags"
          items={recipe.tags}
          editable={editable}
          onChange={(next) => void setRecipeTags(recipe.id, next)}
          suggestions={tagOptions}
          chipClass="inline-flex items-center rounded-full bg-sunken px-2 py-0.5 text-xs text-muted"
        />

        {recipe.nutrition && (
          <div className="mt-4 rounded-lg border border-line bg-surface p-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Nutrition{' '}
              <span className="font-normal tracking-normal text-muted normal-case">
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
          {editing ? (
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              aria-label="Recipe title"
              className={`${fieldBoxClass} w-full px-3 py-1.5 text-2xl font-semibold tracking-tight`}
            />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{recipe.title}</h1>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveEdit()}
                  disabled={!draft.title.trim()}
                  className="rounded-md bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  Save
                </button>
              </>
            ) : (
              <>
                {editable && (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
                  >
                    Edit
                  </button>
                )}
                {headerActions?.(recipe)}
              </>
            )}
          </div>
        </div>
        {editing ? (
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            aria-label="Recipe description"
            rows={2}
            className={`${fieldBoxClass} mt-2 w-full resize-y px-3 py-2 text-sm`}
          />
        ) : (
          <p className="mt-2 text-muted">{recipe.description}</p>
        )}

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

        {/* Your notes lead the method when you've written some — the tweaks you want in mind
            before cooking; otherwise the empty box sits after it (below). */}
        {hasNotes && <RecipeNotes recipeId={recipe.id} />}

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

        {!hasNotes && <RecipeNotes recipeId={recipe.id} />}
      </div>
    </div>
  )
}

// Free-text cooking notes for next time ("add salt to the rice"). Private user data on the
// curation row, kept alongside ★/◆ and exported with the backup. Edits autosave: on blur, and
// on unmount too (so closing the page or the Plan modal without blurring never drops a note).
function RecipeNotes({ recipeId }: { recipeId: string }) {
  // What's stored (empty string when none). Live, so an import or a variant swap reflects here.
  const stored = useLiveQuery(async () => (await db.userData.get(recipeId))?.notes ?? '', [recipeId])
  // Local edit buffer; `null` means "not editing — mirror what's stored".
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? stored ?? ''

  // Fresh buffer whenever the recipe changes (navigation / variant swap).
  useEffect(() => setDraft(null), [recipeId])

  // Persist the buffer if it differs from storage. Held in a ref so the unmount flush always
  // sees the latest draft without re-subscribing the cleanup effect on every keystroke.
  const persist = useRef<() => void>(() => {})
  persist.current = () => {
    if (draft !== null && draft.trim() !== (stored ?? '')) void setNotes(recipeId, draft)
  }
  useEffect(() => () => persist.current(), [])

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Your notes</h2>
      <p className="mt-1 text-xs text-muted">
        Thoughts for next time — tweaks, timings, what to watch. Only you see these.
      </p>
      <textarea
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          persist.current()
          setDraft(null)
        }}
        rows={3}
        aria-label="Your notes for this recipe"
        placeholder="e.g. add salt to the rice — it needed it last time."
        className={`${fieldBoxClass} mt-2 w-full resize-y px-3 py-2 text-sm placeholder:text-muted`}
      />
    </div>
  )
}

// An inline, independently-editable chip list (tags / allergens). Read-only unless `editable`,
// where a per-section Edit toggle reveals a × on each chip and an add box; every add/remove
// persists immediately via `onChange` (which normalises + de-dupes, so a duplicate add is a
// harmless no-op). Hidden entirely when empty and not editable. Keyed on the recipe id by the
// caller, so the edit toggle/draft reset on a variant swap.
function ChipEditor({
  label,
  items,
  editable,
  onChange,
  suggestions = [],
  chipClass,
}: {
  label: string
  items: string[]
  editable: boolean
  onChange: (next: string[]) => void
  /** Existing labels across the collection, offered as add-box autocomplete. */
  suggestions?: string[]
  chipClass: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (items.length === 0 && !editable) return null

  const add = () => {
    const value = draft.trim()
    if (value) onChange([...items, value])
    setDraft('')
  }

  // Suggest only labels not already on this recipe. A unique id per section links input↔datalist.
  const listId = `chip-suggest-${label.toLowerCase()}`
  const current = new Set(items.map((i) => i.toLowerCase()))
  const options = suggestions.filter((s) => !current.has(s.toLowerCase()))

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</h3>
        {editable && (
          <button
            type="button"
            onClick={() => {
              setDraft('')
              setEditing((e) => !e)
            }}
            className="text-xs font-medium text-muted hover:text-ink"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {items.map((item) => (
          <span key={item} className={chipClass}>
            {item}
            {editing && (
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x !== item))}
                aria-label={`Remove ${item}`}
                className="ml-1 leading-none opacity-60 hover:opacity-100"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {editing && (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            onBlur={add}
            aria-label={`Add ${label.toLowerCase()}`}
            placeholder="add…"
            list={options.length > 0 ? listId : undefined}
            className={`${fieldBoxClass} w-24 px-2 py-0.5 text-xs`}
          />
        )}
        {editing && options.length > 0 && (
          <datalist id={listId}>
            {options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
        {!editing && items.length === 0 && <span className="text-xs text-muted">None</span>}
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
