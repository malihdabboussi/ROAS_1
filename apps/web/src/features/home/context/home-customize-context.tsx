'use client'

import { createContext, useContext } from 'react'

const HomeCustomizeContext = createContext(false)

export function HomeCustomizeProvider({
  editing,
  children,
}: {
  editing: boolean
  children: React.ReactNode
}) {
  return <HomeCustomizeContext.Provider value={editing}>{children}</HomeCustomizeContext.Provider>
}

export function useHomeCustomizeEditing(): boolean {
  return useContext(HomeCustomizeContext)
}
