import { act, renderHook, waitFor } from '@testing-library/react'
import { useState, type Dispatch, type SetStateAction } from 'react'
import { describe, expect, it } from 'vitest'
import type { SlashItem } from './chat-input-slash-menu'
import {
  useChatInputSlashLayout,
  type UseChatInputSlashLayoutOptions,
} from './use-chat-input-slash-layout'

function slashItem(id: string, type: SlashItem['type']): SlashItem {
  return {
    id,
    key: id,
    name: id,
    description: id,
    type,
  }
}

function useLayoutHarness(
  options: Omit<UseChatInputSlashLayoutOptions, 'setSlashHighlight'> & {
    initialHighlight?: number
  },
) {
  const [slashHighlight, setSlashHighlight] = useState(options.initialHighlight ?? 0)
  const layout = useChatInputSlashLayout({
    ...options,
    slashHighlight,
    setSlashHighlight: setSlashHighlight as Dispatch<SetStateAction<number>>,
  })
  return { slashHighlight, setSlashHighlight, layout }
}

function defaultOptions(
  overrides: Partial<UseChatInputSlashLayoutOptions> & { initialHighlight?: number } = {},
) {
  return {
    slashMenuOpen: true,
    slashItems: [
      ...Array.from({ length: 7 }, (_, index) => slashItem(`skill-${index}`, 'skill')),
      ...Array.from({ length: 6 }, (_, index) => slashItem(`workflow-${index}`, 'workflow')),
    ],
    slashHighlight: 0,
    setSlashHighlight: () => undefined,
    ...overrides,
  }
}

describe('useChatInputSlashLayout', () => {
  it('builds preview-limited skill and workflow sections with more counts', () => {
    const { result } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions(),
    })

    expect(result.current.layout.slashMenuLayout.skillItems).toHaveLength(7)
    expect(result.current.layout.slashMenuLayout.workflowItems).toHaveLength(6)
    expect(result.current.layout.slashMenuLayout.skillVisible).toHaveLength(3)
    expect(result.current.layout.slashMenuLayout.workflowVisible).toHaveLength(3)
    expect(result.current.layout.slashMenuLayout.visibleFlat).toHaveLength(6)
    expect(result.current.layout.slashMenuLayout.skillMoreCount).toBe(4)
    expect(result.current.layout.slashMenuLayout.workflowMoreCount).toBe(3)
    expect(result.current.layout.slashMenuLayout.showSkillMore).toBe(true)
    expect(result.current.layout.slashMenuLayout.showWorkflowMore).toBe(true)
  })

  it('expands sections and resets expansion when slash items change', async () => {
    const { result, rerender } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions(),
    })

    act(() => {
      result.current.layout.setSlashSkillsExpanded(true)
      result.current.layout.setSlashWorkflowsExpanded(true)
    })
    expect(result.current.layout.slashMenuLayout.skillVisible).toHaveLength(7)
    expect(result.current.layout.slashMenuLayout.workflowVisible).toHaveLength(6)

    rerender(
      defaultOptions({
        slashItems: [
          ...Array.from({ length: 7 }, (_, index) => slashItem(`next-skill-${index}`, 'skill')),
          ...Array.from({ length: 6 }, (_, index) =>
            slashItem(`next-workflow-${index}`, 'workflow'),
          ),
        ],
      }),
    )

    await waitFor(() => {
      expect(result.current.layout.slashMenuLayout.skillVisible).toHaveLength(3)
      expect(result.current.layout.slashMenuLayout.workflowVisible).toHaveLength(3)
    })
  })

  it('clamps highlight to the visible item count while the slash menu is open', async () => {
    const { result, rerender } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions({ initialHighlight: 9 }),
    })

    rerender(
      defaultOptions({
        slashItems: [
          slashItem('only-skill', 'skill'),
          slashItem('only-workflow', 'workflow'),
        ],
        initialHighlight: 9,
      }),
    )

    await waitFor(() => {
      expect(result.current.slashHighlight).toBe(1)
    })
  })

  it('moves highlight to zero when the open slash menu has no visible rows', async () => {
    const { result } = renderHook((props) => useLayoutHarness(props), {
      initialProps: defaultOptions({ slashItems: [], initialHighlight: 4 }),
    })

    await waitFor(() => {
      expect(result.current.slashHighlight).toBe(0)
    })
  })
})
