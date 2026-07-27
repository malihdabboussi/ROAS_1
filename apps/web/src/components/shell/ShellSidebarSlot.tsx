'use client'

import { createContext, useContext, type ReactNode } from 'react'

const ShellSidebarSlotContext = createContext<ReactNode>(null)

export function ShellSidebarSlotProvider({
  sidebar,
  children,
}: {
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <ShellSidebarSlotContext.Provider value={sidebar}>{children}</ShellSidebarSlotContext.Provider>
  )
}

export function useShellSidebarSlot(): ReactNode {
  return useContext(ShellSidebarSlotContext)
}

/** Renders the single HQ sidebar instance at the active dock mount site. */
export function ShellSidebarSlot() {
  return <>{useShellSidebarSlot()}</>
}
