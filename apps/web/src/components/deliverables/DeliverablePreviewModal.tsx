'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  DeliverableEntityPreviewRenderer,
  ViewMode,
} from '@/components/deliverables/deliverable-preview-modal.types'
import { DeliverablePreviewBody } from '@/components/deliverables/DeliverablePreviewBody'
import { DeliverablePreviewBrainConfirmDialog } from '@/components/deliverables/DeliverablePreviewBrainConfirmDialog'
import { DeliverablePreviewExportFooter } from '@/components/deliverables/DeliverablePreviewExportFooter'
import { DeliverablePreviewModalHeader } from '@/components/deliverables/DeliverablePreviewModalHeader'
import { DeliverablePreviewModalToolbar } from '@/components/deliverables/DeliverablePreviewModalToolbar'
import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import { useDeliverableBrainMenu } from '@/components/deliverables/use-deliverable-brain-menu'
import { useDeliverableCampaignMenu } from '@/components/deliverables/use-deliverable-campaign-menu'
import { useDeliverableEntityContent } from '@/components/deliverables/use-deliverable-entity-content'
import { useDeliverableExportActions } from '@/components/deliverables/use-deliverable-export-actions'
import { useDeliverableTitleRename } from '@/components/deliverables/use-deliverable-title-rename'
import type { MissionAgent } from '@/lib/agents/mission-agents-api'
import type { MissionDeliverable } from '@/lib/missions'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import DeliverablePreviewMetaRow from './DeliverablePreviewMetaRow'

export interface DeliverablePreviewModalProps {
  deliverable: MissionDeliverable
  agents: MissionAgent[]
  onClose: () => void
  campaignId?: string | null
  onAddToKnowledge?: (deliverableId: string) => Promise<void>
  knowledgeStatus?: 'idle' | 'ingesting' | 'ingested' | 'disabled'
  /** Hide when deliverable is already opened from that mission's modal */
  hideOpenSourceMission?: boolean
  /** Parent opens mission (e.g. campaign page). If omitted, mission loads inside this flow. */
  onOpenSourceMission?: (missionId: string) => void
  onMissionUpdated?: () => void
  /** After an artifact is moved to a campaign (DB updated); e.g. refresh parent lists / filters. */
  onArtifactCampaignChanged?: () => void
  /** Space id for Space doc deliverables when metadata lacks it (e.g. task modal). */
  fallbackSpaceId?: string | null
  /** Called after the title was renamed and persisted (e.g. refresh parent lists). */
  onDeliverableRenamed?: (title: string) => void
  /** Feature/container-owned entity renderer for non-doc artifact deliverables. */
  renderEntityPreview: DeliverableEntityPreviewRenderer
}

