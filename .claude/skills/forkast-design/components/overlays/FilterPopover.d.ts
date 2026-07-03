import * as React from 'react'
export interface FilterPopoverProps {
  /** Trigger label. @default 'Filters' */
  label?: React.ReactNode
  /** Number of active filters — shown as a badge; > 0 also styles the trigger active. */
  count?: number
  /** Which edge the panel aligns to. @default 'right' */
  align?: 'left' | 'right'
  /** Panel width in px. @default 250 */
  width?: number
  /** The controls rendered inside the panel. */
  children?: React.ReactNode
}
export declare function FilterPopover(props: FilterPopoverProps): JSX.Element
