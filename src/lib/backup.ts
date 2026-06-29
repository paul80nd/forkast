// Pure validation/normalisation for a Save/Open backup snapshot. Guards the restore
// path against a malformed or hand-edited file at the door, the way parseRecipeDataset
// guards an import. Dependency-free and side-effect-free so it's exhaustively
// unit-testable; the Dexie wipe-and-restore lives in the app layer (src/app/backup.ts).

import type {
  BackupSnapshot,
  CookedEntry,
  SettingRow,
  ShoppingState,
  UserRecipeData,
  VariantGroup,
  WeekPlan,
} from '../schema/userData'
import { parseRecipeDataset } from './dataset'

export interface BackupParseResult {
  /** The validated, normalised snapshot ready to restore. */
  snapshot: BackupSnapshot
  /** Non-fatal issues (e.g. malformed recipes dropped). */
  warnings: string[]
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

/**
 * Validate a backup snapshot. Accepts the JSON text or the parsed object. Throws a
 * descriptive Error when the file isn't a recognisable backup (the UI surfaces it);
 * tolerates missing optional tables (defaults to empty) and drops malformed recipes
 * with a warning rather than aborting the whole restore.
 */
export function parseBackup(input: unknown): BackupParseResult {
  let data: unknown = input
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input)
    } catch (err) {
      throw new Error(`not valid JSON: ${(err as Error).message}`)
    }
  }

  if (!isObject(data)) throw new Error('backup is not an object')
  if (data.version !== 2) {
    throw new Error(`unsupported backup version ${String(data.version)} (expected 2)`)
  }
  if (!Array.isArray(data.recipes)) {
    throw new Error('backup has no recipes array — is this a Forkast backup file?')
  }

  // Reuse the import validator so restored recipes meet the same shape guarantees.
  const { recipes, errors } = parseRecipeDataset({ version: 1, recipes: data.recipes })
  const warnings = errors.length
    ? [`${errors.length} recipe(s) dropped as malformed`, ...errors]
    : []

  const settings = asArray<SettingRow>(data.settings).filter(
    (r): r is SettingRow => isObject(r) && typeof r.key === 'string',
  )

  const snapshot: BackupSnapshot = {
    version: 2,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    recipes,
    userData: asArray<UserRecipeData>(data.userData),
    cooked: asArray<CookedEntry>(data.cooked),
    plans: asArray<WeekPlan>(data.plans),
    shopping: asArray<ShoppingState>(data.shopping),
    variantGroups: asArray<VariantGroup>(data.variantGroups),
    settings,
  }

  return { snapshot, warnings }
}
