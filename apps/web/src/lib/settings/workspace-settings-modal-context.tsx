'use client'

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react'

export type WorkspaceSettingsSection =
  | 'properties'
  | 'integrations'
  | 'mcp'
  | 'api-keys'
  | 'domains'
  | 'email'
  | 'brain'
  | 'models'
  | 'skill-recommendations'
  | 'autopilot'
  | 'chrome-extension'

export type OpenWorkspaceSettingsOptions = {
  /** When opening Integrations, jump to this integration row (Library tab filtered + scroll). */
  integrationsFocusIntegrationId?: string | null
}

interface WorkspaceSettingsModalContextValue {
  isOpen: boolean
  initialSection: WorkspaceSettingsSection
  integrationsFocusIntegrationId: string | null
  consumeIntegrationsFocusIntegrationId: () => void
  openWorkspaceSettings: (
    section?: WorkspaceSettingsSection,
    options?: OpenWorkspaceSettingsOptions,
  ) => void
  closeWorkspaceSettings: () => void
}

const WorkspaceSettingsModalContext = createContext<WorkspaceSettingsModalContextValue | null>(null)

export function WorkspaceSettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [initialSection, setInitialSection] = useState<WorkspaceSettingsSection>('properties')
  const [integrationsFocusIntegrationId, setIntegrationsFocusIntegrationId] = useState<
    string | null
  >(null)

  const openWorkspaceSettings = useCallback(
    (section: WorkspaceSettingsSection = 'properties', options?: OpenWorkspaceSettingsOptions) => {
      setInitialSection(section)
      setIntegrationsFocusIntegrationId(
        section === 'integrations' ? (options?.integrationsFocusIntegrationId ?? null) : null,
      )
      setIsOpen(true)
    },
    [],
  )

  const consumeIntegrationsFocusIntegrationId = useCallback(() => {
    setIntegrationsFocusIntegrationId(null)
  }, [])

  const closeWorkspaceSettings = useCallback(() => {
    setIsOpen(false)
    setIntegrationsFocusIntegrationId(null)
  }, [])

  const value = useMemo(
    () => ({
      isOpen,
      initialSection,
      integrationsFocusIntegrationId,
      consumeIntegrationsFocusIntegrationId,
      openWorkspaceSettings,
      closeWorkspaceSettings,
    }),
    [
      isOpen,
      initialSection,
      integrationsFocusIntegrationId,
      consumeIntegrationsFocusIntegrationId,
      openWorkspaceSettings,
      closeWorkspaceSettings,
    ],
  )

  return (
    <WorkspaceSettingsModalContext.Provider value={value}>
      {children}
    </WorkspaceSettingsModalContext.Provider>
  )
}

export function useWorkspaceSettingsModal() {
  const context = useContext(WorkspaceSettingsModalContext)
  if (!context) {
    throw new Error('useWorkspaceSettingsModal must be used within WorkspaceSettingsModalProvider')
  }
  return context
}
