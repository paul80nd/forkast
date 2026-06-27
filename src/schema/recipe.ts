// The generic, provider-neutral recipe schema — Forkast's public storage format.
// Adapters (private) map any source into these shapes; the app only ever sees
// this. Keep it source-agnostic: nothing here should name or assume a provider.

/** A single ingredient line. Quantities are parsed best-effort from `rawLabel`. */
export interface Ingredient {
  /** The original human label, e.g. "320g skinless chicken thighs". */
  rawLabel: string
  /** Normalised name used for display, e.g. "chicken thighs". */
  name: string
  /** Numeric quantity if parseable, e.g. 320. Absent for "to taste" items. */
  qty?: number
  /** Unit if parseable, e.g. "g", "ml", "tbsp". Absent for countable items. */
  unit?: string
  /**
   * Canonical ingredient this line maps to (see the ingredient dictionary).
   * Set at import; lines without it still shop, just un-merged. This binding is
   * what makes the shopping list merge across recipes.
   */
  ingredientId?: string
}

/** One ordered step of the method. */
export interface Instruction {
  order: number
  text: string
}

export interface Recipe {
  /** Stable identifier; the slug doubles as the id. */
  id: string
  slug: string
  title: string
  description: string
  /** Path or URL to the recipe image. Relative paths resolve against BASE_URL. */
  image: string
  /** Provenance. Omitted from demo and any committed public data. */
  sourceUrl?: string

  cuisine: string
  categories: string[]
  tags: string[]
  /** e.g. ["gluten", "egg", "fish"] — powers no-go filters. */
  allergens: string[]

  /** Prep+cook minutes at each batch size. */
  prepTime: { for2: number; for4: number }
  /** Rating carried over from the source, if any. */
  sourceRating?: { average: number; count: number }

  ingredients: Ingredient[]
  /** Store-cupboard items, kept out of the buy list by default. */
  basics: string[]
  instructions: Instruction[]

  /** Best-effort derived centre-of-plate, e.g. "chicken", for variety. */
  mainProtein?: string
  /** Base portions the ingredient quantities are written for. Default 2. */
  serves: number
}

/** The on-disk / importable dataset wrapper. */
export interface RecipeDataset {
  version: 1
  generatedAt?: string
  recipes: Recipe[]
}
