import Dexie, { type Table } from 'dexie'
import type { Recipe } from '../schema/recipe'
import type { IngredientDef } from '../data/ingredients'
import type {
  UserRecipeData,
  CookedEntry,
  WeekPlan,
  SettingRow,
  ShoppingState,
  VariantOverride,
  Binding,
} from '../schema/userData'

// IndexedDB working store. Reference data (recipes) is re-importable, so never
// precious; user data is the part worth exporting/backing up.
export class ForkastDB extends Dexie {
  recipes!: Table<Recipe, string>
  userData!: Table<UserRecipeData, string>
  cooked!: Table<CookedEntry, number>
  plans!: Table<WeekPlan, string>
  settings!: Table<SettingRow, string>
  shopping!: Table<ShoppingState, string>
  variantOverrides!: Table<VariantOverride, string>
  dictionary!: Table<IngredientDef, string>
  bindings!: Table<Binding, string>

  constructor() {
    super('forkast')
    this.version(1).stores({
      recipes: 'id, cuisine, mainProtein',
      userData: 'recipeId, stars',
      cooked: '++id, recipeId, date',
      plans: 'id',
      settings: 'key',
    })
    // v2: shopping-list tick-off + manual extras.
    this.version(2).stores({ shopping: 'id' })
    // v3: the (retired) manual variantGroups table — kept in the migration history; dropped at v7.
    this.version(3).stores({ variantGroups: 'id' })
    // v4: ingredient dictionary (seeded, growable) + lazy shopping-time name bindings.
    this.version(4).stores({ dictionary: 'id, aisle', bindings: 'name' })
    // v5: index variantGroupKey so a recipe's variant siblings look up directly.
    this.version(5).stores({ recipes: 'id, cuisine, mainProtein, variantGroupKey' })
    // v6: user variant overrides (edits layered over the import-seeded grouping).
    this.version(6).stores({ variantOverrides: 'id' })
    // v7: drop the retired manual variantGroups table (superseded by variant overrides).
    this.version(7).stores({ variantGroups: null })
  }
}

export const db = new ForkastDB()
