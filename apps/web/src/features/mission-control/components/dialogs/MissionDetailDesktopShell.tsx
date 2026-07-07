import type { ComponentProps, ReactNode } from 'react'
import type { Mission, MissionDeliverable } from '../../types'
import { MissionMenuDropdown } from '../mission-menu/MissionMenuDropdown'
import { ActivityTimeline } from './ActivityTimeline'
import { DeliverablesCarousel } from './DeliverablesCarousel'
import { MissionDetailHeader } from './MissionDetailHeader'
import { MissionMetaRow } from './MissionMetaRow'
import { SubtasksSection } from './SubtasksSection'

interface MissionDetailDesktopShellProps {
  shellZ: string
  onClose: () => void
  title: string
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
  onClose,
  title,
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
  return (
    <div className={`fixed inset-0 ${shellZ} flex items-center justify-center`}>
      <div className="absolute inset-0 bg-modal-overlay" onClick={onClose} />

      <div className="surface-card border-border container-modal-3xl rounded-spacing-4 pt-spacing-4 pb-spacing-6 pl-spacing-6 pr-spacing-6 relative z-10 mx-4 flex w-full flex-col overflow-hidden border shadow-xl">
        <MissionDetailHeader
          title={title}
          onTitleChange={onTitleChange}
          onClose={onClose}
          onOpenMenu={onOpenMenu}
        />
        {menuAnchor ? (
          <MissionMenuDropdown
            mission={menuMission}
            anchorRef={{ current: menuAnchor }}
            onClose={onCloseMenu}
            onChanged={onUpdated}
            onDelete={() => void onDelete()}
          />
        ) : null}

        <div className="flex min-h-0 flex-1">
          <div className="pr-spacing-32 flex min-w-0 flex-[7] flex-col overflow-hidden">
            <div className="py-spacing-4 flex min-h-0 flex-1 flex-col overflow-hidden">
              <MissionMetaRow {...missionMetaProps} />
              <SubtasksSection {...subtasksProps} />
              {accessApprovalCard}
            </div>
            <DeliverablesCarousel deliverables={deliverables} onSelect={onSelectDeliverable} />
          </div>
          <ActivityTimeline {...activityTimelineProps} />
        </div>
      </div>

      {overlayModals}
    </div>
  )
}
