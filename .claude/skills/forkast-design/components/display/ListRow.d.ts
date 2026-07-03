import * as React from 'react'
export interface ListRowProps {
  /** Thumbnail URL. */
  image?: string
  title: React.ReactNode
  meta?: React.ReactNode
  onOpen?: () => void
  /** Right-aligned actions. */
  actions?: React.ReactNode
  children?: React.ReactNode
}
export declare function ListRow(props: ListRowProps): JSX.Element
