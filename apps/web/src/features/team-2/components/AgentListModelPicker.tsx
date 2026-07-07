'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ComposerModelPicker } from '@/components/chat/model-picker/ComposerModelPicker'
import {
  formatModelRowMeta,
  resolveModelPickerState,
} from '@/lib/chat/composer-model-picker'
import type { MissionAgent } from '@/lib/agents'
import { agentModelSettings } from '@/lib/agents/agent-team-display'
import {
  agentModelId,
  isModelStrategyId,
  resolveAgentModelDisplay,
} from '@/lib/agents/model-strategies'
import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'

export function AgentListModelPicker({
  agent,
  modelOptions,
  disabled,
  onModelChange,
}: {
  agent: MissionAgent
  modelOptions: LlmModelOption[]
  disabled: boolean
  onModelChange: (
    agentKey: string,
    modelId: string,
    modelSettings: ChatModelSettings | null,
  ) => void | Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modelId = agentModelId(agent)
  const modelSettings = agentModelSettings(agent)

  if (disabled) {
    const label = resolveAgentModelDisplay(modelId, modelOptions).label
    const option = modelOptions.find((row) => row.id === modelId)
    const meta =
      option && !isModelStrategyId(modelId)
        ? formatModelRowMeta(option, {
            isSelected: true,
            ...resolveModelPickerState(modelId, modelSettings, modelOptions),
          })
        : null
    return (
      <span className="body-4 text-muted-foreground min-w-0 truncate">
        {label}
        {meta ? ` · ${meta}` : ''}
      </span>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      <ComposerModelPicker
        modelOptions={modelOptions}
        value={{ modelId, modelSettings }}
        disabled={false}
        saving={saving}
        onChange={async (next) => {
          setSaving(true)
          setError(null)
          try {
            await onModelChange(agent.agent_key, next.modelId, next.modelSettings)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not update model')
            throw err
          } finally {
            setSaving(false)
          }
        }}
        renderTrigger={({ label, meta, open }) => (
          <>
            <span className="body-4 text-muted-foreground min-w-0 truncate">{label}</span>
            {meta ? <span className="body-4 text-muted-foreground shrink-0">{meta}</span> : null}
            <ChevronDown
              className={`icon-xs text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </>
        )}
      />
      {error ? <span className="body-4 text-destructive truncate">{error}</span> : null}
    </div>
  )
}
