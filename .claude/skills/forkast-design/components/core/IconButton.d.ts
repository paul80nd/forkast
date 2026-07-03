import * as React from 'react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Hover colour intent. @default 'neutral' */
  tone?: 'neutral' | 'danger' | 'brand'
  /** Square edge length in px. @default 34 */
  size?: number
  /** Accessible label (also the tooltip). */
  label?: string
}
export declare function IconButton(props: IconButtonProps): JSX.Element
