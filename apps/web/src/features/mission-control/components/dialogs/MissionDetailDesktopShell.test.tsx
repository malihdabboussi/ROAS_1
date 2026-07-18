import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MissionDetailDesktopShell } from './MissionDetailDesktopShell'

vi.mock('@/components/layout/ResizableDivider', () => ({
  ResizableDivider: () => null,
}))
vi.mock('@/components/layout/usePanelResize', () => ({
  usePanelResize: () => ({
    chatWidthPercent: 62,
    isDragging: false,
    containerRef: { current: null },
    chatRef: { current: null },
    handleMouseDown: vi.fn(),
  }),
}))
vi.mock('../mission-menu/MissionMenuDropdown', () => ({
  MissionMenuDropdown: () => null,
}))
vi.mock('./ActivityTimeline', () => ({ ActivityTimeline: () => null }))
vi.mock('./DeliverablesCarousel', () => ({
  DeliverablesCarousel: ({ defaultCollapsed }: { defaultCollapsed?: boolean }) => (
    <div data-testid="deliverables" data-collapsed={String(defaultCollapsed)} />
  ),
}))
vi.mock('./HumanGateReviewPanel', () => ({ HumanGateReviewPanel: () => null }))
vi.mock('./MissionDetailHeader', () => ({ MissionDetailHeader: () => null }))
vi.mock('./MissionMetaRow', () => ({ MissionMetaRow: () => null }))
vi.mock('./SubtaskDetailContent', () => ({ SubtaskDetailContent: () => null }))
vi.mock('./SubtaskDetailHeader', () => ({ SubtaskDetailHeader: () => null }))
vi.mock('./SubtasksSection', () => ({ SubtasksSection: () => null }))

const baseProps = {
  shellZ: 'z-50',
  hideMissionSurface: false,
  onClose: vi.fn(),
  title: 'Webinar Fulfillment',
  selectedSubtask: null,
  subtaskDetailProps: null,
  onBackToMission: vi.fn(),
  onTitleChange: vi.fn(),
  onOpenMenu: vi.fn(),
  menuAnchor: null,
  menuMission: {} as never,
  onCloseMenu: vi.fn(),
  onUpdated: vi.fn(),
  onDelete: vi.fn(),
  missionMetaProps: {} as never,
  subtasksProps: {} as never,
  accessApprovalCard: null,
  deliverables: [],
  onSelectDeliverable: vi.fn(),
  activityTimelineProps: {} as never,
  overlayModals: <div data-testid="deliverable-dock" />,
}

describe('MissionDetailDesktopShell', () => {
  afterEach(cleanup)

  it('hides the mission surface while preserving the deliverable dock', () => {
    const { rerender } = render(<MissionDetailDesktopShell {...baseProps} />)

    expect(screen.getByTestId('mission-detail-surface').className.split(' ')).not.toContain(
      'hidden',
    )

    rerender(<MissionDetailDesktopShell {...baseProps} hideMissionSurface />)

    expect(screen.getByTestId('mission-detail-surface').className.split(' ')).toContain('hidden')
    expect(screen.getByTestId('deliverable-dock')).toBeTruthy()
  })

  it('starts parent mission deliverables collapsed so subtasks retain the panel', () => {
    render(<MissionDetailDesktopShell {...baseProps} />)

    expect(screen.getByTestId('deliverables').getAttribute('data-collapsed')).toBe('true')
  })
})
