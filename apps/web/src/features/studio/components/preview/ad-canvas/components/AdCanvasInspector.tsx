'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, PanelRightClose } from 'lucide-react'
import { AD_STRATEGIES, type AdStrategyDefinition } from '@vibey/api-shared/ad-strategies'
import { AdSettingsPanel } from '@/features/studio/components/preview/AdSettingsPanel'
import type { Ad } from '@/features/studio/types'
import { canvasAgentDescription } from '../lib/ad-canvas-campaign-agents'
import { promoteCanvasNode } from '../services/ad-canvas.service'
import type {
  AdCanvasAgentOption,
  AdCanvasFlowNode,
  AdCanvasNodeAction,
  AdCanvasStrategyPayload,
  GenerationSource,
} from '../types/ad-canvas.types'
import { GenerationSourcePicker } from './GenerationSourcePicker'

export interface AdCanvasInspectorProps {
  open: boolean
  onToggle: () => void
  selectedNode: AdCanvasFlowNode | null
  adId: string
  initialAd: Ad
  onAdUpdated: (ad: Ad) => void
  publishHostEl?: HTMLDivElement | null
  refreshHostEl?: HTMLDivElement | null
  generationSource: GenerationSource
  onGenerationSourceChange: (source: GenerationSource) => void
  modelId: string
  onModelIdChange: (id: string) => void
  agentKey: string
  onAgentKeyChange: (key: string) => void
  campaignAgents: AdCanvasAgentOption[]
  onRunAction: (nodeId: string, action: AdCanvasNodeAction) => void
  onPayloadChange?: (nodeId: string, payload: Record<string, unknown>) => void
}

export function AdCanvasInspector({
  open,
  onToggle,
  selectedNode,
  adId,
  initialAd,
  onAdUpdated,
  publishHostEl,
  refreshHostEl,
  generationSource,
  onGenerationSourceChange,
  modelId,
  onModelIdChange,
  agentKey,
  onAgentKeyChange,
  campaignAgents,
  onRunAction,
  onPayloadChange,
}: AdCanvasInspectorProps) {
  const [promoting, setPromoting] = useState(false)
  const prompt =
    typeof (selectedNode?.data.payload as { prompt?: string } | undefined)?.prompt === 'string'
      ? ((selectedNode?.data.payload as { prompt?: string }).prompt ?? '')
      : ''

  useEffect(() => {
    // reset local-only state when selection changes
    setPromoting(false)
  }, [selectedNode?.id])

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="border-border card-glass absolute right-0 top-1/2 z-10 flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0"
        aria-label="Open inspector"
      >
        <ChevronRight className="icon-sm text-muted-foreground" />
      </button>
    )
  }

  const isAdNode = selectedNode?.data.kind === 'ad'
  const isBriefNode = selectedNode?.data.kind === 'brief'
  const resolvedAdId = selectedNode?.data.ad_id ?? adId
  const selectedAgent = campaignAgents.find((a) => a.agentKey === agentKey)

  return (
    <aside className="border-border card-glass flex h-full w-[320px] shrink-0 flex-col border-l">
      <div className="border-border flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="body-3 text-foreground font-medium">Inspector</span>
        <button
          type="button"
          onClick={onToggle}
          className="btn-icon-bare"
          aria-label="Collapse inspector"
        >
          <PanelRightClose className="icon-sm" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isAdNode ? (
          <>
            <div className="border-border px-spacing-3 py-spacing-2 border-b">
              <button
                type="button"
                disabled={promoting || !selectedNode}
                onClick={async () => {
                  if (!selectedNode) return
                  setPromoting(true)
                  try {
                    const result = await promoteCanvasNode(selectedNode.id)
                    if (result.ad && typeof result.ad === 'object') {
                      onAdUpdated({ ...initialAd, ...(result.ad as Partial<Ad>) })
                    }
                  } finally {
                    setPromoting(false)
                  }
                }}
                className="button-glass-accent body-4 rounded-spacing-1 px-spacing-3 py-spacing-2 w-full disabled:opacity-50"
              >
                {promoting ? 'Saving…' : 'Save as Ad'}
              </button>
            </div>
            <AdSettingsPanel
              adId={resolvedAdId}
              onAdUpdated={onAdUpdated}
              initialAd={initialAd}
              publishHostEl={publishHostEl}
              refreshHostEl={refreshHostEl}
            />
          </>
        ) : isBriefNode ? (
          <div className="text-muted-foreground p-spacing-4 flex flex-1 items-center justify-center text-center">
            <p className="body-3">Edit the brief directly on the canvas card.</p>
          </div>
        ) : selectedNode ? (
          <div className="p-spacing-3 flex flex-1 flex-col overflow-y-auto">
            <p className="typo-caption text-muted-foreground mb-spacing-2 capitalize">
              {selectedNode.data.kind.replace(/_/g, ' ')}
            </p>

            <GenerationSourcePicker
              source={generationSource}
              onSourceChange={onGenerationSourceChange}
              modelId={modelId}
              onModelIdChange={onModelIdChange}
              agentKey={agentKey}
              onAgentKeyChange={onAgentKeyChange}
              agents={campaignAgents}
            />

            {selectedNode.data.kind === 'strategy' ? (
              <div className="mt-spacing-3">
                <label className="typo-caption text-muted-foreground mb-spacing-1 block">
                  Strategy
                </label>
                <select
                  value={(selectedNode.data.payload as AdCanvasStrategyPayload).strategy_key ?? ''}
                  onChange={(e) =>
                    onPayloadChange?.(selectedNode.id, {
                      ...selectedNode.data.payload,
                      strategy_key: e.target.value || undefined,
                    })
                  }
                  className="input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full"
                >
                  <option value="">Select strategy</option>
                  {AD_STRATEGIES.map((s: AdStrategyDefinition) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="mt-spacing-3">
              <label className="typo-caption text-muted-foreground mb-spacing-1 block">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) =>
                  onPayloadChange?.(selectedNode.id, {
                    ...selectedNode.data.payload,
                    prompt: e.target.value,
                  })
                }
                rows={4}
                className="input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full resize-none"
                placeholder="Describe what to generate..."
              />
            </div>

            <div className="mt-spacing-3 flex flex-wrap gap-2">
              {(['generate', 'edit', 'variation'] as AdCanvasNodeAction[]).map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => {
                    onPayloadChange?.(selectedNode.id, {
                      ...selectedNode.data.payload,
                      prompt,
                    })
                    onRunAction(selectedNode.id, action)
                  }}
                  className="button-glass-accent body-4 rounded-spacing-1 px-spacing-3 py-spacing-2 capitalize"
                >
                  {action}
                </button>
              ))}
            </div>

            {generationSource === 'agent' && selectedAgent ? (
              <p className="text-muted-foreground mt-spacing-2 text-[11px]">
                {canvasAgentDescription(selectedAgent)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="text-muted-foreground p-spacing-4 flex flex-1 items-center justify-center text-center">
            <p className="body-3">Select a node to inspect</p>
          </div>
        )}
      </div>
    </aside>
  )
}
