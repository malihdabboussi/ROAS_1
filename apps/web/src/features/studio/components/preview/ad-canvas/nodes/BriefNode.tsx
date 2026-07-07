'use client'

import { memo, useCallback, useMemo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Info, Loader2, Wand2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { GenerationSourcePicker } from '../components/GenerationSourcePicker'
import { useAdCanvasNodeContext } from '../context/ad-canvas-node-context'
import { briefText } from '../lib/ad-canvas-brief-utils'
import { canvasAgentDescription } from '../lib/ad-canvas-campaign-agents'
import type { AdCanvasBriefPayload, AdCanvasFlowNodeData } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function BriefNodeComponent(props: NodeProps) {
  const { id } = props
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasBriefPayload
  const {
    onPayloadChange,
    onRunBrief,
    generationSource,
    onGenerationSourceChange,
    modelId,
    onModelIdChange,
    agentKey,
    onAgentKeyChange,
    campaignAgents,
  } = useAdCanvasNodeContext()
  const generating = d.status === 'generating'
  const isAgent = generationSource === 'agent'
  const selectedAgent = campaignAgents.find((a) => a.agentKey === agentKey)

  const agentInfoTooltip = useMemo(() => {
    const base =
      'Agent researches audience, offer/CTA, brand, attached assets, and reference — then spawns 4 strategy concepts on the canvas.'
    const detail = canvasAgentDescription(selectedAgent)
    if (!detail) return base
    return `${base} ${detail}`
  }, [selectedAgent])

  const patch = useCallback(
    (next: Partial<AdCanvasBriefPayload>) => {
      onPayloadChange(id, { ...payload, ...next })
    },
    [id, onPayloadChange, payload],
  )

  return (
    <BaseAdCanvasNode {...props} actions={[]} title="Brief" wide hideHeader>
      <div className="space-y-spacing-2">
        {payload.title ? (
          <p className="body-4 text-foreground emphasis-medium line-clamp-1 text-left">
            {payload.title}
          </p>
        ) : null}

        <GenerationSourcePicker
          compact
          source={generationSource}
          onSourceChange={onGenerationSourceChange}
          modelId={modelId}
          onModelIdChange={onModelIdChange}
          agentKey={agentKey}
          onAgentKeyChange={onAgentKeyChange}
          agents={campaignAgents}
        />

        <div className="space-y-spacing-1">
          <div className="gap-spacing-1 flex items-center">
            <label className="body-4 text-muted-foreground text-left">
              {isAgent ? 'Tell the agent what to build' : 'Campaign brief'}
            </label>
            {isAgent ? (
              <Tooltip label={agentInfoTooltip} wide side="top">
                <button
                  type="button"
                  className="btn-icon-bare nodrag text-muted-foreground hover:text-foreground"
                  aria-label="What the agent does"
                >
                  <Info className="icon-xs" />
                </button>
              </Tooltip>
            ) : null}
          </div>
          <textarea
            value={briefText(payload)}
            onChange={(e) => patch({ brief: e.target.value, text: e.target.value })}
            rows={isAgent ? 4 : 3}
            className="nodrag input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full resize-y"
            placeholder={
              isAgent
                ? 'e.g. Research our offer, define audience, and generate 4 ad concepts for cold Meta traffic'
                : 'What are we promoting and why now?'
            }
          />
        </div>

        {!isAgent ? (
          <>
            <div className="space-y-spacing-1">
              <label className="body-4 text-muted-foreground block text-left">
                Target audience
              </label>
              <textarea
                value={payload.audience ?? ''}
                onChange={(e) => patch({ audience: e.target.value })}
                rows={2}
                className="nodrag input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full resize-y"
                placeholder="Who they are, what they want"
              />
            </div>

            <div className="space-y-spacing-1">
              <label className="body-4 text-muted-foreground block text-left">Offer / CTA</label>
              <textarea
                value={payload.offer ?? ''}
                onChange={(e) => patch({ offer: e.target.value })}
                rows={2}
                className="nodrag input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full resize-y"
                placeholder="Hook, offer, how it should look on the ad"
              />
            </div>

            <div className="space-y-spacing-1">
              <label className="body-4 text-muted-foreground block text-left">Brand / colors</label>
              <textarea
                value={payload.brand_guidelines ?? ''}
                onChange={(e) => patch({ brand_guidelines: e.target.value })}
                rows={2}
                className="nodrag input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full resize-y"
                placeholder="Primary colors, tone, constraints"
              />
            </div>

            <div className="space-y-spacing-1">
              <label className="body-4 text-muted-foreground block text-left">
                Attached assets
              </label>
              <textarea
                value={payload.attached_assets ?? ''}
                onChange={(e) => patch({ attached_assets: e.target.value })}
                rows={2}
                className="nodrag input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full resize-y"
                placeholder="Headshot, product, book cover…"
              />
            </div>

            <div className="space-y-spacing-1">
              <label className="body-4 text-muted-foreground block text-left">
                Reference / inspiration
              </label>
              <textarea
                value={payload.reference_description ?? ''}
                onChange={(e) => patch({ reference_description: e.target.value })}
                rows={2}
                className="nodrag input-glass body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 w-full resize-y"
                placeholder="Optional — ad you like"
              />
            </div>
          </>
        ) : null}

        <button
          type="button"
          disabled={generating || (isAgent && campaignAgents.length === 0)}
          onClick={(e) => {
            e.stopPropagation()
            void onRunBrief(id)
          }}
          className="button-glass-blue body-4 nodrag gap-spacing-1 rounded-spacing-1 px-spacing-2 py-spacing-2 flex w-full items-center justify-center font-medium disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="icon-xs animate-spin" />
          ) : isAgent ? null : (
            <Wand2 className="icon-xs" />
          )}
          {isAgent ? 'Start' : 'Generate 4 concepts'}
        </button>

        {payload.concepts_text || payload.concept_text ? (
          <p className="body-4 text-muted-foreground line-clamp-2 text-left">
            {(payload.concepts_text ?? payload.concept_text ?? '').slice(0, 120)}
            {(payload.concepts_text ?? payload.concept_text ?? '').length > 120 ? '…' : ''}
          </p>
        ) : null}
      </div>
    </BaseAdCanvasNode>
  )
}

export const BriefNode = memo(BriefNodeComponent)
