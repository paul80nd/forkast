import * as React from 'react'

export interface RecipeCardData {
  title: string
  description: string
  cuisine: string
  prepTime: number
  mainProtein?: string
  /** Image URL. */
  image: string
}
/**
 * Forkast's signature recipe card.
 * @startingPoint section="Display" subtitle="Recipe card (grid tile)" viewport="360x300"
 */
export interface RecipeCardProps {
  recipe: RecipeCardData
  /** Your ★ rating (1–5) — shown as an overlay badge. */
  stars?: number
  /** Total versions of this dish; > 1 shows the ⇄ versions badge. */
  variantCount?: number
  selected?: boolean
  /** When given, a bulk-select tickbox is shown. */
  onToggleSelect?: () => void
  onOpen?: () => void
}
export declare function RecipeCard(props: RecipeCardProps): JSX.Element
