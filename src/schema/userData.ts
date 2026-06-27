// User-generated data — lives in IndexedDB, backed up via export to curation.json.
// Kept separate from the read-only Recipe reference data.

/** Household sticky-note semantics: 5 favourite · 4 nice · 3 variety-only · 1-2 bin. */
export type Stars = 1 | 2 | 3 | 4 | 5

/** Per-recipe curation. Keyed by recipeId. */
export interface UserRecipeData {
  recipeId: string
  stars?: Stars
  notes?: string
  userTags?: string[]
}

/** A record that a recipe was cooked on a date. Feeds "not cooked recently". */
export interface CookedEntry {
  /** Auto-incremented by Dexie. */
  id?: number
  recipeId: string
  /** ISO date, yyyy-mm-dd. */
  date: string
}

/** A planned week of meals. */
export interface WeekPlan {
  /** e.g. "2026-W27" or a generated id. */
  id: string
  label?: string
  /** How many this plan caters for; scales the shopping list. */
  portions: number
  recipeIds: string[]
}

/** Simple key/value settings row. */
export interface SettingRow {
  key: string
  value: unknown
}

/** A manually-added shopping item not derived from a recipe. */
export interface ExtraItem {
  text: string
  checked: boolean
}

/** Tick-off + manual extras for a plan's shopping list. Keyed by plan id. */
export interface ShoppingState {
  id: string
  /** Keys of derived lines that are ticked off. */
  checked: string[]
  extras: ExtraItem[]
}

export interface Settings {
  householdSize: number
}

export const DEFAULT_SETTINGS: Settings = {
  householdSize: 2,
}

/** The exportable backup envelope. */
export interface CurationExport {
  version: 1
  exportedAt: string
  userData: UserRecipeData[]
  cooked: CookedEntry[]
  plans: WeekPlan[]
  settings: Settings
}
