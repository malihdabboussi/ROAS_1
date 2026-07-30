import { createElement } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import {
  buildQuickMissionReceipt,
  QuickMissionsHubHost,
  resolveQuickMissionDefaultSpaceId,
} from './QuickMissionsHubHost'

const clients = [
  { spaceId: 'space-1', campaignId: 'campaign-1', title: 'Course One' },
  { spaceId: 'space-2', campaignId: 'campaign-2', title: 'Course Two' },
]

describe('QuickMissionsHubHost', () => {
  const originalLoadSpaces = useSpacesStore.getState().loadSpaces

  afterEach(() => {
    cleanup()
    useSpacesStore.setState({ loadSpaces: originalLoadSpaces })
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
      window.dispatchEvent(new CustomEvent('vibey:open-quick-missions'))
    })

    expect(loadSpaces).toHaveBeenCalledOnce()
  })
})
