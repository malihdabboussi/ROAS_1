'use client'

import { useEffect, useRef, useState } from 'react'
import { useCampaignMode } from '../../contexts/CampaignModeContext'
import { sendMessageStreaming } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'
import { ArtifactsTab } from './ArtifactsTab'
import { DashboardTab } from './DashboardTab'
import { LeadsTab } from './LeadsTab'
import { MediaTab } from './MediaTab'
import { PreviewTabToolbar } from './PreviewTabToolbar'
import { ScheduleTab } from './ScheduleTab'
import { SettingsTab } from './SettingsTab'

interface CampaignPreviewPanelProps {
  mobilePreviewMode?: boolean
  /** Team mobile: notify when fullscreen settings opens/closes so header back can pop settings before closing the panel. */
  onMobileSettingsOverlayChange?: (open: boolean) => void
}

export function CampaignPreviewPanel({
  mobilePreviewMode,
  onMobileSettingsOverlayChange,
}: CampaignPreviewPanelProps) {
  const {
    activePreviewTab,
    setActivePreviewTab,
    activeCampaignId,
    activeCampaignName,
    hasSocialContent,
    minimizePanel,
  } = useCampaignMode()

  const activePreviewTabRef = useRef(activePreviewTab)
  activePreviewTabRef.current = activePreviewTab

  const isCampaignMode = activeCampaignId !== null

  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false)
  const [pendingSettingsNav, setPendingSettingsNav] = useState<{
    section?: string
    funnelId?: string
  } | null>(null)

  useEffect(() => {
    const handler = () => {
      setMobileSettingsOpen(true)
    }
    window.addEventListener('mobile-open-settings', handler)
    return () => window.removeEventListener('mobile-open-settings', handler)
  }, [])

  useEffect(() => {
    const handler = () => {
      setMobileSettingsOpen((open) => {
        if (open) {
          const t = activePreviewTabRef.current
          setActivePreviewTab(t === 'settings' ? 'artifacts' : t)
        }
        return false
      })
    }
    window.addEventListener('mobile-artifact-back', handler)
    return () => window.removeEventListener('mobile-artifact-back', handler)
  }, [setActivePreviewTab])

  useEffect(() => {
    onMobileSettingsOverlayChange?.(mobileSettingsOpen)
  }, [mobileSettingsOpen, onMobileSettingsOverlayChange])

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail
      const section =
        typeof d === 'string'
          ? d
          : d && typeof d === 'object' && 'section' in d
            ? (d as { section: string }).section
            : undefined
      const funnelId =
        typeof d === 'object' && d && 'funnelId' in d
          ? (d as { funnelId?: string }).funnelId
          : undefined
      setPendingSettingsNav(section || funnelId ? { section, funnelId } : null)
      setActivePreviewTab('settings')
    }
    window.addEventListener('navigate-settings-section', handler)
    return () => window.removeEventListener('navigate-settings-section', handler)
  }, [setActivePreviewTab])

  useEffect(() => {
    const handler = () => setActivePreviewTab('artifacts')
    window.addEventListener('workflow:open-artifact', handler)
    return () => window.removeEventListener('workflow:open-artifact', handler)
  }, [setActivePreviewTab])

  useEffect(() => {
    const handler = (e: Event) => {
      const { text, artifactHint, bulk } = (e as CustomEvent).detail ?? {}
      if (!activeCampaignId || !text) return
      const activeConvId = useChatStore.getState().activeConversationId
      const hintLabel = artifactHint ? artifactHint.replace(/_/g, ' ') : 'artifact'
      if (bulk) {
        void sendMessageStreaming({
          conversation_id: activeConvId ?? undefined,
          campaign_id: activeCampaignId,
          content: `Build all these strategy notes into real artifacts:\n${text}`,
          system_context:
            'The user clicked "Build All" to convert multiple strategy notes into real artifacts at once. Create each artifact using vibey_backend. Process them sequentially.',
        })
      } else {
        void sendMessageStreaming({
          conversation_id: activeConvId ?? undefined,
          campaign_id: activeCampaignId,
          content: `Build a ${hintLabel} based on this strategy note: "${text}"`,
          system_context: `The user clicked "Build with Vibey" on a strategy note. Create the appropriate ${hintLabel} artifact based on the note content. Use vibey_backend to create the artifact.`,
        })
      }
    }
    window.addEventListener('strategy:request-build', handler as EventListener)
    return () => window.removeEventListener('strategy:request-build', handler as EventListener)
  }, [activeCampaignId])

  useEffect(() => {
    if (activePreviewTab === 'schedule' && !hasSocialContent) {
      setActivePreviewTab('artifacts')
    }
  }, [activePreviewTab, hasSocialContent, setActivePreviewTab])

  useEffect(() => {
    if (activePreviewTab === 'artifacts') {
      useChatStore.getState().clearUnreadArtifacts()
    }
  }, [activePreviewTab])

  useEffect(() => {
    if (activePreviewTab !== 'settings') setPendingSettingsNav(null)
  }, [activePreviewTab])

  if (mobilePreviewMode && mobileSettingsOpen) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <SettingsTab
          campaignId={activeCampaignId!}
          mobileMode
          initialSection={pendingSettingsNav?.section}
          initialFunnelId={pendingSettingsNav?.funnelId}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PreviewTabToolbar
        activeTab={activePreviewTab}
        onTabChange={setActivePreviewTab}
        isCampaignMode={isCampaignMode}
        hasSocialContent={hasSocialContent}
        onMinimize={minimizePanel}
        mobilePreviewMode={!!mobilePreviewMode}
      />

      <div
        className={
          mobilePreviewMode
            ? 'flex min-h-0 flex-1 flex-col px-spacing-2 pb-spacing-2 pt-spacing-1'
            : 'md:pt-spacing-4 md:pb-spacing-4 flex min-h-0 flex-1 flex-col p-3 md:p-0'
        }
      >
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{ display: activePreviewTab === 'artifacts' ? undefined : 'none' }}
        >
          <ArtifactsTab
            key={activeCampaignId}
            campaignId={activeCampaignId!}
            mobilePreviewMode={mobilePreviewMode}
          />
        </div>
        {/* {activePreviewTab === 'workflow' && <WorkflowTab campaignId={activeCampaignId!} />} */}
        {activePreviewTab === 'dashboard' && (
          <DashboardTab campaignId={activeCampaignId!} campaignName={activeCampaignName} />
        )}
        {activePreviewTab === 'leads' && <LeadsTab campaignId={activeCampaignId!} />}
        {activePreviewTab === 'media' && (
          <MediaTab
            key={activeCampaignId}
            campaignId={activeCampaignId!}
            mobilePreviewMode={mobilePreviewMode}
          />
        )}
        {activePreviewTab === 'schedule' && <ScheduleTab campaignId={activeCampaignId!} />}
        {activePreviewTab === 'settings' && (
          <SettingsTab
            campaignId={activeCampaignId!}
            initialSection={pendingSettingsNav?.section}
            initialFunnelId={pendingSettingsNav?.funnelId}
          />
        )}
      </div>
    </div>
  )
}
