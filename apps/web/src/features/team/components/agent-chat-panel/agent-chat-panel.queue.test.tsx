import { Profiler, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  DocumentAttachment,
  HighlightedArtifact,
  MessageReference,
} from '@/lib/chat/studio-chat-runtime-adapter'
import type { AttachedArtifact, ChatModelSettings } from '@/lib/chat'
import {
  useAgentChatQueueHandlers,
  type UseAgentChatQueueHandlersInput,
} from './agent-chat-panel.queue'

function queueItem(
  overrides: Partial<{
    id: string
    content: string
    documents: DocumentAttachment[]
    artifacts: HighlightedArtifact[]
    references: MessageReference[]
    model: string
    modelSettings: ChatModelSettings
  }> = {},
) {
  return {
    id: 'queue-1',
    content: 'Queued message',
    documents: undefined,
    artifacts: undefined,
    references: undefined,
    model: undefined,
    modelSettings: undefined,
    ...overrides,
  }
}

function createInput(
  overrides: Partial<UseAgentChatQueueHandlersInput> = {},
): UseAgentChatQueueHandlersInput {
  return {
    selectedSessionId: 'conversation-1',
    isStreaming: false,
    isStopping: false,
    queueLength: 0,
    enqueueMessage: vi.fn(),
    dequeueMessage: vi.fn(),
    removeQueueItem: vi.fn(),
    updateQueueItem: vi.fn(),
    getQueuedItems: vi.fn(() => []),
    requestStopStreamForSession: vi.fn(),
    sendWithToast: vi.fn(async () => undefined),
    handleSend: vi.fn(),
    setComposerText: vi.fn(),
    createId: vi.fn(() => 'queue-created'),
    wait: vi.fn(async () => undefined),
    ...overrides,
  }
}

function renderQueueHandlers(input: UseAgentChatQueueHandlersInput, onRender?: () => void) {
  return renderHook((props: UseAgentChatQueueHandlersInput) => useAgentChatQueueHandlers(props), {
    initialProps: input,
    wrapper: ({ children }: { children: ReactNode }) => (
      <Profiler id="agent-chat-queue" onRender={onRender ?? (() => undefined)}>
        {children}
      </Profiler>
    ),
  })
}

