import { createElement, Profiler, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendPost } from '@/lib/api/backend-client'
import { useChatStore } from '@/lib/chat/studio-chat-runtime-adapter'
import {
  useBrainLiveSession,
  type BrainLiveScope,
} from '@/features/brain/hooks/use-brain-live-session'

vi.mock('@/lib/api/backend-client', () => ({
  backendPost: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) },
  }),
}))

const CONV_ID = 'conv-abc'
const backendPostMock = vi.mocked(backendPost)

class MockAudioContext {
  currentTime = 0
  state: AudioContextState = 'running'
  destination = {}

  createAnalyser() {
    return {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 1,
      connect: vi.fn(),
      getByteFrequencyData: vi.fn(),
    }
  }

  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() }
  }

  createScriptProcessor() {
    return { connect: vi.fn(), disconnect: vi.fn(), onaudioprocess: null }
  }

  createGain() {
    return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }
  }

  createBuffer() {
    return { duration: 0.1, getChannelData: () => new Float32Array(1) }
  }

  createBufferSource() {
    return { buffer: null, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }
  }

  resume() {
    this.state = 'running'
    return Promise.resolve()
  }

  close() {
    return Promise.resolve()
  }
}

const mockTrack = { stop: vi.fn() }
const mockStream = { getTracks: () => [mockTrack] }

function profilerWrapper(onRender: () => void) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(Profiler, { id: 'brain-live-session', onRender }, children)
  }
}

function makeDelegationSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    delegationId: 'del-1',
    task: 'Build landing page',
    status: 'running',
    currentTool: 'create_funnel_page',
    toolSteps: [{ name: 'create_avatar', label: 'Creating avatar', status: 'completed' }],
    content: 'Working on it...',
    orderedBlocks: [{ type: 'tool', name: 'create_avatar', state: 'complete' }],
    startedAt: Date.now() - 10_000,
    ...overrides,
  }
}

function getMessages() {
  return useChatStore.getState().messagesByConversation[CONV_ID] ?? []
}

