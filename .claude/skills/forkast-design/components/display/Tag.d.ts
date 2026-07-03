import * as React from 'react'
export interface TagProps {
  tone?: 'neutral' | 'brand' | 'star' | 'info' | 'warn' | 'danger'
  /** Square (6px) corners instead of a full pill. */
  square?: boolean
  children?: React.ReactNode
}
export declare function Tag(props: TagProps): JSX.Element
