import * as React from 'react'
export interface CheckItemProps {
  checked?: boolean
  onToggle?: () => void
  /** 'box' = checkbox (ingredients, shopping); 'step' = numbered circle (method). */
  marker?: 'box' | 'step'
  /** Step number, when marker='step'. */
  index?: number
  /** Right-aligned extra (e.g. a parsed amount). */
  trailing?: React.ReactNode
  children?: React.ReactNode
}
export declare function CheckItem(props: CheckItemProps): JSX.Element
