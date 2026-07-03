import * as React from 'react'
export interface ToastProps {
  children?: React.ReactNode
  /** Optional action label (e.g. "Undo"). */
  action?: React.ReactNode
  onAction?: () => void
  /** Called after `duration` ms so the host can unmount it. */
  onClose?: () => void
  /** Auto-dismiss delay in ms. @default 3600 */
  duration?: number
}
export declare function Toast(props: ToastProps): JSX.Element
