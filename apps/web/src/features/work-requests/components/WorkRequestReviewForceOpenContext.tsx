'use client'

import { createContext, useContext, type ReactNode } from 'react'

const WorkRequestReviewForceOpenContext = createContext<string | null>(null)

export function WorkRequestReviewForceOpenProvider({
  token,
  children,
}: {
  token: string
  children: ReactNode
}) {
  return (
    <WorkRequestReviewForceOpenContext.Provider value={token}>
      {children}
    </WorkRequestReviewForceOpenContext.Provider>
  )
}

export function useWorkRequestReviewForceOpenToken() {
  return useContext(WorkRequestReviewForceOpenContext)
}
