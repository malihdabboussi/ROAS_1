import type { ComponentProps, Dispatch, ReactNode, SetStateAction } from 'react'
import { ArrowLeft, Clock3, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import type { MissionDeliverable, MissionStatus, MissionSubtask } from '../../types'
import { ActivityTimeline } from './ActivityTimeline'
import { DeliverablesCarousel } from './DeliverablesCarousel'
import { MissionMetaRow } from './MissionMetaRow'
import { SubtaskDetailContent } from './SubtaskDetailContent'
import { SubtasksSection } from './SubtasksSection'

interface MissionDetailMobileShellProps {
  shellZ: string
  mobileScreen: 'detail' | 'activity'
  setMobileScreen: Dispatch<SetStateAction<'detail' | 'activity'>>
  mobileMenuOpen: boolean
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>
  title: string
  selectedSubtask: MissionSubtask | null
  subtaskDetailProps: ComponentProps<typeof SubtaskDetailContent> | null
  onBackToMission: () => void
  onClose: () => void
  currentStatus: MissionStatus
  onRetry: () => Promise<void>
  onArchive: () => void
  onDelete: () => void
  missionMetaProps: ComponentProps<typeof MissionMetaRow>
  subtasksProps: ComponentProps<typeof SubtasksSection>
  accessApprovalCard: ReactNode
  deliverables: MissionDeliverable[]
  onSelectDeliverable: (deliverable: MissionDeliverable) => void
  missionId: string
  activityTimelineProps: ComponentProps<typeof ActivityTimeline>
  overlayModals: ReactNode
}

export function MissionDetailMobileShell({
  shellZ,
  mobileScreen,
  setMobileScreen,
  mobileMenuOpen,
  setMobileMenuOpen,
  title,
  selectedSubtask,
  subtaskDetailProps,
  onBackToMission,
  onClose,
  currentStatus,
  onRetry,
  onArchive,
  onDelete,
  missionMetaProps,
  subtasksProps,
  accessApprovalCard,
  deliverables,
  onSelectDeliverable,
  missionId,
  activityTimelineProps,
  overlayModals,
}: MissionDetailMobileShellProps) {
  return (
    <div className={`fixed inset-0 ${shellZ} bg-[var(--color-background)] md:hidden`}>
      {mobileScreen === 'detail' ? (
        <div className="flex h-full flex-col">
          <div className="border-b-glass flex items-center justify-between px-3 py-3">
            <button
              type="button"
              onClick={selectedSubtask ? onBackToMission : onClose}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="body-2 min-w-0 flex-1 truncate px-2 text-center">
              {selectedSubtask?.title || title || 'Mission'}
            </span>
            <div className="flex items-center gap-2">
              {!selectedSubtask ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                    className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                    aria-label="Mission actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {mobileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[60]"
                        onClick={() => setMobileMenuOpen(false)}
                      />
                      <div className="dropdown-menu-solid p-spacing-2 absolute right-0 top-full z-[70] mt-1 min-w-36">
                        <div className="space-y-spacing-1">
                          {(currentStatus === 'blocked' ||
                            currentStatus === 'archived' ||
                            currentStatus === 'inbox' ||
                            currentStatus === 'error' ||
                            currentStatus === 'failed') && (
                            <button
                              type="button"
                              onClick={async () => {
                                setMobileMenuOpen(false)
                                await onRetry()
                              }}
                              className="body-3 hover:bg-hover-subtle rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center gap-2 text-left"
                            >
                              <RefreshCw className="icon-sm" />
                              Retry
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false)
                              onArchive()
                            }}
                            className="body-3 hover:bg-hover-subtle rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center gap-2 text-left"
                          >
                            <Clock3 className="icon-sm" />
                            {currentStatus === 'archived' ? 'Unarchive' : 'Archive'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false)
                              onDelete()
                            }}
                            className="body-3 hover:bg-hover-subtle rounded-spacing-1 px-spacing-2 py-spacing-2 text-destructive flex w-full items-center gap-2 text-left"
                          >
                            <Trash2 className="icon-sm" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setMobileScreen('activity')}
                className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
                aria-label="Open timeline"
              >
                <Clock3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {selectedSubtask ? (
              subtaskDetailProps ? (
                <SubtaskDetailContent {...subtaskDetailProps} />
              ) : null
            ) : (
              <>
                <div className="card-glass p-spacing-3">
                  <MissionMetaRow {...missionMetaProps} />
                </div>
                <SubtasksSection {...subtasksProps} />
                {accessApprovalCard}
              </>
            )}
            <DeliverablesCarousel
              deliverables={deliverables}
              onSelect={onSelectDeliverable}
              missionId={missionId}
              taskSectionChrome={!selectedSubtask}
              defaultCollapsed={!selectedSubtask}
            />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <div className="border-b-glass flex items-center px-3 py-3">
            <button
              type="button"
              onClick={() => setMobileScreen('detail')}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Back to detail"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="body-2 min-w-0 flex-1 truncate px-2 text-center">Activity</span>
            <div className="w-spacing-8" />
          </div>
          <ActivityTimeline {...activityTimelineProps} className="flex min-h-0 flex-1 flex-col" />
        </div>
      )}

      {overlayModals}
    </div>
  )
}
