import { renderHook } from '@testing-library/react'
import type { ContextBreakdown } from '@vibey/context-breakdown'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLiveContextEstimate } from '../../hooks/useLiveContextEstimate'
import {
  useActiveContextBreakdown,
  useActiveContextUsage,
  useActiveMessages,
} from '../../store/use-chat-store'
import { useChatInputContextMeterData } from './use-chat-input-context-meter-data'

vi.mock('../../hooks/useLiveContextEstimate', () => ({
  useLiveContextEstimate: vi.fn(),
}))

vi.mock('../../store/use-chat-store', () => ({
  useActiveContextBreakdown: vi.fn(),
  useActiveContextUsage: vi.fn(),
  useActiveMessages: vi.fn(),
}))

const baseline: ContextBreakdown = {
  version: 1,
  source: 'run',
  generatedAt: 1,
  totalTokens: 10,
  contextWindow: 200,
  slices: [],
}

const estimate: ContextBreakdown = {
  ...baseline,
  source: 'estimate',
  totalTokens: 25,
  contextWindow: 500,
}

function defaultOptions() {
  return {
    selectedContextOption: { tokens: 500 },
    activeModelOption: { contextWindow: 400 },
    inputValue: 'draft',
    attachedFiles: [
      {
        id: 'file-1',
        file: new File(['hello'], 'brief.txt', { type: 'text/plain' }),
        uploading: false,
        parsed: [
          {
            filename: 'brief.txt',
            mimeType: 'text/plain',
            sizeBytes: 5,
            type: 'text' as const,
            text: 'hello',
            documentIntelligence: null,
            preview: 'parsed preview',
          },
        ],
      },
    ],
    attachedArtifacts: [{ id: 'artifact-1', label: 'Offer', type: 'offer' as const }],
    attachedReferences: [{ kind: 'media' as const, id: 'media-1', label: 'Image' }],
    pastedBlocks: [{ id: 'paste-1', text: 'pasted' }],
  }
}

describe('useChatInputContextMeterData', () => {
  beforeEach(() => {
    vi.mocked(useActiveContextBreakdown).mockReturnValue(baseline)
    vi.mocked(useActiveContextUsage).mockReturnValue({ inputTokens: 7, contextWindow: 300 })
    vi.mocked(useActiveMessages).mockReturnValue([
      {
        id: 'message-1',
        conversation_id: 'conversation-1',
        role: 'user',
        content: 'Hi',
        content_blocks: null,
        metadata: {},
        created_at: '2026-06-22T00:00:00.000Z',
      },
    ])
    vi.mocked(useLiveContextEstimate).mockReturnValue(estimate)
  })

  it('builds the live estimate payload from current composer context', () => {
    const options = defaultOptions()

    const { result } = renderHook(() => useChatInputContextMeterData(options))

    expect(result.current.contextMeter).toBe(estimate)
    expect(result.current.hasContextMeter).toBe(true)
    expect(useLiveContextEstimate).toHaveBeenCalledWith({
      baseline,
      fallbackContextWindow: 500,
      fallbackInputTokens: 7,
      messages: [
        {
          id: 'message-1',
          conversation_id: 'conversation-1',
          role: 'user',
          content: 'Hi',
          content_blocks: null,
          metadata: {},
          created_at: '2026-06-22T00:00:00.000Z',
        },
      ],
      draftText: 'draft',
      attachments: [
        {
          filename: 'brief.txt',
          type: 'text/plain',
          sizeBytes: 5,
          preview: 'parsed preview',
        },
      ],
      artifacts: [{ label: 'Offer', type: 'offer' }],
      references: [{ kind: 'media', id: 'media-1', label: 'Image' }],
      pastedBlocks: [{ id: 'paste-1', text: 'pasted' }],
    })
  })

  it('falls back through model, baseline, and usage context windows and uses baseline if live estimate is null', () => {
    vi.mocked(useLiveContextEstimate).mockReturnValue(null)
    const { result } = renderHook(() =>
      useChatInputContextMeterData({
        ...defaultOptions(),
        selectedContextOption: null,
        activeModelOption: null,
      }),
    )

    expect(result.current.contextMeter).toBe(baseline)
    expect(useLiveContextEstimate).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackContextWindow: 200 }),
    )
  })
})
