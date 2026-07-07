'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { toast } from 'sonner'
import { AD_STRATEGIES } from '@vibey/api-shared/ad-strategies'
import { DEFAULT_IMAGE_MODEL_ID } from '@vibey/api-shared/image-models'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  type AdPlacement,
  type AdPlatform,
} from '@/features/studio/components/preview/ad-preview/ad-preview.types'
import type { Ad } from '@/features/studio/types'
import { extractConceptBodies } from '@/features/studio/utils/ad-concept-concepts'
import { generateAdConcepts } from '@/lib/services/media-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { AdCanvas } from './AdCanvas'
import { AdCanvasInspector } from './components/AdCanvasInspector'
import { AdStudioHeader } from './components/AdStudioHeader'
import { AdCanvasNodeProvider } from './context/ad-canvas-node-context'
import { useAdCanvasGraph } from './hooks/useAdCanvasGraph'
import { useCampaignCanvasAgents } from './hooks/useCampaignCanvasAgents'
import { useNodeAction } from './hooks/useNodeAction'
import { buildBriefAgentUserBrief, conceptsTextFromPayload } from './lib/ad-canvas-brief-utils'
import { delegateToAgentStream } from './services/ad-canvas.service'
import type {
  AdCanvasBriefPayload,
  AdCanvasFlowEdge,
  AdCanvasNodeAction,
  GenerationSource,
} from './types/ad-canvas.types'

export interface AdStudioLayoutProps {
  adSetId: string
  campaignId: string | null
  adId: string
  adTitle?: string
  initialAd: Ad
  onAdUpdated: (ad: Ad) => void
  platform: AdPlatform
  onPlatformChange: (platform: AdPlatform) => void
  placement: AdPlacement
  onPlacementChange: (placement: AdPlacement) => void
  publishHostEl?: HTMLDivElement | null
  refreshHostEl?: HTMLDivElement | null
  onPublishHostEl?: (el: HTMLDivElement | null) => void
  onRefreshHostEl?: (el: HTMLDivElement | null) => void
  headerLeading?: ReactNode
  headerTrailing?: ReactNode
}