export function DeliverablePreviewModal({
  deliverable,
  agents,
  onClose,
  campaignId = null,
  onAddToKnowledge: _onAddToKnowledge,
  knowledgeStatus: _knowledgeStatus = 'idle',
  hideOpenSourceMission: _hideOpenSourceMission = false,
  onOpenSourceMission: _onOpenSourceMission,
  onMissionUpdated: _onMissionUpdated,
  onArtifactCampaignChanged,
  fallbackSpaceId,
  onDeliverableRenamed,
  renderEntityPreview,
}: DeliverablePreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('wide')
  const [isMobileToolbar, setIsMobileToolbar] = useState(false)
  const titleRename = useDeliverableTitleRename({
    deliverable,
    onDeliverableRenamed,
  })

  const {
    entityTextContent,
    entityData,
    effectiveContent,
    entityContentLoading,
    isEntityType,
    isTextType,
    isTextContent,
    hasSourcePdfFile,
  } = useDeliverableEntityContent(deliverable)

  const {
    contentRef,
    exportFooterTriggerRef,
    exporting,
    copied,
    setCopied,
    exportOpen,
    setExportOpen,
    handleExportPdf,
    handleCopy,
    handleExportMd,
    handleEntityExport,
  } = useDeliverableExportActions({
    deliverable,
    campaignId,
    hasSourcePdfFile,
    isTextType,
    isEntityType,
    entityData,
    entityTextContent,
    effectiveMarkdown: effectiveContent,
  })

  const brainMenu = useDeliverableBrainMenu({
    deliverableTitle: deliverable.title,
    effectiveContent: effectiveContent ?? undefined,
  })

  const campaignMenu = useDeliverableCampaignMenu(deliverable, {
    onCampaignMoved: onArtifactCampaignChanged,
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobileToolbar(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (brainMenu.confirmBrain) return
        if (campaignMenu.campaignDropdownOpen) {
          campaignMenu.setCampaignDropdownOpen(false)
          return
        }
        if (brainMenu.brainDropdownOpen) {
          brainMenu.setBrainDropdownOpen(false)
          return
        }
        if (exportOpen) {
          setExportOpen(false)
          return
        }
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    onClose,
    exportOpen,
    setExportOpen,
    brainMenu.confirmBrain,
    brainMenu.brainDropdownOpen,
    brainMenu.setBrainDropdownOpen,
    campaignMenu.campaignDropdownOpen,
    campaignMenu.setCampaignDropdownOpen,
  ])

  const handleStartConversation = useCallback(() => {
    if (!effectiveContent) return
    const normalized = deliverable.content
      ? normalizeDeliverableContent(deliverable.content)
      : effectiveContent
    const payload = {
      agentKey: 'vibey',
      content: `Read this file @${deliverable.title ?? 'Document'} so we can work & talk about it`,
      documents: [
        {
          filename: `${deliverable.title ?? 'Document'}.md`,
          type: 'text' as const,
          text: normalized,
        },
      ],
    }
    try {
      localStorage.setItem(
        getOrgScopedKey('team-pending-deliverable-message'),
        JSON.stringify(payload),
      )
    } catch {
      /* ignore storage failures */
    }
    openInNewTab('/team?agent=vibey')
  }, [effectiveContent, deliverable.content, deliverable.title])

  const agent = agents.find((a) => a.agent_key === deliverable.agent_key)

  const showExportFooter =
    !entityContentLoading &&
    ((isTextType && !!(deliverable.content || effectiveContent)) ||
      (isEntityType && entityData != null))

  return (
    <div className="z-modal-content fixed inset-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-modal-overlay" onClick={onClose} />
      <div className="surface-card border-border container-modal-3xl wizard-container-border rounded-spacing-4 z-modal-layer-3 relative mx-4 flex min-h-0 w-full flex-col overflow-hidden border shadow-xl">
        <DeliverablePreviewModalHeader {...titleRename} />

        <div className="px-spacing-6 pb-spacing-3 flex flex-shrink-0 items-center justify-between gap-3 overflow-visible">
          <DeliverablePreviewMetaRow agent={agent} deliverable={deliverable} />
          <DeliverablePreviewModalToolbar
            deliverable={deliverable}
            onClose={onClose}
            isTextType={isTextType}
            viewMode={viewMode}
            setViewMode={setViewMode}
            copied={copied}
            effectiveContent={effectiveContent}
            brainButtonRef={brainMenu.brainButtonRef}
            brainDropdownOpen={brainMenu.brainDropdownOpen}
            handleBrainDropdownToggle={brainMenu.handleBrainDropdownToggle}
            brainsLoading={brainMenu.brainsLoading}
            brainDropdownPos={brainMenu.brainDropdownPos}
            isMobileToolbar={isMobileToolbar}
            brainOptions={brainMenu.brainOptions}
            setConfirmBrain={brainMenu.setConfirmBrain}
            setBrainDropdownOpen={brainMenu.setBrainDropdownOpen}
            handleStartConversation={handleStartConversation}
            setCopied={setCopied}
            addToCampaignEligible={campaignMenu.eligible}
            campaignButtonRef={campaignMenu.campaignButtonRef}
            campaignDropdownOpen={campaignMenu.campaignDropdownOpen}
            handleCampaignDropdownToggle={campaignMenu.handleCampaignDropdownToggle}
            campaignsLoading={campaignMenu.campaignsLoading}
            movingToCampaign={campaignMenu.movingToCampaign}
            campaignOptions={campaignMenu.campaignOptions}
            campaignDropdownPos={campaignMenu.campaignDropdownPos}
            campaignAction={campaignMenu.campaignAction}
            setCampaignAction={campaignMenu.setCampaignAction}
            handleSelectCampaign={campaignMenu.handleSelectCampaign}
          />
        </div>

        <div className="border-t-glass" />

        <div className="px-spacing-6 py-spacing-4 relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <DeliverablePreviewBody
              contentRef={contentRef}
              deliverable={deliverable}
              entityContentLoading={entityContentLoading}
              isEntityType={isEntityType}
              isTextContent={isTextContent}
              effectiveContent={effectiveContent}
              viewMode={viewMode}
              fallbackSpaceId={fallbackSpaceId}
              renderEntityPreview={renderEntityPreview}
            />
          </div>
          {showExportFooter ? (
            <DeliverablePreviewExportFooter
              anchorRef={exportFooterTriggerRef}
              exportOpen={exportOpen}
              setExportOpen={setExportOpen}
              mode={isEntityType && entityData != null ? 'entity' : 'text'}
              copied={copied}
              exporting={exporting}
              handleCopy={handleCopy}
              handleExportMd={handleExportMd}
              handleExportPdf={handleExportPdf}
              handleEntityExport={handleEntityExport}
              isMobileLayout={isMobileToolbar}
              entityType={deliverable.type}
            />
          ) : null}
        </div>
      </div>

      <DeliverablePreviewBrainConfirmDialog
        confirmBrain={brainMenu.confirmBrain}
        setConfirmBrain={brainMenu.setConfirmBrain}
        brainIngesting={brainMenu.brainIngesting}
        onConfirmIngest={brainMenu.handleBrainIngest}
      />
    </div>
  )
}
