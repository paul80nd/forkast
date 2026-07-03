import * as React from 'react'

/**
 * Primary action control.
 * @startingPoint section="Core" subtitle="Buttons, split button" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual role. @default 'primary' */
  variant?: 'primary' | 'positive' | 'soft' | 'danger' | 'ghost' | 'outline'
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** Optional leading glyph (e.g. "✓", "+"). */
  glyph?: React.ReactNode
  fullWidth?: boolean
}
export declare function Button(props: ButtonProps): JSX.Element

export interface SplitButtonProps {
  variant?: 'primary' | 'positive' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  glyph?: React.ReactNode
  onMain?: () => void
  /** Menu open state — caller-controlled. */
  open?: boolean
  onToggle?: () => void
  /** Menu contents, rendered in the popover when open. */
  menu?: React.ReactNode
  children?: React.ReactNode
}
export declare function SplitButton(props: SplitButtonProps): JSX.Element
