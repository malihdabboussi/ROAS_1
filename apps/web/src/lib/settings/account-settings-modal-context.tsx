'use client'

import { createContext, ReactNode, useCallback, useContext, useState } from 'react'

export type AccountSettingsSection =
  | 'profile'
  | 'appearance'
  | 'billing'
  | 'usage'
  | 'organization'

interface AccountSettingsModalContextValue {
  isOpen: boolean
  initialSection: AccountSettingsSection
  openAccountSettings: (section?: AccountSettingsSection) => void
  closeAccountSettings: () => void
}

const AccountSettingsModalContext = createContext<AccountSettingsModalContextValue | null>(null)

export function AccountSettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialSection, setInitialSection] = useState<AccountSettingsSection>('profile')

  const openAccountSettings = useCallback((section: AccountSettingsSection = 'profile') => {
    setInitialSection(section)
    setIsOpen(true)
  }, [])

  const closeAccountSettings = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <AccountSettingsModalContext.Provider
      value={{ isOpen, initialSection, openAccountSettings, closeAccountSettings }}
    >
      {children}
    </AccountSettingsModalContext.Provider>
  )
}

export function useAccountSettingsModal() {
  const context = useContext(AccountSettingsModalContext)
  if (!context) {
    throw new Error('useAccountSettingsModal must be used within AccountSettingsModalProvider')
  }
  return context
}
