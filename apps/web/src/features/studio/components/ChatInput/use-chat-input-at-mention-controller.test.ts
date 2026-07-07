import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputAtMenuActions } from './use-chat-input-at-menu-actions'
import { useChatInputAtMentionController } from './use-chat-input-at-mention-controller'
import { useChatInputAtMentionData } from './use-chat-input-at-mention-data'
import { useChatInputAtMentionLayout } from './use-chat-input-at-mention-layout'

vi.mock('./use-chat-input-at-mention-data', () => ({
  useChatInputAtMentionData: vi.fn(),
}))

vi.mock('./use-chat-input-at-mention-layout', () => ({
  useChatInputAtMentionLayout: vi.fn(),
}))

vi.mock('./use-chat-input-at-menu-actions', () => ({
  useChatInputAtMenuActions: vi.fn(),
}))

const mockUseChatInputAtMentionData = vi.mocked(useChatInputAtMentionData)
const mockUseChatInputAtMentionLayout = vi.mocked(useChatInputAtMentionLayout)
const mockUseChatInputAtMenuActions = vi.mocked(useChatInputAtMenuActions)

describe('useChatInputAtMentionController', () => {
  let setAtMenuOpen: ReturnType<typeof vi.fn>
  let setAtItems: ReturnType<typeof vi.fn>
  let setAtQuery: ReturnType<typeof vi.fn>
  let setCrossCampaignMode: ReturnType<typeof vi.fn>
  let setCrossCampaignId: ReturnType<typeof vi.fn>
  let setAtMenuTab: ReturnType<typeof vi.fn>
  let setAtArtifactCollapsedByType: ReturnType<typeof vi.fn>
  let setAtArtifactMoreByType: ReturnType<typeof vi.fn>
  let setAtMediaCollapsedByType: ReturnType<typeof vi.fn>
  let setAtMediaMoreByType: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setAtMenuOpen = vi.fn()
    setAtItems = vi.fn()
    setAtQuery = vi.fn()
    setCrossCampaignMode = vi.fn()
    setCrossCampaignId = vi.fn()
    setAtMenuTab = vi.fn()
    setAtArtifactCollapsedByType = vi.fn()
    setAtArtifactMoreByType = vi.fn()
    setAtMediaCollapsedByType = vi.fn()
    setAtMediaMoreByType = vi.fn()

    mockUseChatInputAtMentionData.mockReturnValue({
      atMenuOpen: true,
      setAtMenuOpen,
      atItems: [{ id: 'artifact-1', label: 'Offer', section: 'artifact' }],
      setAtItems,
      atQuery: 'off',
      setAtQuery,
      atDataLoading: false,
      otherCampaigns: [{ id: 'campaign-2', name: 'Other Campaign' }],
      crossCampaignMode: false,
      setCrossCampaignMode,
      crossCampaignId: null,
      setCrossCampaignId,
      crossCampaignItems: [],
      crossCampaignLoading: false,
      syncAtMenuFromComposer: vi.fn(),
    })

    mockUseChatInputAtMentionLayout.mockReturnValue({
      atMenuTab: 'tasks',
      setAtMenuTab,
      atMenuLayout: {
        showSpaceTaskMore: true,
        showMissionMore: false,
      } as never,
      studioAtTabsForMenu: [{ id: 'tasks', label: 'Tasks' }],
      atComposerNavSlice: { kind: 'items', items: [] },
      atArtifactNavRows: [],
      atMediaNavRows: [],
      atNavCount: 1,
      setAtArtifactCollapsedByType,
      setAtArtifactMoreByType,
      setAtMediaCollapsedByType,
      setAtMediaMoreByType,
      setAtMissionsExpanded: vi.fn(),
      setAtSpaceTasksExpanded: vi.fn(),
    })

    mockUseChatInputAtMenuActions.mockReturnValue({
      handleBackFromCrossCampaign: vi.fn(),
      handleAtMenuTabChange: vi.fn(),
      handleToggleArtifactCollapsed: vi.fn(),
      handleShowAllArtifacts: vi.fn(),
      handleToggleMediaCollapsed: vi.fn(),
      handleShowAllMedia: vi.fn(),
    })
  })

  it('maps space tasks and composes @ mention data, layout, and action hooks', () => {
    const textareaRef = createRef<HTMLTextAreaElement>()

    const { result } = renderHook(() =>
      useChatInputAtMentionController({
        campaignId: 'campaign-1',
        textareaRef,
        spaceComposerSpaceTasks: [
          {
            id: 'task-1',
            label: 'Write brief',
            statusLabel: 'Doing',
            statusDotColor: 'accent',
          },
        ],
      }),
    )

    expect(mockUseChatInputAtMentionData).toHaveBeenCalledWith({
      campaignId: 'campaign-1',
      textareaRef,
      spaceTaskMentions: [
        {
          id: 'task-1',
          label: 'Write brief',
          section: 'space-task',
          type: 'Doing',
          spaceTaskStatusColor: 'accent',
        },
      ],
      onActiveTokenSync: expect.any(Function),
    })
    expect(mockUseChatInputAtMentionLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        atItems: [{ id: 'artifact-1', label: 'Offer', section: 'artifact' }],
        atQuery: 'off',
        atMenuOpen: true,
        otherCampaigns: [{ id: 'campaign-2', name: 'Other Campaign' }],
        crossCampaignMode: false,
        crossCampaignId: null,
        spaceTaskMentions: [
          {
            id: 'task-1',
            label: 'Write brief',
            section: 'space-task',
            type: 'Doing',
            spaceTaskStatusColor: 'accent',
          },
        ],
        atHighlight: -1,
        setAtHighlight: expect.any(Function),
      }),
    )
    expect(mockUseChatInputAtMenuActions).toHaveBeenCalledWith({
      setCrossCampaignMode,
      setCrossCampaignId,
      setAtMenuTab,
      setAtHighlight: expect.any(Function),
      setAtArtifactCollapsedByType,
      setAtArtifactMoreByType,
      setAtMediaCollapsedByType,
      setAtMediaMoreByType,
    })

    expect(result.current.atMenuOpen).toBe(true)
    expect(result.current.atMenuTab).toBe('tasks')
    expect(result.current.atNavCount).toBe(1)
    expect(result.current.atHighlight).toBe(-1)
  })
})
