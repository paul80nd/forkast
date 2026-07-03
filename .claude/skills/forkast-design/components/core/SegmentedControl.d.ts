export interface SegmentOption { value: string | number; label?: React.ReactNode }
export interface SegmentedControlProps {
  options: SegmentOption[]
  value: string | number
  onChange?: (value: string | number) => void
  ariaLabel?: string
}
export declare function SegmentedControl(props: SegmentedControlProps): JSX.Element
