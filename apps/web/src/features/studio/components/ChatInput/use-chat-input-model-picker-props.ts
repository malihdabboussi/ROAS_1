import { useCallback } from 'react'
import type { LlmModelOption } from '@/features/studio/services/chat.service'
import type { ChatInputModelPickerViewProps } from './chat-input-model-picker-view'

interface UseChatInputModelPickerPropsOptions
  extends Omit<
    ChatInputModelPickerViewProps,
    'modelEditOption' | 'onOpenModelEditPanel'
  > {
  modelOptions: LlmModelOption[]
  openModelEditPanelPosition: (modelId: string) => void
}

export function useChatInputModelPickerProps({
  modelOptions,
  modelEditId,
  onSelectComposerModel,
  openModelEditPanelPosition,
  ...modelPickerProps
}: UseChatInputModelPickerPropsOptions) {
  const openModelEditPanel = useCallback(
    (modelId: string) => {
      onSelectComposerModel(modelId)
      openModelEditPanelPosition(modelId)
    },
    [onSelectComposerModel, openModelEditPanelPosition],
  )

  const modelEditOption = modelEditId
    ? modelOptions.find((option) => option.id === modelEditId)
    : undefined

  return {
    modelPickerProps: {
      ...modelPickerProps,
      modelEditId,
      modelEditOption,
      onSelectComposerModel,
      onOpenModelEditPanel: openModelEditPanel,
    },
  }
}