describe('useAgentChatQueueHandlers', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not enqueue without a selected session', () => {
    const input = createInput({ selectedSessionId: null })
    const { result } = renderQueueHandlers(input)

    act(() => {
      result.current.handleEnqueue('hello')
    })

    expect(input.enqueueMessage).not.toHaveBeenCalled()
    expect(input.createId).not.toHaveBeenCalled()
  })

  it('enqueues a draft with generated id and highlighted artifacts', () => {
    const documents: DocumentAttachment[] = [{ filename: 'brief.md', type: 'text', text: 'Brief' }]
    const artifacts: AttachedArtifact[] = [{ id: 'artifact-1', type: 'offer', label: 'Offer' }]
    const references: MessageReference[] = [
      { id: 'reference-1', kind: 'artifact', label: 'Offer', type: 'offer' },
    ]
    const modelSettings: ChatModelSettings = { speed_mode: 'fast' }
    const input = createInput()
    const { result } = renderQueueHandlers(input)

    act(() => {
      result.current.handleEnqueue(
        'Build it',
        documents,
        artifacts,
        'model-fast',
        references,
        modelSettings,
      )
    })

    expect(input.enqueueMessage).toHaveBeenCalledWith('conversation-1', {
      id: 'queue-created',
      content: 'Build it',
      documents,
      artifacts: [{ id: 'artifact-1', type: 'offer', label: 'Offer' }],
      model: 'model-fast',
      references,
      modelSettings,
    })
  })

  it('edits an existing queue item and seeds composer text', () => {
    const documents: DocumentAttachment[] = [{ filename: 'brief.md', type: 'text', text: 'Brief' }]
    const artifacts: AttachedArtifact[] = [{ id: 'artifact-1', type: 'offer', label: 'Offer' }]
    const references: MessageReference[] = [
      { id: 'reference-1', kind: 'artifact', label: 'Offer', type: 'offer' },
    ]
    const modelSettings: ChatModelSettings = { context_window_tokens: 1000 }
    const input = createInput()
    const { result } = renderQueueHandlers(input)

    act(() => {
      result.current.handleQueueEdit({ id: 'queue-1', content: 'Old text' })
    })

    expect(input.setComposerText).toHaveBeenCalledWith('Old text')
    expect(result.current.editingQueueItemId).toBe('queue-1')

    act(() => {
      result.current.handleComposerSendWithQueueEdit(
        'New text',
        documents,
        artifacts,
        'model-pro',
        references,
        modelSettings,
      )
    })

    expect(input.updateQueueItem).toHaveBeenCalledWith('conversation-1', 'queue-1', {
      content: 'New text',
      documents,
      artifacts: [{ id: 'artifact-1', type: 'offer', label: 'Offer' }],
      model: 'model-pro',
      references,
      modelSettings,
    })
    expect(input.handleSend).not.toHaveBeenCalled()
    expect(result.current.editingQueueItemId).toBeNull()
  })

  it('removes a selected queue item, stops the stream, and sends it now', async () => {
    const documents: DocumentAttachment[] = [{ filename: 'brief.md', type: 'text', text: 'Brief' }]
    const artifacts: HighlightedArtifact[] = [{ id: 'artifact-1', type: 'offer', label: 'Offer' }]
    const references: MessageReference[] = [
      { id: 'reference-1', kind: 'artifact', label: 'Offer', type: 'offer' },
    ]
    const modelSettings: ChatModelSettings = { speed_mode: 'fast' }
    const item = queueItem({
      documents,
      artifacts,
      references,
      model: 'model-fast',
      modelSettings,
    })
    const input = createInput({
      isStreaming: true,
      getQueuedItems: vi.fn(() => [item]),
    })
    const { result } = renderQueueHandlers(input)

    await act(async () => {
      await result.current.handleQueueSendNow('queue-1')
    })

    expect(input.removeQueueItem).toHaveBeenCalledWith('conversation-1', 'queue-1')
    expect(input.requestStopStreamForSession).toHaveBeenCalledWith('conversation-1')
    expect(input.sendWithToast).toHaveBeenCalledWith(
      'Queued message',
      documents,
      artifacts,
      'model-fast',
      references,
      modelSettings,
    )
  })

  it('stops the stream, waits, and sends the next queued item', async () => {
    const item = queueItem({ model: 'model-fast' })
    const input = createInput({
      isStreaming: true,
      dequeueMessage: vi.fn(() => item),
    })
    const { result } = renderQueueHandlers(input)

    await act(async () => {
      await result.current.handleQueueSendNowNext()
    })

    expect(input.requestStopStreamForSession).toHaveBeenCalledWith('conversation-1')
    expect(input.wait).toHaveBeenCalledWith(100)
    expect(input.dequeueMessage).toHaveBeenCalledWith('conversation-1')
    expect(input.sendWithToast).toHaveBeenCalledWith(
      'Queued message',
      undefined,
      undefined,
      'model-fast',
      undefined,
      undefined,
    )
  })

  it('drains one queued item after streaming settles without render churn', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let commits = 0
    const item = queueItem()
    const input = createInput({
      isStreaming: true,
      queueLength: 1,
      dequeueMessage: vi.fn(() => item),
    })

    try {
      const { rerender } = renderQueueHandlers(input, () => commits++)

      await act(async () => {
        rerender({ ...input, isStreaming: false })
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(input.dequeueMessage).toHaveBeenCalledWith('conversation-1')
      expect(input.sendWithToast).toHaveBeenCalledWith(
        'Queued message',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      )
      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(commits).toBeLessThan(8)
    } finally {
      consoleError.mockRestore()
    }
  })
})
