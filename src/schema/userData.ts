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
  /** The default household size; scales any meal without its own override. */
  portions: number
  recipeIds: string[]
  /**
   * Per-meal portion overrides, keyed by recipeId — leftovers/batch awareness: cook one meal for
   * guests or batch it for lunches while the rest stay at the plan `portions`. Absent (or absent
   * for a given id) means that meal uses the default; the shopping merge scales each recipe by its
   * own effective portions. Keying by recipeId is safe because a plan holds each recipe at most
   * once. Optional and back-compatible — older plans simply have no overrides.
   */
  portionOverrides?: Record<string, number>
}

/**
 * A user's variant edit — an authoritative override of the import-seeded grouping
 * (`Recipe.variantGroupKey`/`variantGroupLead`). User data: precious, exported with the
 * backup, survives re-import. A recipe belongs to at most one override; its members leave
 * their import group and form this dish, led by `leadId`. A single-member override detaches
 * a recipe from its import group ("this isn't a variant"). Variant labels are derived from
 * title diffs at display time, so none are stored here.
 */
export interface VariantOverride {
  /** Stable override id. */
  id: string
  /** The recipes that form this dish (1 = a detach; 2+ = a confirmed/merged group). */
  recipeIds: string[]
  /** Which member leads (the default shown/planned). Must be one of `recipeIds`. */
  leadId: string
}

/** Simple key/value settings row. */
export interface SettingRow {
  key: string
  value: unknown
}

/**
 * One entry on the "use up" list — an ingredient you want to cook down. `ingredientId` is set
 * when it was picked from the dictionary (enables exact id/binding matching + a stable label);
 * free-typed entries carry only `name` and match recipes by name tokens. The whole list is
 * persisted as a single `settings` row (`key: 'useUp'`), so it rides along in the backup.
 */
export interface UseUpItem {
  name: string
  ingredientId?: string
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
  version: 4
  exportedAt: string
  recipes: Recipe[]
  userData: UserRecipeData[]
  cooked: CookedEntry[]
  plans: WeekPlan[]
  shopping: ShoppingState[]
  /** User variant edits layered over the import-seeded grouping. */
  variantOverrides: VariantOverride[]
  /** The ingredient dictionary — seeded default plus any user-created entries. */
  dictionary: IngredientDef[]
  /** Lazy shopping-time name→ingredient bindings. */
  bindings: Binding[]
  /** Raw key/value settings rows (dataSource, demoVersion, householdSize, …). */
  settings: SettingRow[]
}
