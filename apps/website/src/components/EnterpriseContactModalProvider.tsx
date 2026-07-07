'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { EnterpriseContactModal } from '@/components/EnterpriseContactModal'

type EnterpriseContactModalContextValue = {
  openEnterpriseContact: () => void
  closeEnterpriseContact: () => void
}

const EnterpriseContactModalContext = createContext<EnterpriseContactModalContextValue | null>(null)

export function useEnterpriseContactModal() {
  const ctx = useContext(EnterpriseContactModalContext)
  if (!ctx)
    throw new Error('useEnterpriseContactModal must be used within EnterpriseContactModalProvider')
  return ctx
}

export function EnterpriseContactModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const openEnterpriseContact = useCallback(() => setOpen(true), [])
  const closeEnterpriseContact = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ openEnterpriseContact, closeEnterpriseContact }),
    [openEnterpriseContact, closeEnterpriseContact],
  )

  return (
    <EnterpriseContactModalContext.Provider value={value}>
      {children}
      <EnterpriseContactModal open={open} onClose={closeEnterpriseContact} />
    </EnterpriseContactModalContext.Provider>
  )
}
