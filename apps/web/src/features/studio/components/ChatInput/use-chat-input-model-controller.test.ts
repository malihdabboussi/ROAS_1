import { renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatInputModelController } from './use-chat-input-model-controller'
import { useChatInputModelMenu } from './use-chat-input-model-menu'
import { useChatInputModelOptions } from './use-chat-input-model-options'
import { useChatInputModelPickerProps } from './use-chat-input-model-picker-props'
import { useChatInputModelPrefs } from './use-chat-input-model-prefs'

vi.mock('./use-chat-input-model-menu', () => ({
  useChatInputModelMenu: vi.fn(),
}))

vi.mock('./use-chat-input-model-options', () => ({
  useChatInputModelOptions: vi.fn(),
}))

vi.mock('./use-chat-input-model-prefs', () => ({
  useChatInputModelPrefs: vi.fn(),
}))

vi.mock('./use-chat-input-model-picker-props', () => ({
  useChatInputModelPickerProps: vi.fn(),
}))

const mockUseChatInputModelMenu = vi.mocked(useChatInputModelMenu)
const mockUseChatInputModelOptions = vi.mocked(useChatInputModelOptions)
const mockUseChatInputModelPrefs = vi.mocked(useChatInputModelPrefs)
const mockUseChatInputModelPickerProps = vi.mocked(useChatInputModelPickerProps)

describe('useChatInputModelController', () => {
  let openWorkspaceSettings: ReturnType<typeof vi.fn>
  let modelButtonRef: ReturnType<typeof createRef<HTMLButtonElement>>
  let modelDropdownRef: ReturnType<typeof createRef<HTMLDivElement>>
  let subscriptionSubmenuRef: ReturnType<typeof createRef<HTMLDivElement>>
  let modelHoverCardRef: ReturnType<typeof createRef<HTMLDivElement>>
  let modelEditPanelRef: ReturnType<typeof createRef<HTMLDivElement>>
  let selectComposerModel: ReturnType<typeof vi.fn>
  let setSelectedContextWindowTokens: ReturnType<typeof vi.fn>

  beforeEach(() => {
    openWorkspaceSettings = vi.fn()
    modelButtonRef = createRef<HTMLButtonElement>()
    modelDropdownRef = createRef<HTMLDivElement>()
    subscriptionSubmenuRef = createRef<HTMLDivElement>()
    modelHoverCardRef = createRef<HTMLDivElement>()
    modelEditPanelRef = createRef<HTMLDivElement>()
    selectComposerModel = vi.fn()
    setSelectedContextWindowTokens = vi.fn()

    mockUseChatInputModelMenu.mockReturnValue({
      modelDropdownOpen: true,
      setModelDropdownOpen: vi.fn(),
      modelDropdownPos: { top: 10, left: 20 },
      modelButtonRef,
      modelDropdownRef,
      subscriptionSubmenuRef,
      modelHoverCardRef,
      modelEditPanelRef,
      modelHoverTarget: null,
      setModelHoverTarget: vi.fn(),
      modelHoverPos: { top: 30, left: 40 },
      modelEditId: 'model-a',
      modelEditPos: { top: 50, left: 60 },
      modelEditTooltip: null,
      toggleModelDropdown: vi.fn(),
      closeModelDropdown: vi.fn(),
      positionModelHoverCard: vi.fn(),
      openModelEditPanel: vi.fn(),
      showModelEditTooltip: vi.fn(),
      clearModelEditTooltip: vi.fn(),
    })

    mockUseChatInputModelOptions.mockReturnValue({
      modelOptions: [],
    })

    mockUseChatInputModelPrefs.mockReturnValue({
      selectedComposerModel: 'model-a',
      selectComposerModel,
      selectedContextWindowTokens: 128000,
      setSelectedContextWindowTokens,
      selectedReasoningEffort: 'medium',
      setSelectedReasoningEffort: vi.fn(),
      fastModeEnabled: true,
      setFastModeEnabled: vi.fn(),
      cortexMaxEnabled: true,
      setCortexMaxEnabled: vi.fn(),
      inheritedModel: 'auto',
      activeComposerModel: 'model-a',
      activeModelOption: undefined,
      activeComposerModelLabel: 'Model A',
      activeComposerDisplayMeta: 'Fast',
      activeModelSettings: { contextWindowTokens: 128000 },
      selectedContextOption: null,
    } as never)

    mockUseChatInputModelPickerProps.mockReturnValue({
      modelPickerProps: {
        activeComposerModel: 'model-a',
      } as never,
    })
  })

  it('wires model menu, option loading, preferences, settings, and picker props together', () => {
    const portalTargetRef = createRef<HTMLElement>()

    const { result } = renderHook(() =>
      useChatInputModelController({
        conversationId: 'conversation-1',
        defaultModel: 'model-a',
        defaultModelSettings: null,
        campaignModelStrategy: 'auto',
        portalTargetRef,
        onOpenWorkspaceModels: () => openWorkspaceSettings('models'),
      }),
    )

    expect(mockUseChatInputModelMenu).toHaveBeenCalledWith({ modelOptionsLength: 0 })
    expect(mockUseChatInputModelOptions).toHaveBeenCalledWith({
      modelDropdownOpen: true,
      onModelOptionsChange: expect.any(Function),
    })
    expect(mockUseChatInputModelPrefs).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      defaultModel: 'model-a',
      defaultModelSettings: null,
      campaignModelStrategy: 'auto',
      modelOptions: [],
    })
    expect(mockUseChatInputModelPickerProps).toHaveBeenCalledWith(
      expect.objectContaining({
        activeComposerModel: 'model-a',
        activeComposerModelLabel: 'Model A',
        activeComposerDisplayMeta: 'Fast',
        standardModels: [],
        subscriptionModels: [],
        modelDropdownOpen: true,
        modelDropdownPos: { top: 10, left: 20 },
        modelButtonRef,
        modelDropdownRef,
        subscriptionSubmenuRef,
        modelHoverCardRef,
        modelEditPanelRef,
        portalTargetRef,
        modelOptions: [],
        onSelectComposerModel: selectComposerModel,
        onSetContextWindowTokens: setSelectedContextWindowTokens,
      }),
    )

    const modelPickerOptions = mockUseChatInputModelPickerProps.mock.calls[0]?.[0]
    modelPickerOptions?.onOpenWorkspaceModels()
    expect(openWorkspaceSettings).toHaveBeenCalledWith('models')

    expect(result.current.modelDropdownOpen).toBe(true)
    expect(result.current.modelButtonRef).toBe(modelButtonRef)
    expect(result.current.modelDropdownRef).toBe(modelDropdownRef)
    expect(result.current.activeComposerModel).toBe('model-a')
    expect(result.current.activeModelSettings).toEqual({ contextWindowTokens: 128000 })
    expect(result.current.modelOptions).toEqual([])
    expect(result.current.modelPickerProps).toEqual({ activeComposerModel: 'model-a' })
  })
})
