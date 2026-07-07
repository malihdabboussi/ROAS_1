'use client'

import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { WorkspaceSettingsModalProvider } from '@web/features/settings/contexts/WorkspaceSettingsModalContext'
import { VoiceApprovalProvider } from '@web/features/team/components/voice/VoiceApprovalContext'

export function SkillBuilderChatProviders({ children }: { children: ReactNode }) {
  return (
    <WorkspaceSettingsModalProvider>
      <VoiceApprovalProvider value={null}>{children}</VoiceApprovalProvider>
      <Toaster position="top-right" richColors closeButton />
    </WorkspaceSettingsModalProvider>
  )
}
