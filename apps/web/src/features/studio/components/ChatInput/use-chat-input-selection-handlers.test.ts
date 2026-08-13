import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuickMissionsLauncherStore } from '@/lib/missions'
import type { MessageReference } from '../../types'
import type { AttachedArtifact } from '../chat/ArtifactAttachments'
import type { AtMentionItem } from './chat-input-at-mentions'
import type { SlashItem } from './chat-input-slash-menu'
import { useChatInputSelectionHandlers } from './use-chat-input-selection-handlers'

function textareaAt(text: string, cursor = text.length) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.selectionStart = cursor
  textarea.selectionEnd = cursor
  return { current: textarea }
}

function slashItem(key = 'summarize'): SlashItem {
  return {
    id: key,
    key,
    name: key,
    description: 'Run command',
    type: 'skill',
  }
}

function artifactItem(overrides: Partial<AtMentionItem> = {}): AtMentionItem {
  return {
    id: 'artifact-1',
    label: 'Offer Brief',
    section: 'artifact',
    type: 'offer',
    ...overrides,
  }
}

function defaultOptions(text = '') {
  return {
    textareaRef: textareaAt(text),
    recordingState: 'idle' as const,
    value: text,
    displayText: text,
    setValue: vi.fn(),
    setDisplayText: vi.fn(),
    setSlashMenuOpen: vi.fn(),
    setAtMenuOpen: vi.fn(),
    setCrossCampaignMode: vi.fn(),
    setCrossCampaignId: vi.fn(),
    setAtItems: vi.fn(),
    setAtQuery: vi.fn(),
    setAtMenuTab: vi.fn(),
    setAtHighlight: vi.fn(),
    setAttachedReferences: vi.fn(),
    setAttachedArtifacts: vi.fn(),
    attachComposerSpaceTask: vi.fn(),
  }
}

describe('useChatInputSelectionHandlers', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useQuickMissionsLauncherStore.setState({ open: false, playbookKey: null })
  })

  it('selects a slash item by replacing the active slash token and closing the slash menu', () => {
    const options = defaultOptions('please /sum')
    const { result } = renderHook(() => useChatInputSelectionHandlers(options))

    act(() => result.current.handleSlashSelect(slashItem()))

    expect(options.setValue).toHaveBeenCalledWith('please /summarize ')
    expect(options.setSlashMenuOpen).toHaveBeenCalledWith(false)
  })

  it('opens a playbook through the durable mission launcher state', () => {
    const options = defaultOptions('/client-strategy')
    const { result } = renderHook(() => useChatInputSelectionHandlers(options))

    act(() =>
      result.current.handleSlashSelect({
        id: 'client-strategy',
        key: 'client-strategy',
        name: 'Client Strategy',
        description: 'Run strategy',
        type: 'playbook',
      }),
    )

    expect(options.setSlashMenuOpen).toHaveBeenCalledWith(false)
    expect(useQuickMissionsLauncherStore.getState()).toMatchObject({
      open: true,
      playbookKey: 'client-strategy',
    })
  })

  it('selects a campaign by restoring the @ token and resetting campaign menu state', () => {
    const options = defaultOptions('open @olympus')
    const { result } = renderHook(() => useChatInputSelectionHandlers(options))

    act(() => result.current.handleCampaignSelect({ id: 'campaign-1', name: 'Olympus' }))

    expect(options.setCrossCampaignMode).toHaveBeenCalledWith(true)
    expect(options.setCrossCampaignId).toHaveBeenCalledWith('campaign-1')
    expect(options.setValue).toHaveBeenCalledWith('open @')
    expect(options.setAtItems).toHaveBeenCalledWith([])
    expect(options.setAtQuery).toHaveBeenCalledWith('')
    expect(options.setAtMenuTab).toHaveBeenCalledWith('artifacts')
    expect(options.setAtHighlight).toHaveBeenCalledWith(-1)
  })

  it('selects an artifact mention by closing @ state and appending reference/artifact chips', () => {
    const options = defaultOptions('use @brief')
    const { result } = renderHook(() => useChatInputSelectionHandlers(options))

    act(() => result.current.handleAtSelect(artifactItem()))

    expect(options.setValue).toHaveBeenCalledWith('use ')
    expect(options.setAtMenuOpen).toHaveBeenCalledWith(false)
    expect(options.setCrossCampaignMode).toHaveBeenCalledWith(false)
    expect(options.setCrossCampaignId).toHaveBeenCalledWith(null)
    const referenceUpdater = options.setAttachedReferences.mock.calls[0]?.[0] as (
      references: MessageReference[],
    ) => MessageReference[]
    const artifactUpdater = options.setAttachedArtifacts.mock.calls[0]?.[0] as (
      artifacts: AttachedArtifact[],
    ) => AttachedArtifact[]
    expect(referenceUpdater([])).toEqual([
      { kind: 'artifact', id: 'artifact-1', label: 'Offer Brief', type: 'offer' },
    ])
    expect(artifactUpdater([])).toEqual([{ id: 'artifact-1', label: 'Offer Brief', type: 'offer' }])
  })

  it('selects a space task mention by attaching the task without adding reference chips', () => {
    const options = defaultOptions('assign @task')
    const { result } = renderHook(() => useChatInputSelectionHandlers(options))

    act(() =>
      result.current.handleAtSelect(
        artifactItem({ id: 'task-1', label: 'Launch task', section: 'space-task' }),
      ),
    )

    expect(options.setValue).toHaveBeenCalledWith('assign ')
    expect(options.setAtMenuOpen).toHaveBeenCalledWith(false)
    expect(options.attachComposerSpaceTask).toHaveBeenCalledWith('task-1', 'Launch task')
    expect(options.setAttachedReferences).not.toHaveBeenCalled()
    expect(options.setAttachedArtifacts).not.toHaveBeenCalled()
  })
})
