// Pure helper for the duplicate finder: of a cluster of near-identical recipes, which one
// to keep (so the rest are pre-armed for deletion). Prefer the one you've invested in —
// highest ★ — then the most complete record, with a stable id tie-break so the choice is
// deterministic. Side-effect-free and unit-tested; the Dexie delete lives in the app layer.

export interface KeeperInput {
  id: string
  /** Our ★ rating, if any. */
  stars?: number
  /** Ingredient-line count — a proxy for how complete the record is. */
  ingredientCount: number
  hasImage: boolean
}

/** Pick the recipe id to keep from a duplicate cluster. Never returns undefined for a
 *  non-empty list. */
export function chooseKeeper(members: KeeperInput[]): string {
  return [...members]
    .sort(
      (a, b) =>
        (b.stars ?? 0) - (a.stars ?? 0) ||
        b.ingredientCount - a.ingredientCount ||
        Number(b.hasImage) - Number(a.hasImage) ||
        a.id.localeCompare(b.id),
    )[0]?.id
}
