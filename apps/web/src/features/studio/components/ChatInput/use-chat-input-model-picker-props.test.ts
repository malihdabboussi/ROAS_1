import { act, renderHook } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LlmModelOption } from '@/features/studio/services/chat.service'
import { useChatInputModelPickerProps } from './use-chat-input-model-picker-props'

function createOptions(overrides?: {
  modelEditId?: string | null
  modelOptions?: LlmModelOption[]
  onSelectComposerModel?: (modelId: string) => void
  openModelEditPanelPosition?: (modelId: string) => void
}) {
  const modelOption = {
    id: 'model-1',
    label: 'Model One',
  } as LlmModelOption

  return {
    activeComposerModel: 'model-1',
    activeComposerModelLabel: 'Model One',
    activeComposerDisplayMeta: 'Fast',
    cortexMaxEnabled: false,
    standardModels: [modelOption],
    subscriptionModels: [],
    selectedContextWindowTokens: null,
    selectedReasoningEffort: null,
    fastModeEnabled: false,
    modelDropdownOpen: true,
    modelDropdownPos: { top: 10, left: 20 },
    modelHoverTarget: null,
    modelHoverPos: { top: 30, left: 40 },
    modelEditId: overrides?.modelEditId ?? 'model-1',
    modelEditPos: { top: 50, left: 60 },
    modelEditTooltip: null,
    modelButtonRef: createRef<HTMLButtonElement>(),
    modelDropdownRef: createRef<HTMLDivElement>(),
    subscriptionSubmenuRef: createRef<HTMLDivElement>(),
    modelHoverCardRef: createRef<HTMLDivElement>(),
    modelEditPanelRef: createRef<HTMLDivElement>(),
    portalTargetRef: createRef<HTMLElement>(),
    modelOptions: overrides?.modelOptions ?? [modelOption],
    onToggleDropdown: vi.fn(),
    onCloseDropdown: vi.fn(),
    onSelectComposerModel: overrides?.onSelectComposerModel ?? vi.fn(),
    onSetHoverTarget: vi.fn(),
    onPositionHoverCard: vi.fn(),
    openModelEditPanelPosition: overrides?.openModelEditPanelPosition ?? vi.fn(),
    onOpenWorkspaceModels: vi.fn(),
    onCortexMaxChange: vi.fn(),
    onSetFastModeEnabled: vi.fn(),
    onSetReasoningEffort: vi.fn(),
    onSetContextWindowTokens: vi.fn(),
    onShowModelEditTooltip: vi.fn(),
    onClearModelEditTooltip: vi.fn(),
    modelOption,
  }
}

describe('useChatInputModelPickerProps', () => {
  it('derives the editable model option for the active edit panel', () => {
    const options = createOptions()

    const { result } = renderHook(() => useChatInputModelPickerProps(options))

    expect(result.current.modelPickerProps.modelEditOption).toBe(options.modelOption)
    expect(result.current.modelPickerProps.activeComposerModelLabel).toBe('Model One')
    expect(result.current.modelPickerProps.onOpenWorkspaceModels).toBe(
      options.onOpenWorkspaceModels,
    )
  })

  it('selects the model before opening the edit panel positioner', () => {
    const onSelectComposerModel = vi.fn()
    const openModelEditPanelPosition = vi.fn()
    const options = createOptions({
      onSelectComposerModel,
      openModelEditPanelPosition,
    })

    const { result } = renderHook(() => useChatInputModelPickerProps(options))

    act(() => result.current.modelPickerProps.onOpenModelEditPanel('model-2'))

    expect(onSelectComposerModel).toHaveBeenCalledWith('model-2')
    expect(openModelEditPanelPosition).toHaveBeenCalledWith('model-2')
    const selectCallOrder = onSelectComposerModel.mock.invocationCallOrder[0]
    const positionCallOrder = openModelEditPanelPosition.mock.invocationCallOrder[0]
    expect(selectCallOrder).toBeDefined()
    expect(positionCallOrder).toBeDefined()
    expect(selectCallOrder!).toBeLessThan(positionCallOrder!)
  })
})
