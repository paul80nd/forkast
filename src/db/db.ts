import Dexie, { type Table } from 'dexie'
import type { Recipe } from '../schema/recipe'
import type {
  UserRecipeData,
  CookedEntry,
  WeekPlan,
  SettingRow,
} from '../schema/userData'

// IndexedDB working store. Reference data (recipes) is re-importable, so never
// precious; user data is the part worth exporting/backing up.
export class ForkastDB extends Dexie {
  recipes!: Table<Recipe, string>
  userData!: Table<UserRecipeData, string>
  cooked!: Table<CookedEntry, number>
  plans!: Table<WeekPlan, string>
  settings!: Table<SettingRow, string>

  constructor() {
    super('forkast')
    this.version(1).stores({
      recipes: 'id, cuisine, mainProtein',
      userData: 'recipeId, stars',
      cooked: '++id, recipeId, date',
      plans: 'id',
      settings: 'key',
    })
  }
}

export const db = new ForkastDB()
