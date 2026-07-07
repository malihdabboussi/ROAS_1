import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bucketChatStatusMessage,
  buildChatPrewarmKey,
  CHAT_WORKING_LABELS,
  createChatPrewarmScheduler,
  prewarmChatContext,
  resetChatPrewarmForTests,
  shouldApplyStatusUpdate,
} from './chat.service'

const backendPostMock = vi.hoisted(() => vi.fn(async (..._args: unknown[]) => ({ ok: true })))

vi.mock('@/lib/api/backend-client', () => ({
  backendDelete: vi.fn(),
  backendFetch: vi.fn(),
  backendGet: vi.fn(),
  backendPatch: vi.fn(),
  backendPost: backendPostMock,
}))

vi.mock('@/lib/utils/text', () => ({
  stripEmoji: (value: string) => value,
}))

vi.mock('@/lib/utils/org-storage', () => ({
  getActiveOrgIdFromStorage: () => null,
  getOrgScopedKey: (_scope: string, key: string) => key,
}))

vi.mock('./campaign.service', () => ({
  ensureGeneralCampaign: vi.fn(async () => ({ id: 'general-campaign' })),
}))

const basePrewarm = {
  conversation_id: 'conversation-1',
  campaign_id: 'campaign-1',
  model: 'google/gemini-3.5-flash',
  model_settings: { reasoning_effort: 'none' as const },
  source: 'studio',
}

describe('chat prewarm service', () => {
  beforeEach(() => {
    vi.useRealTimers()
    backendPostMock.mockClear()
    resetChatPrewarmForTests()
  })

  it('posts stable chat context to the prewarm endpoint', () => {
    prewarmChatContext(basePrewarm)

    expect(backendPostMock).toHaveBeenCalledWith(
      '/api/chat/prewarm',
      basePrewarm,
      expect.objectContaining({ skipClientErrorLog: true }),
    )
  })

  it('dedupes repeated same-key calls while a prewarm is in flight', () => {
    backendPostMock.mockImplementation(() => new Promise(() => {}))

    prewarmChatContext(basePrewarm)
    prewarmChatContext({ ...basePrewarm })

    expect(backendPostMock).toHaveBeenCalledTimes(1)
    expect(buildChatPrewarmKey(basePrewarm)).toBe(buildChatPrewarmKey({ ...basePrewarm }))
  })

  it('suppresses repeated same-key calls after a completed prewarm for the cooldown window', async () => {
    vi.useFakeTimers()
    let resolvePrewarm: (value: { ok: true }) => void = () => {}
    const firstPrewarm = new Promise<{ ok: true }>((resolve) => {
      resolvePrewarm = resolve
    })
    backendPostMock.mockReturnValueOnce(firstPrewarm)

    prewarmChatContext(basePrewarm)
    resolvePrewarm({ ok: true })
    await firstPrewarm
    await Promise.resolve()
    await Promise.resolve()

    prewarmChatContext({ ...basePrewarm })
    vi.advanceTimersByTime(59_999)
    prewarmChatContext({ ...basePrewarm })

    expect(backendPostMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    prewarmChatContext({ ...basePrewarm })

    expect(backendPostMock).toHaveBeenCalledTimes(2)
  })

  it('aborts stale in-flight prewarm when the key changes', () => {
    let firstSignal: AbortSignal | undefined
    backendPostMock.mockImplementation((...args: unknown[]) => {
      const options = args[2] as { signal?: AbortSignal }
      firstSignal ??= options.signal
      return new Promise(() => {})
    })

    prewarmChatContext(basePrewarm)
    prewarmChatContext({ ...basePrewarm, model: 'anthropic/claude-opus-4.6' })

    expect(firstSignal?.aborted).toBe(true)
    expect(backendPostMock).toHaveBeenCalledTimes(2)
  })

  it('skips pending or missing conversation ids', () => {
    prewarmChatContext({ ...basePrewarm, conversation_id: null })
    prewarmChatContext({ ...basePrewarm, conversation_id: 'pending-123' })

    expect(backendPostMock).not.toHaveBeenCalled()
  })

  it('triggers focus immediately and typing after debounce', () => {
    vi.useFakeTimers()
    const prewarm = vi.fn()
    const scheduler = createChatPrewarmScheduler({ debounceMs: 500, prewarm })

    scheduler.onFocus(basePrewarm)
    expect(prewarm).toHaveBeenCalledTimes(1)

    scheduler.onInput(basePrewarm)
    vi.advanceTimersByTime(499)
    expect(prewarm).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(prewarm).toHaveBeenCalledTimes(2)
  })

  it('uses the latest key when typing changes model/settings/scope before debounce fires', () => {
    vi.useFakeTimers()
    const prewarm = vi.fn()
    const scheduler = createChatPrewarmScheduler({ debounceMs: 500, prewarm })

    scheduler.onInput(basePrewarm)
    scheduler.onInput({
      ...basePrewarm,
      model: 'anthropic/claude-opus-4.6',
      scope_kind: 'personal',
    })
    vi.advanceTimersByTime(500)

    expect(prewarm).toHaveBeenCalledTimes(1)
    expect(prewarm).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'anthropic/claude-opus-4.6',
        scope_kind: 'personal',
      }),
    )
  })
})

describe('chat status calming helpers', () => {
  it('exposes ten initial working labels', () => {
    expect(CHAT_WORKING_LABELS).toHaveLength(10)
    expect(new Set(CHAT_WORKING_LABELS).size).toBe(10)
  })

  it('maps noisy setup messages into stable buckets', () => {
    expect(bucketChatStatusMessage({ phase: 'thinking', message: 'Saving your message' })).toEqual({
      phase: 'thinking',
      message: 'Working',
    })
    expect(
      bucketChatStatusMessage({ phase: 'thinking', message: 'Loading your conversation' }),
    ).toEqual({ phase: 'thinking', message: 'Getting oriented' })
    expect(
      bucketChatStatusMessage({ phase: 'thinking', message: 'Reading your attachments' }),
    ).toEqual({ phase: 'thinking', message: 'Connecting the dots' })
    expect(
      bucketChatStatusMessage({ phase: 'thinking', message: 'Planning your response' }),
    ).toEqual({ phase: 'thinking', message: 'Planning next moves' })
    expect(
      bucketChatStatusMessage({ phase: 'thinking', message: 'Checking agent access' }),
    ).toEqual({ phase: 'thinking', message: 'Checking the next step' })
    expect(bucketChatStatusMessage({ phase: 'thinking', message: 'Reading your Brain' })).toEqual({
      phase: 'thinking',
      message: 'Reading your Brain',
    })
  })

  it('enforces minimum display duration unless phase advances', () => {
    expect(
      shouldApplyStatusUpdate({
        currentPhase: 'thinking',
        nextPhase: 'thinking',
        currentShownAt: 1_000,
        now: 1_500,
      }),
    ).toBe(false)
    expect(
      shouldApplyStatusUpdate({
        currentPhase: 'thinking',
        nextPhase: 'thinking',
        currentShownAt: 1_000,
        now: 1_900,
      }),
    ).toBe(true)
    expect(
      shouldApplyStatusUpdate({
        currentPhase: 'thinking',
        nextPhase: 'executing',
        currentShownAt: 1_000,
        now: 1_100,
      }),
    ).toBe(true)
  })
})
