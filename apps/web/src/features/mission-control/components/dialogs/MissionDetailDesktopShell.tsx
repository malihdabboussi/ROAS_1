'use client'

import type { ComponentProps, ReactNode } from 'react'
import { ResizableDivider } from '@/components/layout/ResizableDivider'
import { usePanelResize } from '@/components/layout/usePanelResize'
import type { Mission, MissionDeliverable, MissionSubtask } from '../../types'
import { MissionMenuDropdown } from '../mission-menu/MissionMenuDropdown'
import { ActivityTimeline } from './ActivityTimeline'
import { DeliverablesCarousel } from './DeliverablesCarousel'
import { HumanGateReviewPanel } from './HumanGateReviewPanel'
import { MissionDetailHeader } from './MissionDetailHeader'
import { MissionMetaRow } from './MissionMetaRow'
import { SubtaskDetailContent } from './SubtaskDetailContent'
import { SubtaskDetailHeader } from './SubtaskDetailHeader'
import { SubtasksSection } from './SubtasksSection'

interface MissionDetailDesktopShellProps {
  shellZ: string
  hideMissionSurface: boolean
  onClose: () => void
  title: string
  selectedSubtask: MissionSubtask | null
  subtaskDetailProps: ComponentProps<typeof SubtaskDetailContent> | null
  onBackToMission: () => void
  onTitleChange: (value: string) => void
  onOpenMenu: (anchor: HTMLElement) => void
  menuAnchor: HTMLElement | null
  menuMission: Mission
  onCloseMenu: () => void
  onUpdated: () => void
  onDelete: () => void
  missionMetaProps: ComponentProps<typeof MissionMetaRow>
  subtasksProps: ComponentProps<typeof SubtasksSection>
  accessApprovalCard: ReactNode
  deliverables: MissionDeliverable[]
  onSelectDeliverable: (deliverable: MissionDeliverable) => void
  activityTimelineProps: ComponentProps<typeof ActivityTimeline>
  overlayModals: ReactNode
}

export function MissionDetailDesktopShell({
  shellZ,
  hideMissionSurface,
  onClose,
  title,
  selectedSubtask,
  subtaskDetailProps,
  onBackToMission,
  onTitleChange,
  onOpenMenu,
  menuAnchor,
  menuMission,
  onCloseMenu,
  onUpdated,
  onDelete,
  missionMetaProps,
  subtasksProps,
  accessApprovalCard,
  deliverables,
  onSelectDeliverable,
  activityTimelineProps,
  overlayModals,
}: MissionDetailDesktopShellProps) {
  const { chatWidthPercent, isDragging, containerRef, chatRef, handleMouseDown } = usePanelResize({
    defaultWidthPercent: 62,
    minPercent: 48,
    maxPercent: 78,
  })

  const isActiveHumanGate =
    selectedSubtask?.assignee_type === 'human' && selectedSubtask.status === 'awaiting_human'

  const gateLeadSlot =
    isActiveHumanGate && subtaskDetailProps ? (
      <HumanGateReviewPanel
        subtask={subtaskDetailProps.subtask}
        dependencies={subtaskDetailProps.dependencies}
        agents={subtaskDetailProps.agents}
        userProfile={subtaskDetailProps.userProfile}
        deliverables={subtaskDetailProps.deliverables}
        resourceLinks={subtaskDetailProps.resourceLinks}
        feedback={subtaskDetailProps.feedback}
        approving={subtaskDetailProps.approving}
        sendingFeedback={subtaskDetailProps.sendingFeedback}
        onFeedbackChange={subtaskDetailProps.onFeedbackChange}
        onRequestChanges={subtaskDetailProps.onRequestChanges}
        onApprove={subtaskDetailProps.onApprove}
        compact
        embedded
      />
    ) : null

  return (
    <div className={`fixed inset-0 ${shellZ} flex items-center justify-center`}>
      <div className="bg-modal-overlay absolute inset-0" onClick={onClose} />

      <div
        data-testid="mission-detail-surface"
        className={`surface-card border-border container-modal-3xl rounded-spacing-4 pt-spacing-4 pb-spacing-6 pl-spacing-6 pr-spacing-6 relative z-10 mx-4 flex w-full flex-col overflow-hidden border shadow-xl ${hideMissionSurface ? 'hidden' : ''}`}
      >
        {selectedSubtask ? (
          <SubtaskDetailHeader
            missionTitle={title}
            subtaskTitle={selectedSubtask.title}
            onBack={onBackToMission}
            onClose={onClose}
          />
        ) : (
          <MissionDetailHeader
            title={title}
            onTitleChange={onTitleChange}
            onClose={onClose}
            onOpenMenu={onOpenMenu}
          />
        )}
        {!selectedSubtask && menuAnchor ? (
          <MissionMenuDropdown
            mission={menuMission}
            anchorRef={{ current: menuAnchor }}
            onClose={onCloseMenu}
            onChanged={onUpdated}
            onDelete={() => void onDelete()}
          />
        ) : null}

        <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className="flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden will-change-[width]"
            style={{ width: `${chatWidthPercent}%` }}
          >
            {selectedSubtask ? (
              subtaskDetailProps ? (
                <SubtaskDetailContent {...subtaskDetailProps} showHumanGateInline={false} />
              ) : null
            ) : (
              <div className="py-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden">
                <MissionMetaRow {...missionMetaProps} />
                <SubtasksSection {...subtasksProps} />
                {accessApprovalCard}
              </div>
            )}
            <DeliverablesCarousel
              deliverables={deliverables}
              onSelect={onSelectDeliverable}
              taskSectionChrome={!selectedSubtask}
              defaultCollapsed={!selectedSubtask}
            />
          </div>

          <ResizableDivider
            onMouseDown={handleMouseDown}
            isDragging={isDragging}
            compact
            showGrip={false}
          />

          <div ref={chatRef} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ActivityTimeline
              {...activityTimelineProps}
              className="pb-spacing-2 flex min-h-0 min-w-0 flex-1 flex-col"
              title={isActiveHumanGate ? 'Review' : 'Activity'}
              leadSlot={gateLeadSlot}
              hideEmptyState={isActiveHumanGate}
            />
          </div>
        </div>
      </div>

      {overlayModals}
    </div>
  )
}
