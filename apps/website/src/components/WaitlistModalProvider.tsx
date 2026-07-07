'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { WaitlistModal } from '@/components/WaitlistModal'

type WaitlistModalContextValue = {
  openWaitlist: (notes?: string) => void
  closeWaitlist: () => void
}

const WaitlistModalContext = createContext<WaitlistModalContextValue | null>(null)

export function useWaitlistModal() {
  const ctx = useContext(WaitlistModalContext)
  if (!ctx) throw new Error('useWaitlistModal must be used within WaitlistModalProvider')
  return ctx
}

export function WaitlistModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pendingMessage, setPendingMessage] = useState('')

  const openWaitlist = useCallback((notes?: string) => {
    setPendingMessage(notes ?? '')
    setOpen(true)
  }, [])

  const closeWaitlist = useCallback(() => {
    setOpen(false)
    setPendingMessage('')
  }, [])

  const value = useMemo(() => ({ openWaitlist, closeWaitlist }), [openWaitlist, closeWaitlist])

  return (
    <WaitlistModalContext.Provider value={value}>
      {children}
      <WaitlistModal open={open} onClose={closeWaitlist} pendingMessage={pendingMessage} />
    </WaitlistModalContext.Provider>
  )
}
