import { type MutableRefObject } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChatInputSlashData } from './use-chat-input-slash-data'

function valueRef(value: string): MutableRefObject<string> {
  return { current: value }
}

function defaultFetch(path: string): unknown {
  if (path === '/api/agents/vibey/workflows') {
    return [
      {
        id: 'workflow-1',
        workflow_key: 'brainstorm',
        name: 'Brainstorm',
        description: 'Start a brainstorm',
      },
    ]
  }
  if (path === '/api/agents/skill-catalog/skills') {
    return [
      {
        id: 'skill-1',
        skill_key: 'brief',
        name: 'Brief',
        description: 'Write a brief',
      },
      {
        id: 'skill-2',
        skill_key: 'blocked',
        name: 'Blocked',
        description: 'Disabled skill',
        is_enabled: false,
      },
    ]
  }
  throw new Error(`Unexpected path ${path}`)
}

describe('useChatInputSlashData', () => {
  it('loads agent skills and workflows, stores all items, and filters the active slash query', async () => {
    const fetchJson = vi.fn(async (path: string) => defaultFetch(path))
    const loadCached = vi.fn(async (_key, fetcher: () => Promise<unknown>) => fetcher())
    const composerValueRef = valueRef('/br')

    const { result } = renderHook(() =>
      useChatInputSlashData({
        agentKey: 'vibey',
        valueRef: composerValueRef,
        fetchJson,
        loadCached,
      }),
    )

    await waitFor(() => {
      expect(result.current.allSlashItems.map((item) => item.id)).toEqual([
        'skill-1',
        'skill-2',
        'workflow-1',
      ])
    })

    expect(result.current.slashMenuOpen).toBe(true)
    expect(result.current.slashHighlight).toBe(0)
    expect(result.current.slashItems.map((item) => item.id)).toEqual(['skill-1', 'workflow-1'])
    expect(loadCached).toHaveBeenCalledWith('agent-workflows:vibey', expect.any(Function), {
      ttlMs: 300_000,
    })
    expect(loadCached).toHaveBeenCalledWith('skill-catalog:skills', expect.any(Function), {
      ttlMs: 300_000,
    })
    expect(fetchJson).toHaveBeenCalledWith('/api/agents/vibey/workflows')
    expect(fetchJson).toHaveBeenCalledWith('/api/agents/skill-catalog/skills')
  })

  it('keeps fulfilled skills when workflow loading fails', async () => {
    const fetchJson = vi.fn(async (path: string) => {
      if (path.endsWith('/workflows')) throw new Error('workflow load failed')
      return defaultFetch(path)
    })
    const loadCached = vi.fn(async (_key, fetcher: () => Promise<unknown>) => fetcher())

    const { result } = renderHook(() =>
      useChatInputSlashData({
        agentKey: 'vibey',
        valueRef: valueRef('/br'),
        fetchJson,
        loadCached,
      }),
    )

    await waitFor(() => {
      expect(result.current.allSlashItems.map((item) => item.id)).toEqual(['skill-1', 'skill-2'])
    })
    expect(result.current.slashItems.map((item) => item.id)).toEqual(['skill-1'])
  })

  it('closes the menu when the caret is not in a slash token', () => {
    const { result } = renderHook(() =>
      useChatInputSlashData({
        agentKey: 'vibey',
        valueRef: valueRef('plain text'),
        fetchJson: vi.fn(async (path: string) => defaultFetch(path)),
        loadCached: vi.fn(async (_key, fetcher: () => Promise<unknown>) => fetcher()),
      }),
    )

    act(() => result.current.syncSlashMenuFromComposer('/br', '/br'.length))
    act(() => result.current.syncSlashMenuFromComposer('plain text', 'plain text'.length))

    expect(result.current.slashMenuOpen).toBe(false)
  })
})
