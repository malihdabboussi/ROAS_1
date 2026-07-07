import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputModelPickerView } from './chat-input-model-picker-view'
import type {
  LlmModelOption,
  ModelReasoningEffort,
} from '@/features/studio/services/chat.service'

afterEach(cleanup)

function modelOption(overrides: Partial<LlmModelOption> = {}): LlmModelOption {
  return {
    id: 'anthropic/claude',
    provider: 'anthropic',
    modelName: 'claude',
    label: 'Claude',
    contextWindow: 200_000,
    maxOutputTokens: null,
    supportsImages: true,
    inputModalities: ['text'],
    outputModalities: ['text'],
    supportedParameters: [],
    contextOptions: [{ tokens: 200_000, label: '200k' }],
    reasoningLevels: ['none'],
    speedModes: ['standard'],
    pricing: {},
    pricingTiers: [],
    ...overrides,
  }
}

function createModelPickerProps(
  overrides: Partial<Parameters<typeof ChatInputModelPickerView>[0]> = {},
) {
  const editableModel = modelOption({
    id: 'anthropic/claude-sonnet',
    label: 'Claude Sonnet',
    contextOptions: [
      { tokens: 200_000, label: '200k' },
      { tokens: 1_000_000, label: '1M', pricingProfile: 'extended' },
    ],
    reasoningLevels: ['none', 'medium', 'high'],
    speedModes: ['standard', 'fast'],
  })
  const props: Parameters<typeof ChatInputModelPickerView>[0] = {
    activeComposerModel: editableModel.id,
    activeComposerModelLabel: 'Claude Sonnet',
    activeComposerDisplayMeta: '1M High Fast',
    cortexMaxEnabled: true,
    standardModels: [editableModel, modelOption({ id: 'openai/gpt-mini', label: 'GPT Mini' })],
    subscriptionModels: [],
    selectedContextWindowTokens: 1_000_000,
    selectedReasoningEffort: 'high',
    fastModeEnabled: true,
    modelDropdownOpen: true,
    modelDropdownPos: { top: 10, left: 20 },
    modelHoverTarget: null,
    modelHoverPos: { top: 30, left: 40 },
    modelEditId: null,
    modelEditOption: undefined,
    modelEditPos: { top: 50, left: 60 },
    modelEditTooltip: null,
    modelButtonRef: createRef(),
    modelDropdownRef: createRef(),
    subscriptionSubmenuRef: createRef(),
    modelHoverCardRef: createRef(),
    modelEditPanelRef: createRef(),
    portalTargetRef: undefined,
    onToggleDropdown: vi.fn(),
    onCloseDropdown: vi.fn(),
    onSelectComposerModel: vi.fn(),
    onSetHoverTarget: vi.fn(),
    onPositionHoverCard: vi.fn(),
    onOpenModelEditPanel: vi.fn(),
    onOpenWorkspaceModels: vi.fn(),
    onCortexMaxChange: vi.fn(),
    onSetFastModeEnabled: vi.fn(),
    onSetReasoningEffort: vi.fn(),
    onSetContextWindowTokens: vi.fn(),
    onShowModelEditTooltip: vi.fn(),
    onClearModelEditTooltip: vi.fn(),
    ...overrides,
  }
  return props
}

function renderModelPicker(
  overrides: Partial<Parameters<typeof ChatInputModelPickerView>[0]> = {},
) {
  const props = createModelPickerProps(overrides)
  return { props, ...render(<ChatInputModelPickerView {...props} />) }
}

