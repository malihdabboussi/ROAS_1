import type { KeyboardEvent, MutableRefObject, RefObject } from 'react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SlashItem } from './chat-input-slash-menu'
import { useChatInputKeyDown, type UseChatInputKeyDownOptions } from './use-chat-input-keydown'

function slashItem(key = 'brief'): SlashItem {
  return {
    id: key,
    key,
    name: key,
    description: 'Run command',
    type: 'skill',
  }
}

function keyboardEvent(key: string, overrides: Partial<KeyboardEvent<HTMLTextAreaElement>> = {}) {
  return {
    key,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as KeyboardEvent<HTMLTextAreaElement>
}

function textareaRef(text = '', cursor = text.length): RefObject<HTMLTextAreaElement | null> {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  return { current: textarea }
}

function slashItemsRef(items: SlashItem[] = []): MutableRefObject<SlashItem[]> {
  return { current: items }
}

function defaultOptions(overrides: Partial<UseChatInputKeyDownOptions> = {}) {
  const text = overrides.value ?? ''
  return {
    disabled: false,
    recordingState: 'idle' as const,
    onStartRecording: vi.fn(),
    onStopRecording: vi.fn(),
    onVoiceStart: vi.fn(),
    atMenuOpen: false,
    atNavCount: 0,
    atHighlight: -1,
    atMenuTab: 'artifacts' as const,
    crossCampaignMode: false,
    atNavSlice: { kind: 'items' as const, items: [] },
    artifactRows: [],
    mediaRows: [],
    setAtMenuOpen: vi.fn(),
    setCrossCampaignMode: vi.fn(),
    setCrossCampaignId: vi.fn(),
    setAtHighlight: vi.fn(),
    setAtArtifactCollapsedByType: vi.fn(),
    setAtArtifactMoreByType: vi.fn(),
    setAtMediaCollapsedByType: vi.fn(),
    setAtMediaMoreByType: vi.fn(),
    onAtSelect: vi.fn(),
    slashMenuOpen: false,
    slashVisibleItems: [],
    slashHighlight: 0,
    setSlashMenuOpen: vi.fn(),
    setSlashHighlight: vi.fn(),
    onSlashSelect: vi.fn(),
    textareaRef: overrides.textareaRef ?? textareaRef(text),
    value: text,
    displayText: text,
    allSlashItemsRef: slashItemsRef(),
    setValue: vi.fn(),
    setDisplayText: vi.fn(),
    resizeTextarea: vi.fn(),
    hasPastedBlocks: false,
    queueLength: 0,
    onSendNow: vi.fn(),
    onSend: vi.fn(),
    ...overrides,
  } satisfies UseChatInputKeyDownOptions
}

describe('useChatInputKeyDown', () => {
  it('handles local composer shortcuts before send/menu behavior', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useChatInputKeyDown(options))
    const event = keyboardEvent('d', { metaKey: true })

    result.current(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(options.onStartRecording).toHaveBeenCalledOnce()
    expect(options.onSend).not.toHaveBeenCalled()
  })

  it('removes a known slash command on Backspace when the slash menu is closed', () => {
    const text = 'hello /brief '
    const ref = textareaRef(text)
    const options = defaultOptions({
      value: text,
      textareaRef: ref,
      allSlashItemsRef: slashItemsRef([slashItem('brief')]),
    })
    const { result } = renderHook(() => useChatInputKeyDown(options))
    const event = keyboardEvent('Backspace')

    result.current(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(options.setValue).toHaveBeenCalledWith('hello ')
    expect(ref.current?.selectionStart).toBe(6)
    expect(options.resizeTextarea).toHaveBeenCalledOnce()
  })

  it('uses Enter on an empty composer to send the queued item now', () => {
    const options = defaultOptions({ queueLength: 1 })
    const { result } = renderHook(() => useChatInputKeyDown(options))
    const event = keyboardEvent('Enter')

    result.current(event)

    expect(event.preventDefault).toHaveBeenCalled()
    expect(options.onSendNow).toHaveBeenCalledOnce()
    expect(options.onSend).not.toHaveBeenCalled()
  })

  it('uses Enter on a non-empty composer to send and ignores Shift Enter', () => {
    const options = defaultOptions({ value: 'hello' })
    const { result } = renderHook(() => useChatInputKeyDown(options))
    const enterEvent = keyboardEvent('Enter')

    result.current(enterEvent)

    expect(enterEvent.preventDefault).toHaveBeenCalled()
    expect(options.onSend).toHaveBeenCalledOnce()

    const shiftEnterEvent = keyboardEvent('Enter', { shiftKey: true })
    result.current(shiftEnterEvent)
    expect(shiftEnterEvent.preventDefault).not.toHaveBeenCalled()
    expect(options.onSend).toHaveBeenCalledOnce()
  })
})
