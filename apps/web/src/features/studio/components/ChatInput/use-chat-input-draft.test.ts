import { act, renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentAttachment } from '../../types'
import { useChatInputDraft, type ChatInputDraftStore, type UseChatInputDraftOptions } from './use-chat-input-draft'

function textareaRef(scrollHeight = 120): RefObject<HTMLTextAreaElement | null> {
  const textarea = document.createElement('textarea')
  Object.defineProperty(textarea, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
  return { current: textarea }
}

function documentAttachment(): DocumentAttachment {
  return {
    filename: 'brief.txt',
    type: 'text',
    text: 'brief',
    mimeType: 'text/plain',
  }
}

function draftStore(drafts: Record<string, string> = {}): ChatInputDraftStore {
  return {
    composerDraftByContext: drafts,
    setComposerDraft: vi.fn((contextKey: string, text: string) => {
      drafts[contextKey] = text
    }),
    clearComposerDraft: vi.fn((contextKey: string) => {
      delete drafts[contextKey]
    }),
  }
}

function defaultOptions(
  overrides: Partial<UseChatInputDraftOptions> = {},
): UseChatInputDraftOptions {
  return {
    value: 'current text',
    draftContextKey: 'conversation-1',
    initialValue: undefined,
    initialDocuments: undefined,
    restoreNonce: undefined,
    textareaRef: textareaRef(),
    setValue: vi.fn(),
    setDisplayText: vi.fn(),
    clearPastedBlocks: vi.fn(),
    restoreAttachedFiles: vi.fn(),
    getDraftStore: () => draftStore(),
    scheduleAnimationFrame: (callback) => {
      callback()
      return 1
    },
    saveDelayMs: 500,
    ...overrides,
  }
}

describe('useChatInputDraft', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('restores parent text and documents once per restore nonce', () => {
    const attachment = documentAttachment()
    const options = defaultOptions({
      initialValue: 'restored text',
      initialDocuments: [attachment],
      restoreNonce: 'restore-1',
    })

    const { rerender } = renderHook((props: UseChatInputDraftOptions) => useChatInputDraft(props), {
      initialProps: options,
    })

    expect(options.setValue).toHaveBeenCalledWith('restored text')
    expect(options.setDisplayText).toHaveBeenCalledWith('restored text')
    expect(options.clearPastedBlocks).toHaveBeenCalled()
    expect(options.restoreAttachedFiles).toHaveBeenCalledWith([attachment])

    rerender({ ...options, value: 'restored text' })
    expect(options.restoreAttachedFiles).toHaveBeenCalledTimes(1)
  })

  it('hydrates the initial composer from a stored draft when no initial value is provided', () => {
    const store = draftStore({ 'conversation-1': 'stored draft' })
    const ref = textareaRef(260)
    const options = defaultOptions({
      textareaRef: ref,
      getDraftStore: () => store,
    })

    renderHook(() => useChatInputDraft(options))

    expect(options.setValue).toHaveBeenCalledWith('stored draft')
    expect(options.setDisplayText).toHaveBeenCalledWith('stored draft')
    expect(ref.current?.style.height).toBe('200px')
  })

  it('moves a pending new draft into the next real conversation context', () => {
    const store = draftStore({ new: 'pending draft' })
    const ref = textareaRef(80)

    const { rerender } = renderHook(
      (props: { draftContextKey: string; value: string }) =>
        useChatInputDraft(
          defaultOptions({
            value: props.value,
            draftContextKey: props.draftContextKey,
            textareaRef: ref,
            getDraftStore: () => store,
          }),
        ),
      { initialProps: { draftContextKey: 'new', value: 'pending draft' } },
    )

    rerender({ draftContextKey: 'conversation-1', value: 'pending draft' })

    expect(store.setComposerDraft).toHaveBeenCalledWith('conversation-1', 'pending draft')
    expect(store.clearComposerDraft).toHaveBeenCalledWith('new')
    expect(store.composerDraftByContext).toEqual({ 'conversation-1': 'pending draft' })
    expect(ref.current?.style.height).toBe('80px')
  })

  it('debounces draft saves and saves the latest value on unmount', () => {
    vi.useFakeTimers()
    const store = draftStore()
    const options = defaultOptions({
      value: 'draft text',
      getDraftStore: () => store,
    })

    const { rerender, unmount } = renderHook(
      (props: UseChatInputDraftOptions) => useChatInputDraft(props),
      { initialProps: options },
    )

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(store.setComposerDraft).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(store.setComposerDraft).toHaveBeenCalledWith('conversation-1', 'draft text')

    rerender({ ...options, value: '   ' })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(store.clearComposerDraft).toHaveBeenCalledWith('conversation-1')

    rerender({ ...options, value: 'latest draft' })
    unmount()
    expect(store.setComposerDraft).toHaveBeenCalledWith('conversation-1', 'latest draft')
  })

  it('does not wipe the live composer when initialValue changes without a restore nonce', () => {
    const store = draftStore({ 'conversation-1': 'stored draft' })
    const setValue = vi.fn()
    const setDisplayText = vi.fn()
    const options = defaultOptions({
      value: 'typing follow-up',
      initialValue: undefined,
      getDraftStore: () => store,
      setValue,
      setDisplayText,
    })

    const { rerender } = renderHook((props: UseChatInputDraftOptions) => useChatInputDraft(props), {
      initialProps: options,
    })

    setValue.mockClear()
    setDisplayText.mockClear()

    rerender({
      ...options,
      value: 'typing follow-up',
      initialValue: undefined,
    })

    expect(setValue).not.toHaveBeenCalled()
    expect(setDisplayText).not.toHaveBeenCalled()
  })

  it('does not save or clear drafts on rerenders caused by new accessor identities', () => {
    const store = draftStore()
    const { rerender, unmount } = renderHook(
      (props: { value: string; marker: number }) =>
        useChatInputDraft(
          defaultOptions({
            value: props.value,
            getDraftStore: () => store,
          }),
        ),
      { initialProps: { value: '', marker: 0 } },
    )

    rerender({ value: '', marker: 1 })
    rerender({ value: '', marker: 2 })

    expect(store.setComposerDraft).not.toHaveBeenCalled()
    expect(store.clearComposerDraft).not.toHaveBeenCalled()

    unmount()

    expect(store.clearComposerDraft).toHaveBeenCalledTimes(1)
    expect(store.clearComposerDraft).toHaveBeenCalledWith('conversation-1')
  })
})
