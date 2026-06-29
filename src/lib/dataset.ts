// Pure validation/normalisation for an importable recipe dataset. The CLI emits a
// `RecipeDataset` already in our schema; this guards the SPA against a malformed or
// partial file at the door — drop unusable records, normalise the rest, never throw.
// Kept dependency-free and side-effect-free so it's exhaustively unit-testable; the
// Dexie write lives in the app layer (see src/app/dataset.ts).

import type { Recipe, RecipeDataset } from '../schema/recipe'

export interface ParseResult {
  /** Valid, normalised recipes ready to load. */
  recipes: Recipe[]
  /** Human-readable reasons records were dropped. One per skipped recipe. */
  errors: string[]
  /** Count of records dropped (== errors.length). */
  skipped: number
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** Normalise one raw record into a Recipe, or describe why it can't be used. */
function normaliseRecipe(raw: unknown, index: number): Recipe | string {
  if (!isObject(raw)) return `recipe #${index + 1}: not an object`

  const id = asString(raw.id) ?? asString(raw.slug)
  if (!id) return `recipe #${index + 1}: missing id/slug`

  const title = asString(raw.title)
  if (!title) return `recipe "${id}": missing title`

  if (!Array.isArray(raw.ingredients)) {
    return `recipe "${id}": ingredients is not a list`
  }

  const ingredients: Recipe['ingredients'] = []
  for (const line of raw.ingredients) {
    if (!isObject(line)) continue
    const name = asString(line.name) ?? asString(line.rawLabel)
    const rawLabel = asString(line.rawLabel) ?? name
    if (!rawLabel || !name) continue // a line with no text is unusable; skip the line, keep the recipe
    ingredients.push({
      rawLabel,
      name,
      qty: asNumber(line.qty),
      unit: asString(line.unit),
      ingredientId: asString(line.ingredientId),
      sourceRef: asString(line.sourceRef),
    })
  }

  const prep = isObject(raw.prepTime) ? raw.prepTime : {}
  const instructions: Recipe['instructions'] = Array.isArray(raw.instructions)
    ? raw.instructions
        .filter(isObject)
        .map((s, i) => ({ order: asNumber(s.order) ?? i + 1, text: asString(s.text) ?? '' }))
        .filter((s) => s.text !== '')
    : []

  const recipe: Recipe = {
    id,
    slug: asString(raw.slug) ?? id,
    title,
    description: asString(raw.description) ?? '',
    image: asString(raw.image) ?? '',
    cuisine: asString(raw.cuisine) ?? '',
    tags: asStringArray(raw.tags),
    allergens: asStringArray(raw.allergens),
    prepTime: {
      for2: asNumber(prep.for2) ?? 0,
      for4: asNumber(prep.for4) ?? 0,
    },
    ingredients,
    basics: asStringArray(raw.basics),
    instructions,
    serves: asNumber(raw.serves) ?? 2,
  }

  // Optional pass-through fields — only set when genuinely present.
  const sourceUrl = asString(raw.sourceUrl)
  if (sourceUrl) recipe.sourceUrl = sourceUrl
  const sourceCode = asString(raw.sourceCode)
  if (sourceCode) recipe.sourceCode = sourceCode
  const mainProtein = asString(raw.mainProtein)
  if (mainProtein) recipe.mainProtein = mainProtein
  if (isObject(raw.sourceRating)) {
    const average = asNumber(raw.sourceRating.average)
    const count = asNumber(raw.sourceRating.count)
    if (average !== undefined && count !== undefined) recipe.sourceRating = { average, count }
  }
  if (isObject(raw.nutrition)) {
    recipe.nutrition = raw.nutrition as unknown as Recipe['nutrition']
  }

  return recipe
}

/**
 * Validate and normalise an importable dataset. Accepts the JSON text, the parsed
 * `{ version, recipes }` wrapper, or a bare array of recipes. Invalid records are
 * dropped with a reason rather than aborting the whole import; duplicate ids keep
 * the first occurrence.
 */
export function parseRecipeDataset(input: unknown): ParseResult {
  let data: unknown = input
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch (err) {
      return { recipes: [], errors: [`not valid JSON: ${(err as Error).message}`], skipped: 1 }
    }
  }

  let rawRecipes: unknown[]
  if (Array.isArray(data)) {
    rawRecipes = data
  } else if (isObject(data) && Array.isArray(data.recipes)) {
    rawRecipes = data.recipes
  } else {
    return { recipes: [], errors: ['dataset has no recipes array'], skipped: 1 }
  }

  const recipes: Recipe[] = []
  const errors: string[] = []
  const seen = new Set<string>()

  rawRecipes.forEach((raw, i) => {
    const result = normaliseRecipe(raw, i)
    if (typeof result === 'string') {
      errors.push(result)
      return
    }
    if (seen.has(result.id)) {
      errors.push(`recipe "${result.id}": duplicate id`)
      return
    }
    seen.add(result.id)
    recipes.push(result)
  })

  return { recipes, errors, skipped: errors.length }
}

/** Narrow a parsed wrapper to a typed dataset, for callers that need the envelope. */
export function isRecipeDataset(v: unknown): v is RecipeDataset {
  return isObject(v) && v.version === 1 && Array.isArray(v.recipes)
}
