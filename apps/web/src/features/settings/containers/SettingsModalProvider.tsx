'use client'

import { useEffect } from 'react'
import {
  WorkspaceSettingsModalProvider,
  useWorkspaceSettingsModal,
} from '@/lib/settings/workspace-settings-modal-context'
import {
  AccountSettingsModalProvider,
  useAccountSettingsModal,
  type AccountSettingsSection,
} from '../contexts/AccountSettingsModalContext'
import { AccountSettingsModal } from './AccountSettingsModal'
import { WorkspaceSettingsModal } from './WorkspaceSettingsModal'

function SettingsModals() {
  const {
    isOpen: accountOpen,
    initialSection: accountSection,
    openAccountSettings,
    closeAccountSettings,
  } = useAccountSettingsModal()

  const {
    isOpen: workspaceOpen,
    initialSection: workspaceSection,
    openWorkspaceSettings,
    closeWorkspaceSettings,
  } = useWorkspaceSettingsModal()

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (detail === 'integrations') {
        openWorkspaceSettings('integrations')
        return
      }
      openAccountSettings((detail as AccountSettingsSection) ?? 'profile')
    }
    window.addEventListener('open-account-settings', handler)
    return () => window.removeEventListener('open-account-settings', handler)
  }, [openAccountSettings, openWorkspaceSettings])

  return (
    <>
      {accountOpen && (
        <AccountSettingsModal
          open={accountOpen}
          onClose={closeAccountSettings}
          initialSection={accountSection}
        />
      )}
      {workspaceOpen && (
        <WorkspaceSettingsModal
          open={workspaceOpen}
          onClose={closeWorkspaceSettings}
          initialSection={workspaceSection}
        />
      )}
    </>
  )
}

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <AccountSettingsModalProvider>
      <WorkspaceSettingsModalProvider>
        {children}
        <SettingsModals />
      </WorkspaceSettingsModalProvider>
    </AccountSettingsModalProvider>
  )
}
