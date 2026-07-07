import { useMemo, useState, type RefObject } from 'react'
import type {
  ChatModelSettings,
  LlmModelOption,
} from '@/features/studio/services/chat.service'
import { partitionModelOptions } from '../../lib/subscription-model-options'
import { useChatInputModelMenu } from './use-chat-input-model-menu'
import { useChatInputModelOptions } from './use-chat-input-model-options'
import { useChatInputModelPickerProps } from './use-chat-input-model-picker-props'
import { useChatInputModelPrefs } from './use-chat-input-model-prefs'

interface UseChatInputModelControllerOptions {
  conversationId: string | null
  defaultModel: string | null
  defaultModelSettings: ChatModelSettings | null
  campaignModelStrategy: string | null
  portalTargetRef?: RefObject<HTMLElement | null>
  onOpenWorkspaceModels: () => void
}

export function useChatInputModelController({
  conversationId,
  defaultModel,
  defaultModelSettings,
  campaignModelStrategy,
  portalTargetRef,
  onOpenWorkspaceModels,
}: UseChatInputModelControllerOptions) {
  const [modelOptions, setModelOptions] = useState<LlmModelOption[]>([])
  const { standardModels, subscriptionModels } = useMemo(
    () => partitionModelOptions(modelOptions),
    [modelOptions],
  )
  const {
    modelDropdownOpen,
    setModelDropdownOpen,
    modelDropdownPos,
    modelButtonRef,
    modelDropdownRef,
    subscriptionSubmenuRef,
    modelHoverCardRef,
    modelEditPanelRef,
    modelHoverTarget,
    setModelHoverTarget,
    modelHoverPos,
    modelEditId,
    modelEditPos,
    modelEditTooltip,
    toggleModelDropdown,
    closeModelDropdown,
    positionModelHoverCard,
    openModelEditPanel: openModelEditPanelPosition,
    showModelEditTooltip,
    clearModelEditTooltip,
  } = useChatInputModelMenu({ modelOptionsLength: modelOptions.length })

  useChatInputModelOptions({
    modelDropdownOpen,
    onModelOptionsChange: setModelOptions,
  })

  const {
    selectedContextWindowTokens,
    setSelectedContextWindowTokens,
    selectedReasoningEffort,
    setSelectedReasoningEffort,
    fastModeEnabled,
    setFastModeEnabled,
    cortexMaxEnabled,
    setCortexMaxEnabled,
    selectComposerModel,
    activeComposerModel,
    activeModelOption,
    activeComposerModelLabel,
    activeComposerDisplayMeta,
    activeModelSettings,
    selectedContextOption,
  } = useChatInputModelPrefs({
    conversationId,
    defaultModel,
    defaultModelSettings,
    campaignModelStrategy,
    modelOptions,
  })

  const { modelPickerProps } = useChatInputModelPickerProps({
    activeComposerModel,
    activeComposerModelLabel,
    activeComposerDisplayMeta,
    cortexMaxEnabled,
    standardModels,
    subscriptionModels,
    selectedContextWindowTokens,
    selectedReasoningEffort,
    fastModeEnabled,
    modelDropdownOpen,
    modelDropdownPos,
    modelHoverTarget,
    modelHoverPos,
    modelEditId,
    modelEditPos,
    modelEditTooltip,
    modelButtonRef,
    modelDropdownRef,
    subscriptionSubmenuRef,
    modelHoverCardRef,
    modelEditPanelRef,
    portalTargetRef,
    modelOptions,
    onToggleDropdown: toggleModelDropdown,
    onCloseDropdown: closeModelDropdown,
    onSelectComposerModel: selectComposerModel,
    onSetHoverTarget: setModelHoverTarget,
    onPositionHoverCard: positionModelHoverCard,
    openModelEditPanelPosition,
    onOpenWorkspaceModels,
    onCortexMaxChange: setCortexMaxEnabled,
    onSetFastModeEnabled: setFastModeEnabled,
    onSetReasoningEffort: setSelectedReasoningEffort,
    onSetContextWindowTokens: setSelectedContextWindowTokens,
    onShowModelEditTooltip: showModelEditTooltip,
    onClearModelEditTooltip: clearModelEditTooltip,
  })

  return {
    modelOptions,
    modelDropdownOpen,
    setModelDropdownOpen,
    modelButtonRef,
    modelDropdownRef,
    subscriptionSubmenuRef,
    modelHoverCardRef,
    modelEditPanelRef,
    activeComposerModel,
    activeModelOption,
    activeModelSettings,
    selectedContextOption,
    modelPickerProps,
  }
}
