import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputContextController } from './use-chat-input-context-controller'
import { useChatInputContextMeterData } from './use-chat-input-context-meter-data'
import { useChatInputContextPopover } from './use-chat-input-context-popover'

vi.mock('./use-chat-input-context-meter-data', () => ({
  useChatInputContextMeterData: vi.fn(),
}))

vi.mock('./use-chat-input-context-popover', () => ({
  useChatInputContextPopover: vi.fn(),
}))

const mockUseChatInputContextMeterData = vi.mocked(useChatInputContextMeterData)
const mockUseChatInputContextPopover = vi.mocked(useChatInputContextPopover)

describe('useChatInputContextController', () => {
  beforeEach(() => {
    mockUseChatInputContextMeterData.mockReturnValue({
      contextMeter: { contextWindow: 128000 },
      hasContextMeter: true,
    } as never)
    mockUseChatInputContextPopover.mockReturnValue({
      contextPopoverAnchorRef: createRef<HTMLSpanElement>(),
      contextPopoverTriggerRef: createRef<HTMLButtonElement>(),
      contextPopoverPanelRef: createRef<HTMLDivElement>(),
      contextPopoverOpen: false,
      setContextPopoverOpen: vi.fn(),
      contextPopoverPosition: null,
      updateContextPopoverPosition: vi.fn(),
      toggleContextPopover: vi.fn(),
      closeContextPopover: vi.fn(),
    })
  })

  it('uses idle value for the meter and enables the popover when context data exists', () => {
    const composerShellRef = createRef<HTMLDivElement>()

    const { result } = renderHook(() =>
      useChatInputContextController({
        recordingState: 'idle',
        value: 'Draft text',
        displayText: 'Recording text',
        selectedContextOption: { tokens: 128000 },
        activeModelOption: { contextWindow: 64000 },
        attachedFiles: [],
        attachedArtifacts: [],
        attachedReferences: [],
        pastedBlocks: [],
        composerShellRef,
      }),
    )

    expect(mockUseChatInputContextMeterData).toHaveBeenCalledWith({
      selectedContextOption: { tokens: 128000 },
      activeModelOption: { contextWindow: 64000 },
      inputValue: 'Draft text',
      attachedFiles: [],
      attachedArtifacts: [],
      attachedReferences: [],
      pastedBlocks: [],
    })
    expect(mockUseChatInputContextPopover).toHaveBeenCalledWith({
      enabled: true,
      composerShellRef,
    })
    expect(result.current.inputValue).toBe('Draft text')
    expect(result.current.contextMeter).toEqual({ contextWindow: 128000 })
  })

  it('uses display text while recording and respects the breakdown feature flag', () => {
    const composerShellRef = createRef<HTMLDivElement>()

    renderHook(() =>
      useChatInputContextController({
        recordingState: 'recording',
        value: 'Draft text',
        displayText: 'Recording text',
        selectedContextOption: null,
        activeModelOption: null,
        attachedFiles: [],
        attachedArtifacts: [],
        attachedReferences: [],
        pastedBlocks: [],
        composerShellRef,
        breakdownPanelEnabled: false,
      }),
    )

    expect(mockUseChatInputContextMeterData).toHaveBeenLastCalledWith(
      expect.objectContaining({
        inputValue: 'Recording text',
      }),
    )
    expect(mockUseChatInputContextPopover).toHaveBeenLastCalledWith({
      enabled: false,
      composerShellRef,
    })
  })
})
