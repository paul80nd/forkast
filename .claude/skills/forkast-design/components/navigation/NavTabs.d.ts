import * as React from 'react'
export interface NavTab { id: string; label: React.ReactNode }
export interface NavTabsProps {
  tabs: NavTab[]
  active: string
  onChange?: (id: string) => void
}
export declare function NavTabs(props: NavTabsProps): JSX.Element
