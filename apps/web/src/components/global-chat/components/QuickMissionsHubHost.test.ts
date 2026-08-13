import { createElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { openQuickMissions, useQuickMissionsLauncherStore } from '@/lib/missions'
import {
  buildQuickMissionReceipt,
  QuickMissionsHubHost,
  resolveQuickMissionDefaultSpaceId,
} from './QuickMissionsHubHost'

const mocks = vi.hoisted(() => ({
  createNewConversation: vi.fn(),
  persistQuickMissionReceipt: vi.fn(),
  push: vi.fn(),
  modalProps: null as Record<string, unknown> | null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/lib/conversations', () => ({
  createNewConversation: mocks.createNewConversation,
  persistQuickMissionReceipt: mocks.persistQuickMissionReceipt,
}))

vi.mock('@/features/spaces/components/playbooks/QuickMissionsHubModal', () => ({
  QuickMissionsHubModal: (props: Record<string, unknown>) => {
    mocks.modalProps = props
    return null
  },
}))

const clients = [
  { spaceId: 'space-1', campaignId: 'campaign-1', title: 'Course One' },
  { spaceId: 'space-2', campaignId: 'campaign-2', title: 'Course Two' },
]

describe('QuickMissionsHubHost', () => {
  const originalLoadSpaces = useSpacesStore.getState().loadSpaces

  afterEach(() => {
    cleanup()
    useSpacesStore.setState({ loadSpaces: originalLoadSpaces })
    useChatStore.setState({
      activeConversationId: null,
      conversations: [],
      messagesByConversation: {},
    })
    useQuickMissionsLauncherStore.setState({ open: false, playbookKey: null })
    vi.clearAllMocks()
    mocks.modalProps = null
  })

  it('prefers attached Space context and falls back to attached conversation campaign', () => {
    expect(
      resolveQuickMissionDefaultSpaceId({
        clients,
        contextSpaceId: 'space-2',
        contextCampaignId: 'campaign-1',
        activeSpaceId: 'space-1',
      }),
    ).toBe('space-2')

    expect(
      resolveQuickMissionDefaultSpaceId({
        clients,
        conversationCampaignId: 'campaign-2',
        activeSpaceId: 'space-1',
      }),
    ).toBe('space-2')
  })

  it('builds an assistant receipt linked to the launched mission', () => {
    expect(buildQuickMissionReceipt('mission 1', 'Static Ad Production', 'conversation-1')).toEqual(
      expect.objectContaining({
        id: 'mission 1',
        conversation_id: 'conversation-1',
        role: 'assistant',
        content: 'Quick Mission started: **Static Ad Production**.',
        metadata: expect.objectContaining({
          quick_mission_receipt: true,
          mission_id: 'mission 1',
          content_blocks_ordered: expect.arrayContaining([
            expect.objectContaining({
              type: 'artifact_preview',
              artifactType: 'mission',
              artifactId: 'mission 1',
            }),
          ]),
        }),
      }),
    )
  })

  it('loads client Spaces when Quick Missions opens', () => {
    const loadSpaces = vi.fn(async () => undefined)
    useSpacesStore.setState({ spaces: [], activeSpaceId: null, loadSpaces })
    render(createElement(QuickMissionsHubHost))

    act(() => {
      openQuickMissions()
    })

    expect(loadSpaces).toHaveBeenCalledOnce()
    expect(mocks.modalProps).toMatchObject({ open: true, initialPlaybookKey: null })
  })

  it('creates and opens a conversation before a blank-chat mission starts', async () => {
    mocks.createNewConversation.mockResolvedValue({ id: 'conversation-new-chat' })
    mocks.persistQuickMissionReceipt.mockResolvedValue({
      id: 'receipt-1',
      created_at: '2026-08-13T20:00:00.000Z',
    })
    useSpacesStore.setState({ spaces: [], activeSpaceId: null, loadSpaces: vi.fn() })
    render(createElement(QuickMissionsHubHost))

    const resolveSourceConversation = mocks.modalProps?.onResolveSourceConversation as (
      input: Record<string, string>,
    ) => Promise<string>
    const onStarted = mocks.modalProps?.onStarted as (
      missionId: string,
      missionTitle: string,
      spaceId: string,
      sourceConversationId: string,
    ) => Promise<void>

    let conversationId = ''
    await act(async () => {
      conversationId = await resolveSourceConversation({
        missionTitle: 'Client Strategy',
        campaignId: 'campaign-1',
        spaceId: 'space-1',
      })
    })

    expect(mocks.createNewConversation).toHaveBeenCalledWith({
      title: 'Client Strategy',
      campaign_id: 'campaign-1',
      metadata: { space_id: 'space-1' },
    })
    expect(conversationId).toBe('conversation-new-chat')
    expect(useChatStore.getState().activeConversationId).toBe('conversation-new-chat')
    expect(mocks.push).toHaveBeenCalledWith('/home?conv=conversation-new-chat')

    await act(async () => {
      await onStarted('mission-1', 'Client Strategy', 'space-1', conversationId)
    })

    expect(mocks.persistQuickMissionReceipt).toHaveBeenCalledWith('conversation-new-chat', {
      mission_id: 'mission-1',
      mission_title: 'Client Strategy',
      space_id: 'space-1',
    })
    expect(useChatStore.getState().messagesByConversation['conversation-new-chat']).toEqual([
      expect.objectContaining({ id: 'receipt-1', conversation_id: 'conversation-new-chat' }),
    ])
  })
})