describe('ChatInputModelPickerView', () => {
  it('server-renders the closed picker without a document', () => {
    const originalDocument = globalThis.document
    vi.stubGlobal('document', undefined)

    try {
      const props = createModelPickerProps({ modelDropdownOpen: false })
      expect(() => renderToString(<ChatInputModelPickerView {...props} />)).not.toThrow()
    } finally {
      vi.stubGlobal('document', originalDocument)
    }
  })

  it('renders trigger, strategies, models, and delegates selection behavior', () => {
    const onToggleDropdown = vi.fn()
    const onSelectComposerModel = vi.fn()
    const onCloseDropdown = vi.fn()
    const onOpenWorkspaceModels = vi.fn()
    renderModelPicker({
      onToggleDropdown,
      onSelectComposerModel,
      onCloseDropdown,
      onOpenWorkspaceModels,
    })

    fireEvent.click(screen.getAllByRole('button', { name: /claude sonnet/i })[0]!)
    expect(onToggleDropdown).toHaveBeenCalledTimes(1)
    expect(screen.getAllByText('1M High Fast').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Cortex Max')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /economy/i }))
    expect(onSelectComposerModel).toHaveBeenCalledWith('auto:economy')
    expect(onCloseDropdown).toHaveBeenCalledTimes(1)

    onCloseDropdown.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /gpt mini/i }))
    expect(onSelectComposerModel).toHaveBeenCalledWith('openai/gpt-mini')
    expect(onCloseDropdown).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /add models/i }))
    expect(onOpenWorkspaceModels).toHaveBeenCalledTimes(1)
  })

  it('delegates hover, cortex, editable model, context, and reasoning controls', () => {
    const editableModel = modelOption({
      id: 'anthropic/claude-sonnet',
      label: 'Claude Sonnet',
      contextOptions: [
        { tokens: 200_000, label: '200k' },
        { tokens: 1_000_000, label: '1M', pricingProfile: 'extended' },
      ],
      reasoningLevels: ['none', 'medium', 'high'],
      speedModes: ['standard', 'fast'],
    })
    const onSetHoverTarget = vi.fn()
    const onPositionHoverCard = vi.fn()
    const onOpenModelEditPanel = vi.fn()
    const onCortexMaxChange = vi.fn()
    const onSetFastModeEnabled = vi.fn()
    const onSetReasoningEffort = vi.fn()
    const onSetContextWindowTokens = vi.fn()
    const onShowModelEditTooltip = vi.fn()
    const onClearModelEditTooltip = vi.fn()
    renderModelPicker({
      modelEditId: editableModel.id,
      modelEditOption: editableModel,
      onSetHoverTarget,
      onPositionHoverCard,
      onOpenModelEditPanel,
      onCortexMaxChange,
      onSetFastModeEnabled,
      onSetReasoningEffort,
      onSetContextWindowTokens,
      onShowModelEditTooltip,
      onClearModelEditTooltip,
    })

    const cortexRow = screen.getByText('Cortex Max').closest('div')!
    fireEvent.mouseEnter(cortexRow)
    expect(onSetHoverTarget).toHaveBeenCalledWith({ kind: 'cortex' })
    expect(onPositionHoverCard).toHaveBeenCalledWith(cortexRow)
    fireEvent.click(within(cortexRow).getByRole('switch'))
    expect(onCortexMaxChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onOpenModelEditPanel).toHaveBeenCalledWith(editableModel.id)

    const fastRow = screen.getByText('Fast mode').closest('div')!
    fireEvent.mouseEnter(fastRow)
    expect(onShowModelEditTooltip).toHaveBeenCalledWith(
      fastRow,
      '2x more expensive, but significantly faster speeds.',
    )
    fireEvent.mouseLeave(fastRow)
    expect(onClearModelEditTooltip).toHaveBeenCalledTimes(1)
    fireEvent.click(within(fastRow).getByRole('switch'))
    expect(onSetFastModeEnabled).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: /200k/i }))
    expect(onSetContextWindowTokens).toHaveBeenCalledWith(200_000)

    fireEvent.click(screen.getByRole('button', { name: /^medium$/i }))
    expect(onSetReasoningEffort).toHaveBeenCalledWith('medium' satisfies ModelReasoningEffort)
  })

  it('renders hover and edit tooltip portals with tokenized width classes', () => {
    renderModelPicker({
      modelHoverTarget: { kind: 'cortex' },
    })

    expect(screen.getByText('Turn off for lighter, faster replies that skip deep memory context.'))
      .toBeTruthy()

    cleanup()
    renderModelPicker({
      modelEditId: 'anthropic/claude-sonnet',
      modelEditTooltip: { text: 'Context size the model has available.', top: 12, left: 24 },
    })

    expect(screen.getByText('Context size the model has available.')).toBeTruthy()
    expect(
      screen.getByText('Context size the model has available.').closest('.dropdown-menu-solid')
        ?.className,
    ).toContain('w-56')
  })
})
