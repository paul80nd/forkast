import * as React from 'react'

/**
 * Forkast's 1–5 curation control.
 * @startingPoint section="Rating" subtitle="Star & rotation scales" viewport="700x120"
 */
export interface RatingScaleProps {
  value?: 1 | 2 | 3 | 4 | 5
  /** Omit for a read-only display. Called with undefined when the current value is re-clicked. */
  onChange?: (value: 1 | 2 | 3 | 4 | 5 | undefined) => void
  /** Map of level → verdict shown on hover/current when showLabel is on. */
  labels?: Record<1 | 2 | 3 | 4 | 5, string>
  glyph?: string
  /** CSS colour (token) for filled glyphs. */
  filledColor?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  name?: string
}
export declare function RatingScale(props: RatingScaleProps): JSX.Element
/** Quality — honey ★ + household verdicts. */
export declare function StarRating(props: Omit<RatingScaleProps, 'glyph' | 'labels' | 'filledColor'>): JSX.Element
/** Frequency — harbour ◆ + rotation labels. */
export declare function RotationRating(props: Omit<RatingScaleProps, 'glyph' | 'labels' | 'filledColor'>): JSX.Element
