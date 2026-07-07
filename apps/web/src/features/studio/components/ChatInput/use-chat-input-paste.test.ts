import { act, renderHook } from '@testing-library/react'
import type { ClipboardEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { extractClipboardImageFiles } from '../../utils/clipboard-image'
import { useChatInputPaste } from './use-chat-input-paste'

vi.mock('../../utils/clipboard-image', () => ({
  extractClipboardImageFiles: vi.fn(),
}))

const mockExtractClipboardImageFiles = vi.mocked(extractClipboardImageFiles)

function createPasteEvent() {
  const clipboardData = { getData: vi.fn() } as unknown as DataTransfer
  return {
    clipboardData,
    preventDefault: vi.fn(),
  } as ClipboardEvent<HTMLTextAreaElement> & {
    clipboardData: DataTransfer
    preventDefault: ReturnType<typeof vi.fn>
  }
}

function renderPasteHook(options?: {
  disabled?: boolean
  recordingState?: 'idle' | 'recording' | 'finishing'
  handleFileSelect?: (files: FileList | readonly File[] | null) => void | Promise<void>
  tryAddFromClipboard?: (clipboardData: DataTransfer | null | undefined) => boolean
}) {
  const handleFileSelect = options?.handleFileSelect ?? vi.fn()
  const tryAddFromClipboard = options?.tryAddFromClipboard ?? vi.fn()
  const hook = renderHook(() =>
    useChatInputPaste({
      disabled: options?.disabled ?? false,
      recordingState: options?.recordingState ?? 'idle',
      handleFileSelect,
      tryAddFromClipboard,
    }),
  )

  return { ...hook, handleFileSelect, tryAddFromClipboard }
}

describe('useChatInputPaste', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExtractClipboardImageFiles.mockReturnValue([])
  })

  it('uploads pasted image files before considering pasted text blocks', () => {
    const file = new File(['image'], 'screen.png', { type: 'image/png' })
    mockExtractClipboardImageFiles.mockReturnValue([file])
    const { result, handleFileSelect, tryAddFromClipboard } = renderPasteHook()
    const event = createPasteEvent()

    act(() => result.current.handleComposerPaste(event))

    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(handleFileSelect).toHaveBeenCalledWith([file])
    expect(tryAddFromClipboard).not.toHaveBeenCalled()
  })

  it('stores large pasted text blocks and prevents default text insertion', () => {
    const tryAddFromClipboard = vi.fn(() => true)
    const { result, handleFileSelect } = renderPasteHook({ tryAddFromClipboard })
    const event = createPasteEvent()

    act(() => result.current.handleComposerPaste(event))

    expect(tryAddFromClipboard).toHaveBeenCalledWith(event.clipboardData)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(handleFileSelect).not.toHaveBeenCalled()
  })

  it('allows normal paste insertion when no image or large text block is handled', () => {
    const tryAddFromClipboard = vi.fn(() => false)
    const { result, handleFileSelect } = renderPasteHook({ tryAddFromClipboard })
    const event = createPasteEvent()

    act(() => result.current.handleComposerPaste(event))

    expect(tryAddFromClipboard).toHaveBeenCalledWith(event.clipboardData)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(handleFileSelect).not.toHaveBeenCalled()
  })

  it('ignores paste handling while disabled or recording', () => {
    const disabledHook = renderPasteHook({ disabled: true })
    const disabledEvent = createPasteEvent()

    act(() => disabledHook.result.current.handleComposerPaste(disabledEvent))

    expect(mockExtractClipboardImageFiles).not.toHaveBeenCalled()
    expect(disabledEvent.preventDefault).not.toHaveBeenCalled()

    const recordingHook = renderPasteHook({ recordingState: 'recording' })
    const recordingEvent = createPasteEvent()

    act(() => recordingHook.result.current.handleComposerPaste(recordingEvent))

    expect(mockExtractClipboardImageFiles).not.toHaveBeenCalled()
    expect(recordingEvent.preventDefault).not.toHaveBeenCalled()
  })
})
