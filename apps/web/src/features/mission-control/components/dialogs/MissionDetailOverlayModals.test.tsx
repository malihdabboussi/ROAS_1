import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Mission, MissionDeliverable } from '../../types'
import { MissionDetailOverlayModals } from './MissionDetailOverlayModals'

vi.mock('@/components/deliverables/DeliverablePreviewModal', () => ({
  DeliverablePreviewModal: ({ presentation }: { presentation?: string }) => (
    <div data-testid="deliverable-preview" data-presentation={presentation} />
  ),
}))
vi.mock('@/components/media/DriveFileBrowserModal', () => ({
  DriveFileBrowserModal: () => null,
}))
vi.mock('@/components/media/DropboxFileBrowserModal', () => ({
  DropboxFileBrowserModal: () => null,
}))
vi.mock('@/components/media/MediaPickerModal', () => ({ MediaPickerModal: () => null }))
vi.mock('./PlanDetailModal', () => ({ PlanDetailModal: () => null }))

const mission = {
  id: 'mission-1',
  campaign_id: 'campaign-1',
  space_id: 'space-1',
} as Mission

const deliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  type: 'doc',
  title: 'Strategy map',
  metadata: { spaceId: 'space-1', spaceItemId: 'item-1' },
} as unknown as MissionDeliverable

describe('MissionDetailOverlayModals', () => {
  afterEach(cleanup)

  it('opens document previews as centered Mission modals', () => {
    render(
      <MissionDetailOverlayModals
        previewDeliverable={deliverable}
        agents={[]}
        effectiveMission={mission}
        onClosePreview={vi.fn()}
        planModalOpen={false}
        planContent={null}
        subtasks={[]}
        onClosePlan={vi.fn()}
        missionStatus="in_progress"
        recommendedHires={[]}
        onApprovePlan={vi.fn()}
        onRejectPlan={vi.fn()}
        approvingPlan={false}
        showDrivePicker={false}
        onCloseDrive={vi.fn()}
        onSelectCloudFile={vi.fn()}
        showDropboxPicker={false}
        onCloseDropbox={vi.fn()}
        showLibraryPicker={false}
        onCloseLibrary={vi.fn()}
        onSelectLibrary={vi.fn()}
      />,
    )

    expect(screen.getByTestId('deliverable-preview').dataset.presentation).toBe('centered')
  })
})
