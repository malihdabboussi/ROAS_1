'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { AdCanvasAgentOption, GenerationSource } from '../types/ad-canvas.types'

export interface AdCanvasNodeContextValue {
  onPayloadChange: (nodeId: string, payload: Record<string, unknown>) => void
  onRunBrief: (nodeId: string) => Promise<void>
  generationSource: GenerationSource
  onGenerationSourceChange: (source: GenerationSource) => void
  modelId: string
  onModelIdChange: (modelId: string) => void
  agentKey: string
  onAgentKeyChange: (agentKey: string) => void
  campaignAgents: AdCanvasAgentOption[]
}

const AdCanvasNodeContext = createContext<AdCanvasNodeContextValue | null>(null)

export function AdCanvasNodeProvider({
  value,
  children,
}: {
  value: AdCanvasNodeContextValue
  children: ReactNode
}) {
  return <AdCanvasNodeContext.Provider value={value}>{children}</AdCanvasNodeContext.Provider>
}

export function useAdCanvasNodeContext(): AdCanvasNodeContextValue {
  const ctx = useContext(AdCanvasNodeContext)
  if (!ctx) {
    throw new Error('useAdCanvasNodeContext must be used within AdCanvasNodeProvider')
  }
  return ctx
}
