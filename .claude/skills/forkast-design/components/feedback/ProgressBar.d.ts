export interface ProgressBarProps {
  value: number
  /** @default 100 */
  max?: number
  /** Fill colour. @default 'brand' */
  tone?: 'brand' | 'info' | 'star'
  label?: React.ReactNode
  /** Show a "value of max" caption on the right. */
  showValue?: boolean
  /** Track height in px. @default 6 */
  size?: number
}
export declare function ProgressBar(props: ProgressBarProps): JSX.Element