function AdStudioLayoutInner({
  adSetId,
  campaignId,
  adId,
  adTitle,
  initialAd,
  onAdUpdated,
  platform,
  onPlatformChange,
  placement,
  onPlacementChange,
  publishHostEl,
  refreshHostEl,
  onPublishHostEl,
  onRefreshHostEl,
  headerLeading,
  headerTrailing,
}: AdStudioLayoutProps) {
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [generationSource, setGenerationSource] = useState<GenerationSource>('direct')
  const [modelId, setModelId] = useState(DEFAULT_IMAGE_MODEL_ID)
  const [agentKey, setAgentKey] = useState('')

  const { agents: campaignAgents } = useCampaignCanvasAgents(campaignId)
  const graph = useAdCanvasGraph(adSetId)
  const { runAction } = useNodeAction()

  useEffect(() => {
    if (campaignAgents.length === 0) return
    if (!campaignAgents.some((a) => a.agentKey === agentKey)) {
      setAgentKey(campaignAgents[0]?.agentKey ?? '')
    }
  }, [agentKey, campaignAgents])

  const handleRunAction = useCallback(
    async (nodeId: string, action: AdCanvasNodeAction) => {
      const node = graph.nodes.find((n) => n.id === nodeId)
      if (!node || !graph.canvasId) return
      const payload = node.data.payload as { prompt?: string }
      graph.updateNodeData(nodeId, { status: 'generating' })
      try {
        const updated = await runAction({
          nodeId,
          canvasId: graph.canvasId,
          action,
          source: generationSource,
          model_id: modelId,
          agent_key: agentKey,
          prompt: payload.prompt,
          campaign_id: campaignId ?? undefined,
          parent_image_asset_id: node.data.image_asset_id ?? undefined,
          onStatus: (status) => graph.updateNodeData(nodeId, { status }),
          onNodeUpdated: (patch) => {
            graph.updateNodeData(nodeId, {
              payload: { ...payload, ...patch },
              image_asset_id:
                (patch.image_asset_id as string | null | undefined) ?? node.data.image_asset_id,
            })
          },
        })
        if (updated) {
          await graph.patchNode(nodeId, {
            status: updated.status,
            payload: updated.payload,
            image_asset_id: updated.image_asset_id,
          })
        } else {
          await graph.patchNode(nodeId, { status: 'ready' })
        }
      } catch {
        graph.updateNodeData(nodeId, { status: 'error' })
      }
    },
    [agentKey, campaignId, generationSource, graph, modelId, runAction],
  )

  const handlePayloadChange = useCallback(
    (nodeId: string, payload: Record<string, unknown>) => {
      void graph.patchNode(nodeId, { payload })
      graph.updateNodeData(nodeId, { payload })
    },
    [graph],
  )

  const spawnStrategyNodesFromConcepts = useCallback(
    async (briefNodeId: string, conceptsText: string) => {
      const briefNode = graph.nodes.find((n) => n.id === briefNodeId)
      if (!briefNode) return

      const chunks = extractConceptBodies(conceptsText)
      const existingStrategies = graph.nodes.filter(
        (n) => n.data.parent_node_id === briefNodeId && n.data.kind === 'strategy',
      )

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        if (!chunk) continue
        const strategyKey = AD_STRATEGIES[i]?.key
        const strategyPayload = {
          strategy_key: strategyKey,
          notes: chunk.body,
        }

        const existingStrategy = existingStrategies[i]
        if (existingStrategy) {
          await graph.patchNode(existingStrategy.id, {
            status: 'ready',
            payload: strategyPayload,
          })
          continue
        }

        const created = await graph.addNode({
          kind: 'strategy',
          parent_node_id: briefNodeId,
          position_x: briefNode.position.x + 340,
          position_y: briefNode.position.y + i * 180,
          payload: strategyPayload,
        })

        const edge: AdCanvasFlowEdge = {
          id: `e-${briefNodeId}-${created.id}`,
          type: 'reference',
          source: briefNodeId,
          target: created.id,
          data: {
            canvas_edge_id: `e-${briefNodeId}-${created.id}`,
            kind: 'reference',
          },
        }
        graph.addEdge(edge)
      }
    },
    [graph],
  )

  const handleGenerateConcepts = useCallback(
    async (briefNodeId: string) => {
      const briefNode = graph.nodes.find((n) => n.id === briefNodeId)
      if (!briefNode || briefNode.data.kind !== 'brief') return

      const payload = briefNode.data.payload as AdCanvasBriefPayload
      graph.updateNodeData(briefNodeId, { status: 'generating' })

      try {
        const res = await generateAdConcepts({
          audience: payload.audience,
          offer_cta: payload.offer,
          brand_guidelines: payload.brand_guidelines,
          attached_asset_instructions: payload.attached_assets,
          reference_description: payload.reference_description,
        })

        const nextPayload: AdCanvasBriefPayload = {
          ...payload,
          concepts_text: res.text,
        }
        await graph.patchNode(briefNodeId, { status: 'ready', payload: nextPayload })
        graph.updateNodeData(briefNodeId, { status: 'ready', payload: nextPayload })

        await spawnStrategyNodesFromConcepts(briefNodeId, res.text)

        const chunks = extractConceptBodies(res.text)
        if (chunks.length > 0) {
          toast.success('4 strategy concepts ready on canvas')
        } else {
          toast.success('Concepts generated — check brief output')
        }
      } catch (e) {
        graph.updateNodeData(briefNodeId, { status: 'error' })
        await graph.patchNode(briefNodeId, { status: 'error' })
        toast.error(sanitizeUserError(e, 'Concept generation failed'))
      }
    },
    [graph, spawnStrategyNodesFromConcepts],
  )

  const handleBriefAgentRun = useCallback(
    async (briefNodeId: string) => {
      const briefNode = graph.nodes.find((n) => n.id === briefNodeId)
      if (!briefNode || briefNode.data.kind !== 'brief' || !graph.canvasId) return

      const payload = briefNode.data.payload as AdCanvasBriefPayload
      const userBrief = buildBriefAgentUserBrief(payload)
      graph.updateNodeData(briefNodeId, { status: 'generating' })

      await delegateToAgentStream(
        {
          node_id: briefNodeId,
          canvas_id: graph.canvasId,
          agent_key: agentKey,
          intent: 'generate',
          user_brief: userBrief,
          model: modelId,
        },
        {
          onEvent: (event) => {
            const type = String(event.type ?? '')
            if (type === 'node_updated') {
              const node = event.node as
                | { payload?: AdCanvasBriefPayload; status?: string }
                | undefined
              if (!node?.payload) return
              const nextPayload = { ...payload, ...node.payload }
              graph.updateNodeData(briefNodeId, { payload: nextPayload, status: 'ready' })
              void graph.patchNode(briefNodeId, { payload: nextPayload, status: 'ready' })
              const concepts = conceptsTextFromPayload(nextPayload)
              if (concepts) {
                void spawnStrategyNodesFromConcepts(briefNodeId, concepts)
              }
            }
            if (type === 'complete') {
              graph.updateNodeData(briefNodeId, { status: 'ready' })
              toast.success('Agent finished the brief')
            }
          },
          onError: () => {
            graph.updateNodeData(briefNodeId, { status: 'error' })
            void graph.patchNode(briefNodeId, { status: 'error' })
          },
        },
      )
    },
    [agentKey, graph, modelId, spawnStrategyNodesFromConcepts],
  )

  const handleRunBrief = useCallback(
    async (briefNodeId: string) => {
      if (generationSource === 'agent') {
        try {
          await handleBriefAgentRun(briefNodeId)
        } catch (e) {
          toast.error(sanitizeUserError(e, 'Agent brief run failed'))
        }
        return
      }
      await handleGenerateConcepts(briefNodeId)
    },
    [generationSource, handleBriefAgentRun, handleGenerateConcepts],
  )

  const nodeContextValue = useMemo(
    () => ({
      onPayloadChange: handlePayloadChange,
      onRunBrief: handleRunBrief,
      generationSource,
      onGenerationSourceChange: setGenerationSource,
      modelId,
      onModelIdChange: setModelId,
      agentKey,
      onAgentKeyChange: setAgentKey,
      campaignAgents,
    }),
    [agentKey, campaignAgents, generationSource, handlePayloadChange, handleRunBrief, modelId],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <AdStudioHeader
        adTitle={adTitle}
        platform={platform}
        onPlatformChange={onPlatformChange}
        placement={placement}
        onPlacementChange={onPlacementChange}
        onRefreshHostEl={onRefreshHostEl}
        onPublishHostEl={onPublishHostEl}
        headerLeading={headerLeading}
        headerTrailing={headerTrailing}
      />

      {graph.loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading creative canvas..." />
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <AdCanvasNodeProvider value={nodeContextValue}>
            <AdCanvas
              loading={false}
              error={graph.error}
              nodes={graph.nodes}
              edges={graph.edges}
              onNodesChange={graph.onNodesChange}
              onEdgesChange={graph.onEdgesChange}
              onNodeSelect={graph.selectNode}
              onMoveEnd={graph.scheduleSaveLayout}
            />
          </AdCanvasNodeProvider>
          <AdCanvasInspector
            open={inspectorOpen}
            onToggle={() => setInspectorOpen((o) => !o)}
            selectedNode={graph.selectedNode}
            adId={adId}
            initialAd={initialAd}
            onAdUpdated={onAdUpdated}
            publishHostEl={publishHostEl}
            refreshHostEl={refreshHostEl}
            generationSource={generationSource}
            onGenerationSourceChange={setGenerationSource}
            modelId={modelId}
            onModelIdChange={setModelId}
            agentKey={agentKey}
            onAgentKeyChange={setAgentKey}
            campaignAgents={campaignAgents}
            onRunAction={handleRunAction}
            onPayloadChange={handlePayloadChange}
          />
        </div>
      )}
    </div>
  )
}

export function AdStudioLayout(props: AdStudioLayoutProps) {
  return (
    <ReactFlowProvider>
      <AdStudioLayoutInner {...props} />
    </ReactFlowProvider>
  )
}
