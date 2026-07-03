import * as React from 'react'
export interface PanelProps {
  tone?: 'info' | 'brand' | 'warn' | 'neutral'
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /** Right-aligned header actions (buttons). */
  actions?: React.ReactNode
  children?: React.ReactNode
}
export declare function Panel(props: PanelProps): JSX.Element
