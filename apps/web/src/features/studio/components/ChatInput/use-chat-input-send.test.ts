import { act, renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { ChatModelSettings, LlmModelOption } from '../../services/chat.service'
import type { MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { AttachedFile } from '../chat/FileAttachments'
import { useChatInputSend, type UseChatInputSendOptions } from './use-chat-input-send'

function modelOption(overrides: Partial<LlmModelOption> = {}): LlmModelOption {
  return {
    id: 'anthropic/claude-opus-4.6',
    provider: 'anthropic',
    modelName: 'claude-opus-4.6',
    label: 'Claude Opus 4.6',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsImages: true,
    inputModalities: ['text', 'image'],
    outputModalities: ['text'],
    supportedParameters: [],
    contextOptions: [],
    reasoningLevels: [],
    speedModes: [],
    pricing: {},
    pricingTiers: [],
    ...overrides,
  }
}

function attachedTextFile(overrides: Partial<AttachedFile> = {}): AttachedFile {
  return {
    id: 'file-1',
    file: new File(['brief'], 'brief.txt', { type: 'text/plain' }),
    uploading: false,
    parsed: [
      {
        filename: 'brief.txt',
        mimeType: 'text/plain',
        sizeBytes: 5,
        type: 'text',
        text: 'brief text',
        preview: 'brief',
      },
    ],
    ...overrides,
  }
}

function attachedImageFile(): AttachedFile {
  return attachedTextFile({
    id: 'image-1',
    file: new File(['image'], 'image.png', { type: 'image/png' }),
    parsed: [
      {
        filename: 'image.png',
        mimeType: 'image/png',
        sizeBytes: 5,
        type: 'image',
        fileUrl: 'https://cdn.test/image.png',
      },
    ],
  })
}

function textareaRef(): RefObject<HTMLTextAreaElement | null> {
  const textarea = document.createElement('textarea')
  textarea.style.height = '88px'
  return { current: textarea }
}

function defaultOptions(overrides: Partial<UseChatInputSendOptions> = {}): UseChatInputSendOptions {
  return {
    value: 'Write the brief',
    displayText: 'recording display',
    recordingState: 'idle',
    mergeForSend: (text) => text.trim(),
    disabled: false,
    sendDisabled: false,
    isStreaming: false,
    onSend: vi.fn(),
    onEnqueue: vi.fn(),
    activeComposerModel: 'anthropic/claude-opus-4.6',
    activeModelSettings: { reasoning_effort: 'medium' } as ChatModelSettings,
    modelOptions: [modelOption()],
    attachedFiles: [],
    attachedArtifacts: [],
    attachedReferences: [],
    draftContextKey: 'conversation-1',
    textareaRef: textareaRef(),
    setValue: vi.fn(),
    setDisplayText: vi.fn(),
    clearPastedBlocks: vi.fn(),
    clearAttachedFiles: vi.fn(),
    setAttachedArtifacts: vi.fn(),
    setAttachedReferences: vi.fn(),
    clearComposerDraft: vi.fn(),
    toastError: vi.fn(),
    ...overrides,
  }
}

describe('useChatInputSend', () => {
  it('sends merged text with attachments and clears composer state', () => {
    const artifact: AttachedArtifact = { id: 'offer-1', type: 'offer', label: 'Offer' }
    const reference: MessageReference = {
      kind: 'artifact',
      id: 'offer-1',
      label: 'Offer',
      type: 'offer',
    }
    const options = defaultOptions({
      mergeForSend: vi.fn((text: string) => `${text.trim()} + pasted`),
      attachedFiles: [attachedTextFile()],
      attachedArtifacts: [artifact],
      attachedReferences: [reference],
    })

    const { result } = renderHook(() => useChatInputSend(options))

    act(() => result.current())

    expect(options.onSend).toHaveBeenCalledWith(
      'Write the brief + pasted',
      [
        {
          filename: 'brief.txt',
          type: 'text',
          text: 'brief text',
          fileUrl: undefined,
          mimeType: 'text/plain',
          mediaAssetId: undefined,
          sizeBytes: 5,
          preview: 'brief',
          documentIntelligence: null,
        },
      ],
      [artifact],
      'anthropic/claude-opus-4.6',
      [reference],
      { reasoning_effort: 'medium' },
    )
    expect(options.onEnqueue).not.toHaveBeenCalled()
    expect(options.setValue).toHaveBeenCalledWith('')
    expect(options.setDisplayText).toHaveBeenCalledWith('')
    expect(options.clearPastedBlocks).toHaveBeenCalled()
    expect(options.clearAttachedFiles).toHaveBeenCalled()
    expect(options.setAttachedArtifacts).toHaveBeenCalledWith([])
    expect(options.setAttachedReferences).toHaveBeenCalledWith([])
    expect(options.clearComposerDraft).toHaveBeenCalledWith('conversation-1')
    expect(options.textareaRef.current?.style.height).toBe('auto')
  })

  it('enqueues while streaming when an enqueue callback is available', () => {
    const options = defaultOptions({
      isStreaming: true,
      value: 'Queue this',
    })

    const { result } = renderHook(() => useChatInputSend(options))

    act(() => result.current())

    expect(options.onEnqueue).toHaveBeenCalledWith(
      'Queue this',
      undefined,
      undefined,
      'anthropic/claude-opus-4.6',
      undefined,
      { reasoning_effort: 'medium' },
    )
    expect(options.onSend).not.toHaveBeenCalled()
  })

  it('blocks image attachments when the selected model does not support images', () => {
    const options = defaultOptions({
      activeComposerModel: 'text-only-model',
      modelOptions: [modelOption({ id: 'text-only-model', label: 'Text Only', supportsImages: false })],
      attachedFiles: [attachedImageFile()],
    })

    const { result } = renderHook(() => useChatInputSend(options))

    act(() => result.current())

    expect(options.toastError).toHaveBeenCalledWith(
      "Text Only doesn't support images. Pick a different model or remove the images.",
    )
    expect(options.onSend).not.toHaveBeenCalled()
    expect(options.setValue).not.toHaveBeenCalled()
    expect(options.clearComposerDraft).not.toHaveBeenCalled()
  })

  it('does not send when the merged text is empty or a file is still uploading', () => {
    const emptyOptions = defaultOptions({
      value: '   ',
      mergeForSend: () => '',
    })
    const uploadingOptions = defaultOptions({
      attachedFiles: [attachedTextFile({ uploading: true })],
    })

    const { result: emptyResult } = renderHook(() => useChatInputSend(emptyOptions))
    const { result: uploadingResult } = renderHook(() => useChatInputSend(uploadingOptions))

    act(() => emptyResult.current())
    act(() => uploadingResult.current())

    expect(emptyOptions.onSend).not.toHaveBeenCalled()
    expect(uploadingOptions.onSend).not.toHaveBeenCalled()
    expect(uploadingOptions.clearComposerDraft).not.toHaveBeenCalled()
  })
})