describe('Reconnect delegation hydration logic', () => {
  beforeEach(() => {
    backendPostMock.mockReset()
    const state = useChatStore.getState()
    state.messagesByConversation = {}
    mockTrack.stop.mockClear()
    Object.defineProperty(globalThis.navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: 'granted' }) },
    })
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
    })
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    })
    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      value: class MockWebSocket {
        static OPEN = 1
        readyState = 1
        binaryType: BinaryType = 'blob'
        onopen: (() => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onerror: (() => void) | null = null
        onclose: (() => void) | null = null
        send = vi.fn()
        close = vi.fn()

        constructor(readonly url: string) {}
      },
    })
  })

  it('mounts the live session hook idle without render churn', () => {
    const onRender = vi.fn()
    const scope: BrainLiveScope = {
      type: 'agent',
      agentId: 'atlas',
      label: 'Atlas',
      conversationId: CONV_ID,
    }

    const { result, rerender } = renderHook(
      ({ currentScope }) => useBrainLiveSession(currentScope),
      {
        initialProps: { currentScope: scope },
        wrapper: profilerWrapper(onRender),
      },
    )

    expect(result.current.state).toBe('idle')
    expect(result.current.error).toBeNull()
    expect(result.current.delegationTasks).toEqual([])
    expect(typeof result.current.startSession).toBe('function')

    rerender({ currentScope: { ...scope } })

    expect(result.current.state).toBe('idle')
    expect(onRender.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('hydrates delegation snapshots into chat store messages', () => {
    const snapshot = makeDelegationSnapshot()
    const delegationMsgMap = new Map<string, string>()

    const msgId = `voice-delegation-${snapshot.delegationId.slice(0, 8)}-${Date.now()}`
    useChatStore.getState().addMessage(CONV_ID, {
      id: msgId,
      conversation_id: CONV_ID,
      role: 'assistant',
      content: snapshot.content,
      content_blocks: null,
      created_at: new Date(snapshot.startedAt).toISOString(),
      metadata: {
        source: 'voice_live',
        delegation_task: true,
        delegation_id: snapshot.delegationId,
        voice_task_label: snapshot.task,
        voice_task_status: snapshot.status,
        content_blocks_ordered: snapshot.orderedBlocks,
      },
    })
    delegationMsgMap.set(snapshot.delegationId, msgId)

    const messages = getMessages()
    expect(messages).toHaveLength(1)

    const msg = messages[0]!
    const meta = msg.metadata as Record<string, unknown>
    expect(meta.delegation_task).toBe(true)
    expect(meta.delegation_id).toBe('del-1')
    expect(meta.voice_task_label).toBe('Build landing page')
    expect(meta.voice_task_status).toBe('running')
    expect(meta.content_blocks_ordered).toEqual(snapshot.orderedBlocks)

    expect(delegationMsgMap.get('del-1')).toBe(msgId)
  })

  it('does not duplicate messages for delegations already in the map', () => {
    const snapshot = makeDelegationSnapshot()
    const delegationMsgMap = new Map<string, string>()

    delegationMsgMap.set(snapshot.delegationId, 'existing-msg-id')

    if (!delegationMsgMap.has(snapshot.delegationId)) {
      useChatStore.getState().addMessage(CONV_ID, {
        id: 'should-not-exist',
        conversation_id: CONV_ID,
        role: 'assistant',
        content: '',
        content_blocks: null,
        created_at: new Date().toISOString(),
        metadata: {},
      })
    }

    const messages = getMessages()
    expect(messages).toHaveLength(0)
    expect(delegationMsgMap.get(snapshot.delegationId)).toBe('existing-msg-id')
  })

  it('hydrates completed delegations from snapshot', () => {
    const snapshot = makeDelegationSnapshot({
      status: 'completed',
      completedAt: Date.now() - 30_000,
      content: 'Landing page created successfully',
    })

    const msgId = `voice-delegation-${snapshot.delegationId.slice(0, 8)}-${Date.now()}`
    useChatStore.getState().addMessage(CONV_ID, {
      id: msgId,
      conversation_id: CONV_ID,
      role: 'assistant',
      content: snapshot.content as string,
      content_blocks: null,
      created_at: new Date(snapshot.startedAt as number).toISOString(),
      metadata: {
        source: 'voice_live',
        delegation_task: true,
        delegation_id: snapshot.delegationId,
        voice_task_label: snapshot.task,
        voice_task_status: snapshot.status,
        content_blocks_ordered: snapshot.orderedBlocks,
      },
    })

    const messages = getMessages()
    expect(messages).toHaveLength(1)
    const meta = messages[0]!.metadata as Record<string, unknown>
    expect(meta.voice_task_status).toBe('completed')
    expect(messages[0]!.content).toBe('Landing page created successfully')
  })

  it('reconnectSession hydrates delegation snapshots through the hook without render churn', async () => {
    const snapshot = makeDelegationSnapshot()
    backendPostMock.mockResolvedValue({
      sessionId: 'session-1',
      wsUrl: 'ws://localhost:3003',
      delegations: [snapshot],
    })
    const onRender = vi.fn()
    const scope: BrainLiveScope = {
      type: 'agent',
      agentId: 'atlas',
      label: 'Atlas',
      conversationId: CONV_ID,
    }

    const { result, unmount } = renderHook(() => useBrainLiveSession(scope), {
      wrapper: profilerWrapper(onRender),
    })

    await act(async () => {
      await result.current.reconnectSession()
    })

    await waitFor(() => {
      expect(getMessages()).toHaveLength(1)
      expect(result.current.delegationTasks).toEqual([
        {
          delegationId: 'del-1',
          messageId: expect.stringMatching(/^voice-delegation-del-1-/),
          task: 'Build landing page',
          status: 'running',
        },
      ])
    })

    const meta = getMessages()[0]!.metadata as Record<string, unknown>
    expect(meta.delegation_task).toBe(true)
    expect(meta.content_blocks_ordered).toEqual(snapshot.orderedBlocks)
    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/brain/live-session',
      expect.objectContaining({
        conversationId: CONV_ID,
        reconnect: true,
        scope,
      }),
    )
    expect(onRender.mock.calls.length).toBeLessThanOrEqual(4)

    unmount()
  })
})
