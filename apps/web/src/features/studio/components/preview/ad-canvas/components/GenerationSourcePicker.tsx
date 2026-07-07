'use client'

import {
  DEFAULT_IMAGE_MODEL_ID,
  IMAGE_MODELS,
  type ImageModelDefinition,
} from '@vibey/api-shared/image-models'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { SettingsDropdown } from '@/features/studio/components/preview/SettingsDropdown'
import type { AdCanvasAgentOption, GenerationSource } from '../types/ad-canvas.types'

export interface GenerationSourcePickerProps {
  source: GenerationSource
  onSourceChange: (source: GenerationSource) => void
  modelId: string
  onModelIdChange: (modelId: string) => void
  agentKey: string
  onAgentKeyChange: (agentKey: string) => void
  agents: AdCanvasAgentOption[]
  compact?: boolean
}

export function GenerationSourcePicker({
  source,
  onSourceChange,
  modelId,
  onModelIdChange,
  agentKey,
  onAgentKeyChange,
  agents,
  compact = false,
}: GenerationSourcePickerProps) {
  const resolvedAgentKey =
    agentKey && agents.some((a) => a.agentKey === agentKey) ? agentKey : (agents[0]?.agentKey ?? '')

  const agentOptions = agents.map((a) => ({
    value: a.agentKey,
    label: a.displayName,
    description: a.role,
  }))

  return (
    <div className={compact ? 'space-y-spacing-1' : 'space-y-spacing-2'}>
      <Tabs value={source} onValueChange={(v) => onSourceChange(v as GenerationSource)}>
        <TabsList variant="liquid" className="nodrag w-full">
          <TabsTrigger value="direct" className="nodrag px-spacing-2 flex-1">
            Direct
          </TabsTrigger>
          <TabsTrigger value="agent" className="nodrag px-spacing-2 flex-1">
            Agent
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {source === 'direct' ? (
        <select
          value={modelId || DEFAULT_IMAGE_MODEL_ID}
          onChange={(e) => onModelIdChange(e.target.value)}
          className="nodrag input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {IMAGE_MODELS.map((m: ImageModelDefinition) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="nodrag" onMouseDown={(e) => e.stopPropagation()}>
          <SettingsDropdown
            value={resolvedAgentKey}
            options={agentOptions}
            onChange={onAgentKeyChange}
            placeholder="No agents on this campaign"
            disabled={agents.length === 0}
            compact={compact}
          />
        </div>
      )}
    </div>
  )
}
