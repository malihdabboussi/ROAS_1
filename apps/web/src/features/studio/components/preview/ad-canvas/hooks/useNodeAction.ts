'use client'

import { useCallback, useRef } from 'react'
import { delegateToAgentStream, runDirectNodeAction } from '../services/ad-canvas.service'
import type {
  AdCanvasNodeAction,
  AdCanvasNodeStatus,
  DelegateAgentStreamCallbacks,
  GenerationSource,
} from '../types/ad-canvas.types'

export interface RunNodeActionInput {
  nodeId: string
  canvasId: string
  action: AdCanvasNodeAction
  source: GenerationSource
  model_id?: string
  agent_key?: string
  prompt?: string
  campaign_id?: string
  parent_image_asset_id?: string
  strategy_key?: string
  onStatus?: (status: AdCanvasNodeStatus) => void
  onNodeUpdated?: (payload: Record<string, unknown>) => void
}

export function useNodeAction() {
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const runAction = useCallback(async (input: RunNodeActionInput) => {
    const {
      nodeId,
      canvasId,
      action,
      source,
      model_id,
      agent_key,
      prompt,
      campaign_id,
      parent_image_asset_id,
      strategy_key,
      onStatus,
      onNodeUpdated,
    } = input

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    onStatus?.('generating')

    if (source === 'agent') {
      if (!agent_key) throw new Error('agent_key is required for agent generation')
      const userBrief = (prompt ?? '').trim()
      if (userBrief.length < 1) throw new Error('prompt is required for agent delegation')

      const callbacks: DelegateAgentStreamCallbacks = {
        onEvent: (event) => {
          const type = String(event.type ?? '')
          if (type === 'node_updated') {
            const node = event.node as { payload?: Record<string, unknown> } | undefined
            if (node?.payload) onNodeUpdated?.(node.payload)
          }
          if (type === 'complete' && event.image_url) {
            onNodeUpdated?.({ image_url: event.image_url })
          }
          const status = event.status
          if (status === 'ready' || status === 'error' || status === 'idle') {
            onStatus?.(status as AdCanvasNodeStatus)
          }
        },
        onDone: () => onStatus?.('ready'),
        onError: () => onStatus?.('error'),
      }

      await delegateToAgentStream(
        {
          node_id: nodeId,
          canvas_id: canvasId,
          agent_key,
          intent: action,
          user_brief: userBrief,
          parent_image_asset_id,
          strategy_key,
          model: model_id,
        },
        callbacks,
        controller.signal,
      )
      return null
    }

    const updated = await runDirectNodeAction(nodeId, action, {
      model_id,
      prompt,
      campaign_id,
    })
    onStatus?.('ready')
    return updated
  }, [])

  return { runAction, cancel }
}
