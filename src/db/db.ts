import Dexie, { type Table } from 'dexie'
import type { Recipe } from '../schema/recipe'
import type {
  UserRecipeData,
  CookedEntry,
  WeekPlan,
  SettingRow,
  ShoppingState,
  VariantGroup,
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
  variantGroups!: Table<VariantGroup, string>

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
    // v3: recipe variant groups (membership lookup is in-memory; see src/app/groups.ts).
    this.version(3).stores({ variantGroups: 'id' })
  }
}

export const db = new ForkastDB()
