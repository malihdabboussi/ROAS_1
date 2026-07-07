import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePublicAgentChat } from './usePublicAgentChat'

const createPublicConversationMock = vi.fn()
const prewarmPublicAgentMock = vi.fn()
const prewarmPublicConversationMock = vi.fn()
const sendPublicMessageStreamMock = vi.fn()
const fetchPublicMessagesMock = vi.fn()

vi.mock('../services/public-agent.service', () => ({
  createPublicConversation: (...args: unknown[]) => createPublicConversationMock(...args),
  prewarmPublicAgent: (...args: unknown[]) => prewarmPublicAgentMock(...args),
  prewarmPublicConversation: (...args: unknown[]) => prewarmPublicConversationMock(...args),
  sendPublicMessageStream: (...args: unknown[]) => sendPublicMessageStreamMock(...args),
  fetchPublicMessages: (...args: unknown[]) => fetchPublicMessagesMock(...args),
}))

describe('usePublicAgentChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    createPublicConversationMock.mockResolvedValue({ id: 'conv-1' })
    prewarmPublicAgentMock.mockResolvedValue(true)
    prewarmPublicConversationMock.mockResolvedValue(true)
    fetchPublicMessagesMock.mockResolvedValue([])
    sendPublicMessageStreamMock.mockImplementation(
      async (_slug, _key, _payload, onEvent, _signal) => {
        onEvent({ type: 'content', content: 'Hello' })
        onEvent({ type: 'done' })
      },
    )
  })

  it('reuses the same prewarm promise for concurrent prepareConversation calls', async () => {
    let resolvePrewarm: (() => void) | undefined
    prewarmPublicConversationMock.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolvePrewarm = () => resolve(true)
        }),
    )

    const { result } = renderHook(() => usePublicAgentChat('owner', 'agent'))

    await act(async () => {
      const first = result.current.prepareConversation()
      const second = result.current.prepareConversation()
      await waitFor(() => expect(resolvePrewarm).toBeDefined())
      resolvePrewarm?.()
      await Promise.all([first, second])
    })

    expect(createPublicConversationMock).toHaveBeenCalledTimes(1)
    expect(prewarmPublicAgentMock).toHaveBeenCalledTimes(1)
    expect(prewarmPublicConversationMock).toHaveBeenCalledTimes(1)
  })

  it('adopts a prepared conversation id without creating a new one', async () => {
    const { result } = renderHook(() => usePublicAgentChat('owner', 'agent'))

    await act(async () => {
      await result.current.loadExistingMessages('conv-existing')
    })

    expect(createPublicConversationMock).not.toHaveBeenCalled()
    expect(fetchPublicMessagesMock).toHaveBeenCalledWith('owner', 'agent', 'conv-existing')
    expect(result.current.conversationId).toBe('conv-existing')
  })

  it('does not send duplicate messages when sendMessage is called twice quickly', async () => {
    let resolveStream: (() => void) | undefined
    sendPublicMessageStreamMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveStream = resolve
        }),
    )

    const { result } = renderHook(() => usePublicAgentChat('owner', 'agent'))

    await act(async () => {
      const first = result.current.sendMessage('Hello')
      const second = result.current.sendMessage('Hello again')
      await waitFor(() => expect(sendPublicMessageStreamMock).toHaveBeenCalledTimes(1))
      resolveStream?.()
      await Promise.all([first, second])
    })

    expect(sendPublicMessageStreamMock).toHaveBeenCalledTimes(1)
    expect(prewarmPublicAgentMock).toHaveBeenCalledTimes(1)
    expect(prewarmPublicConversationMock).toHaveBeenCalledTimes(1)
  })
})
