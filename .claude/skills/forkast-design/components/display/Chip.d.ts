import * as React from 'react'
export interface ChipProps {
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  children?: React.ReactNode
}
export declare function Chip(props: ChipProps): JSX.Element
