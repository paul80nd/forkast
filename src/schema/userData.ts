// User-generated data — lives in IndexedDB, backed up via the Save/Open snapshot
// (see src/app/backup.ts). Kept separate from the read-only Recipe reference data.

import type { Recipe } from './recipe'
import type { IngredientDef } from '../data/ingredients'

/**
 * A lazy shopping-time binding: an ingredient *name* (as written on recipe lines) resolved
 * to a canonical dictionary entry. Keyed by name — not the finer-grained source id — because
 * that is the level the shopping list merges on (one name may span many source ids). One
 * binding therefore merges every line of that name across the plan.
 */
export interface Binding {
  /** Normalised ingredient name (see `normalizeName` in src/lib/shopping.ts). */
  name: string
  ingredientId: string
}

/** Household sticky-note semantics: 5 favourite · 4 nice · 3 variety-only · 1-2 bin. */
export type Stars = 1 | 2 | 3 | 4 | 5

/**
 * How often you'd want this recipe in rotation — a *frequency* signal independent of ★
 * (quality). A 1–5 scale with 3 as neutral ground: 4–5 you'd cook more often, 1–2 less.
 * The assisted planner uses it to balance variety and avoid over-suggesting favourites.
 */
export type Rotation = 1 | 2 | 3 | 4 | 5

/** Per-recipe curation. Keyed by recipeId. */
export interface UserRecipeData {
  recipeId: string
  stars?: Stars
  rotation?: Rotation
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

/**
 * A symmetric set of related recipes (variants / near-duplicates) — there is no
 * lead/child. User data: precious, exported with the backup, survives re-import.
 * Invariants (enforced in `src/app/groups.ts`): a recipe belongs to at most one group,
 * and a group always has at least two members (it is dissolved otherwise).
 */
export interface VariantGroup {
  /** Stable group id. */
  id: string
  /** What differs across members; metadata only. */
  axis?: 'protein' | 'carb' | 'mixed'
  /** The members; `label` is the short variant tag shown in the UI ("Rice", "Beef"). */
  members: { recipeId: string; label: string }[]
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

/**
 * The Save/Open backup envelope — a self-contained snapshot of every table, so it is a
 * true restore point with no dependency on a matching `recipes.json`. Crucially it carries
 * the curated `recipes` set itself: that is the only way in-app deletions survive a restore
 * (there are no tombstones). Open restores by replacing all data wholesale.
 */
export interface BackupSnapshot {
  version: 3
  exportedAt: string
  recipes: Recipe[]
  userData: UserRecipeData[]
  cooked: CookedEntry[]
  plans: WeekPlan[]
  shopping: ShoppingState[]
  variantGroups: VariantGroup[]
  /** The ingredient dictionary — seeded default plus any user-created entries. */
  dictionary: IngredientDef[]
  /** Lazy shopping-time name→ingredient bindings. */
  bindings: Binding[]
  /** Raw key/value settings rows (dataSource, demoVersion, householdSize, …). */
  settings: SettingRow[]
}
