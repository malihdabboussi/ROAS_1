'use client'

import { createContext, useContext } from 'react'

export type HomeDashboardVisualVariant = 'default' | 'v4'

const HomeDashboardVisualContext = createContext<HomeDashboardVisualVariant>('default')

export function HomeDashboardVisualProvider({
  variant,
  children,
}: {
  variant: HomeDashboardVisualVariant
  children: React.ReactNode
}) {
  return (
    <HomeDashboardVisualContext.Provider value={variant}>
      {children}
    </HomeDashboardVisualContext.Provider>
  )
}

export function useHomeDashboardVisual() {
  return useContext(HomeDashboardVisualContext)
}
