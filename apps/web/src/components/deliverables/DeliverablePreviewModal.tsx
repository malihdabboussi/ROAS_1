'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type {
  DeliverableEntityPreviewRenderer,
  ViewMode,
} from '@/components/deliverables/deliverable-preview-modal.types'
import { DeliverablePreviewActions } from '@/components/deliverables/DeliverablePreviewActions'
import { DeliverablePreviewBody } from '@/components/deliverables/DeliverablePreviewBody'
import { DeliverablePreviewBrainConfirmDialog } from '@/components/deliverables/DeliverablePreviewBrainConfirmDialog'
import { DeliverablePreviewModalHeader } from '@/components/deliverables/DeliverablePreviewModalHeader'
import { DeliverablePreviewModalToolbar } from '@/components/deliverables/DeliverablePreviewModalToolbar'
import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import { useDeliverableBrainMenu } from '@/components/deliverables/use-deliverable-brain-menu'
import { useDeliverableCampaignMenu } from '@/components/deliverables/use-deliverable-campaign-menu'
import { useDeliverableEntityContent } from '@/components/deliverables/use-deliverable-entity-content'
import { useDeliverableExportActions } from '@/components/deliverables/use-deliverable-export-actions'
import { useDeliverableTitleRename } from '@/components/deliverables/use-deliverable-title-rename'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
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
  /** When set, header shows Back (same close as X — returns to parent surface). */
  onBack?: () => void
  backLabel?: string
  presentation?: 'docked' | 'centered'
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
  onBack,
  backLabel = 'Back',
  presentation = 'docked',
}: DeliverablePreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('wide')
  const [expanded, setExpanded] = useState(false)
  const [isMobileToolbar, setIsMobileToolbar] = useState(false)
  const [dockWidth, setDockWidth] = useState(() =>
    typeof window === 'undefined' ? 640 : Math.round(window.innerWidth * 0.45),
  )
  const [resizing, setResizing] = useState(false)
  const [spaceDocActionTarget, setSpaceDocActionTarget] = useState<HTMLDivElement | null>(null)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(dockWidth)
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
    exporting,
    copied,
    setCopied,
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

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      dragStartX.current = event.clientX
      dragStartWidth.current = dockWidth
      setResizing(true)
    },
    [dockWidth],
  )

  useEffect(() => {
    if (!resizing) return
    const onMove = (event: PointerEvent) => {
      const nextWidth = dragStartWidth.current + dragStartX.current - event.clientX
      setDockWidth(Math.min(window.innerWidth * 0.78, Math.max(400, nextWidth)))
    }
    const onUp = () => setResizing(false)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [resizing])

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
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    onClose,
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
  const siblingNavigation = useMemo(() => {
    if (!onSelectSibling) return undefined
    const siblings = siblingDeliverables.filter((item) => item.type === deliverable.type)
    const index = siblings.findIndex((item) => item.id === deliverable.id)
    if (index < 0 || siblings.length < 2) return undefined
    const itemLabel = deliverable.type === 'ad' ? 'ad' : 'deliverable'
    return {
      label: `${index + 1} of ${siblings.length}`,
      itemLabel,
      onPrevious: () => onSelectSibling(siblings[(index - 1 + siblings.length) % siblings.length]!),
      onNext: () => onSelectSibling(siblings[(index + 1) % siblings.length]!),
    }
  }, [deliverable.id, deliverable.type, onSelectSibling, siblingDeliverables])

  const exportMode = isEntityType && entityData != null ? 'entity' : 'text'
  const exportAvailable =
    !entityContentLoading &&
    ((isTextType && !!(deliverable.content || effectiveContent)) ||
      (isEntityType && entityData != null))

  return (
    <div
      data-deliverable-preview-presentation={presentation}
      className={`z-modal-content fixed flex ${
        expanded
          ? 'inset-0 items-stretch justify-end'
          : presentation === 'centered'
            ? 'p-spacing-4 inset-0 items-center justify-center'
            : 'top-spacing-10 mt-spacing-3 bottom-0 left-0 right-0 items-stretch justify-end'
      }`}
    >
      <div className="bg-modal-overlay absolute inset-0" onClick={onClose} />
      {presentation === 'docked' && !expanded ? (
        <ResizableDivider
          onMouseDown={handleResizeStart}
          isDragging={resizing}
          compact
          showGrip={false}
        />
      ) : null}
      <motion.div
        data-deliverable-preview-panel
        initial={presentation === 'docked' ? { x: '100%' } : false}
        animate={{ x: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`surface-card border-border wizard-container-border z-modal-layer-3 relative flex min-h-0 w-full flex-col overflow-hidden border shadow-xl ${
          expanded
            ? 'rounded-none'
            : presentation === 'centered'
              ? 'container-modal-3xl rounded-spacing-4'
              : 'rounded-spacing-4 border-y-0 border-r-0'
        }`}
        style={!expanded && presentation === 'docked' ? { width: dockWidth } : undefined}
      >
        <DeliverablePreviewModalHeader
          {...titleRename}
          onBack={onBack}
          backLabel={backLabel}
          actions={
            <DeliverablePreviewActions
              deliverable={deliverable}
              mode={exportMode}
              copied={copied}
              exporting={exporting}
              exportAvailable={exportAvailable}
              expanded={expanded}
              documentActionTarget={
                <div ref={setSpaceDocActionTarget} className="flex shrink-0 items-center" />
              }
              onCopy={handleCopy}
              onExportMd={handleExportMd}
              onExportPdf={handleExportPdf}
              onEntityExport={handleEntityExport}
              onToggleExpanded={() => setExpanded((value) => !value)}
              onClose={onClose}
            />
          }
        />

        <div className="px-spacing-6 pb-spacing-3 flex flex-shrink-0 items-center justify-between gap-3 overflow-visible">
          <DeliverablePreviewMetaRow agent={agent} deliverable={deliverable} />
          <DeliverablePreviewModalToolbar
            deliverable={deliverable}
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
              spaceDocActionTarget={spaceDocActionTarget}
              renderEntityPreview={renderEntityPreview}
            />
          </div>
        </div>
      </motion.div>

      <DeliverablePreviewBrainConfirmDialog
        confirmBrain={brainMenu.confirmBrain}
        setConfirmBrain={brainMenu.setConfirmBrain}
        brainIngesting={brainMenu.brainIngesting}
        onConfirmIngest={brainMenu.handleBrainIngest}
      />
    </div>
  )
}
