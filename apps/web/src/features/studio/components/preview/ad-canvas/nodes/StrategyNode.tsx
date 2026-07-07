'use client'

import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { AD_STRATEGY_BY_KEY } from '@vibey/api-shared/ad-strategies'
import type { AdCanvasFlowNodeData, AdCanvasStrategyPayload } from '../types/ad-canvas.types'
import { BaseAdCanvasNode } from './BaseAdCanvasNode'

function StrategyNodeComponent(props: NodeProps) {
  const d = props.data as unknown as AdCanvasFlowNodeData
  const payload = d.payload as AdCanvasStrategyPayload
  const strategy = payload.strategy_key ? AD_STRATEGY_BY_KEY[payload.strategy_key] : null

  return (
    <BaseAdCanvasNode {...props} actions={['generate']} title="Strategy">
      <p className="text-foreground emphasis-medium text-left">
        {strategy?.name ?? 'Pick a strategy'}
      </p>
      {strategy ? (
        <p className="text-muted-foreground mt-spacing-1 line-clamp-2 text-left text-[11px]">
          {strategy.description}
        </p>
      ) : null}
    </BaseAdCanvasNode>
  )
}

export const StrategyNode = memo(StrategyNodeComponent)
