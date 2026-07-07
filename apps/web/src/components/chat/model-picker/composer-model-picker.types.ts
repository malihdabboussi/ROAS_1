import type { ReactNode } from 'react'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'

export type ComposerModelHoverTarget =
  | { kind: 'strategy'; id: string }
  | { kind: 'model'; id: string }

export interface ComposerModelEditTooltip {
  text: string
  top: number
  left: number
}

export interface ComposerModelPickerValue {
  modelId: string
  modelSettings: ChatModelSettings | null
}

export interface ComposerModelPickerProps {
  modelOptions: LlmModelOption[]
  value: ComposerModelPickerValue
  onChange: (next: ComposerModelPickerValue) => void | Promise<void>
  disabled?: boolean
  saving?: boolean
  triggerClassName?: string
  renderTrigger?: (params: {
    label: string
    meta: string | null
    open: boolean
    saving: boolean
  }) => ReactNode
}
