import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AtMentionItem } from './chat-input-at-mentions'
import {
  useChatInputAtMentionLayout,
  type UseChatInputAtMentionLayoutOptions,
} from './use-chat-input-at-mention-layout'

function item(
  id: string,
  section: AtMentionItem['section'] = 'artifact',
  type = section === 'media' ? 'image/png' : 'offer',
): AtMentionItem {
  return { id, label: id, section, type }
}

function useLayoutHarness(
  options: Omit<UseChatInputAtMentionLayoutOptions, 'setAtHighlight'> & {
    initialHighlight?: number
  },
) {
  const [atHighlight, setAtHighlight] = useState(options.initialHighlight ?? -1)
  const resetAtHighlight = useCallback(() => setAtHighlight(-1), [])
  const layout = useChatInputAtMentionLayout({
    ...options,
    atHighlight,
    setAtHighlight: setAtHighlight as Dispatch<SetStateAction<number>>,
  })
  return { atHighlight, setAtHighlight, resetAtHighlight, layout }
}

function defaultOptions(
  overrides: Partial<UseChatInputAtMentionLayoutOptions> & { initialHighlight?: number } = {},
) {
  return {
    atItems: [item('offer-1')],
    atQuery: '',
    atMenuOpen: false,
    otherCampaigns: [],
    crossCampaignMode: false,
    crossCampaignId: null,
    spaceTaskMentions: [],
    atHighlight: -1,
    setAtHighlight: () => undefined,
    ...overrides,
  }
}

describe('useChatInputAtMentionLayout', () => {
  it('builds menu tabs and resets to People when the menu opens', async () => {
    const spaceTask = item('task-1', 'space-task', 'todo')
    const { result, rerender } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions({
        atMenuOpen: false,
        atItems: [spaceTask, item('offer-1'), item('media-1', 'media')],
        otherCampaigns: [{ id: 'campaign-2', name: 'Campaign Two' }],
        spaceTaskMentions: [spaceTask],
        initialHighlight: 3,
      }),
    })

    expect(result.current.layout.studioAtTabsForMenu.map((tab) => tab.id)).toEqual([
      'people',
      'tasks',
      'artifacts',
      'media',
      'missions',
      'campaigns',
    ])
    expect(result.current.layout.atMenuTab).toBe('people')

    rerender(
      defaultOptions({
        atMenuOpen: true,
        atItems: [spaceTask, item('offer-1'), item('media-1', 'media')],
        otherCampaigns: [{ id: 'campaign-2', name: 'Campaign Two' }],
        spaceTaskMentions: [spaceTask],
        initialHighlight: 3,
      }),
    )

    await waitFor(() => {
      expect(result.current.layout.atMenuTab).toBe('people')
      expect(result.current.atHighlight).toBe(-1)
    })
  })

  it('filters campaign matches and switches nav slices by active tab', () => {
    const { result } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions({
        atQuery: 'campaign_two',
        atItems: [item('offer-1')],
        otherCampaigns: [
          { id: 'campaign-2', name: 'Campaign Two' },
          { id: 'campaign-3', name: 'Other Campaign' },
        ],
      }),
    })

    act(() => result.current.layout.setAtMenuTab('campaigns'))

    expect(result.current.layout.atComposerNavSlice).toEqual({
      kind: 'campaigns',
      items: [{ id: 'campaign-2', name: 'Campaign Two' }],
    })
    expect(result.current.layout.atNavCount).toBe(1)
  })

  it('uses cross-campaign tabs and restores People after exiting cross-campaign mode', async () => {
    const spaceTask = item('task-1', 'space-task', 'todo')
    const { result, rerender } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions({
        atMenuOpen: true,
        crossCampaignMode: true,
        crossCampaignId: 'campaign-2',
        atItems: [item('cross-media', 'media')],
        spaceTaskMentions: [spaceTask],
      }),
    })

    expect(result.current.layout.studioAtTabsForMenu.map((tab) => tab.id)).toEqual([
      'artifacts',
      'media',
      'missions',
    ])

    act(() => result.current.layout.setAtMenuTab('media'))
    expect(result.current.layout.atComposerNavSlice).toEqual({
      kind: 'items',
      items: [expect.objectContaining({ id: 'cross-media' })],
      crossCampaignId: 'campaign-2',
    })

    rerender(
      defaultOptions({
        atMenuOpen: true,
        crossCampaignMode: false,
        crossCampaignId: null,
        atItems: [spaceTask, item('offer-1')],
        spaceTaskMentions: [spaceTask],
      }),
    )

    await waitFor(() => {
      expect(result.current.layout.atMenuTab).toBe('people')
      expect(result.current.atHighlight).toBe(-1)
    })
  })

  it('resets expanded preview state when items change', async () => {
    const firstItems = Array.from({ length: 7 }, (_, index) =>
      item(`mission-${index}`, 'mission', 'todo'),
    )
    const nextItems = Array.from({ length: 7 }, (_, index) =>
      item(`next-mission-${index}`, 'mission', 'todo'),
    )
    const { result, rerender } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions({ atItems: firstItems }),
    })

    act(() => {
      result.current.layout.setAtMenuTab('missions')
      result.current.layout.setAtMissionsExpanded(true)
    })
    expect(result.current.layout.atMenuLayout.showMissionMore).toBe(false)

    rerender(defaultOptions({ atItems: nextItems }))

    await waitFor(() => {
      expect(result.current.layout.atMenuLayout.showMissionMore).toBe(true)
    })
  })
})
