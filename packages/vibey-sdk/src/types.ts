export interface VibeyAgent {
  agent_key: string
  name: string
  role: string | null
  level: string | null
  status: string
  avatar_url: string | null
}

export interface VibeyMission {
  id: string
  title: string
  status: string
  priority: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface VibeyOffer {
  id: string
  name: string
  status: string
}

export interface VibeyFunnel {
  id: string
  name: string
  slug: string
  status: string
  funnel_type: string | null
}

export interface VibeyMemory {
  id: string
  content: string
  domain: string | null
  similarity?: number
}

export interface VibeyCustomObject {
  id: string
  type_key: string
  data: Record<string, unknown>
  created_at: string
}

export interface VibeyIntegrationResult {
  success: boolean
  integration_id?: string
  action?: string
  result?: unknown
  error?: string
}

export interface VibeyBrainStats {
  total_memories: number
  domains: string[]
  recent_count: number
}

export interface YouTubeAnalytics {
  success: boolean
  result?: {
    columnHeaders?: Array<{ name: string; columnType: string }>
    rows?: unknown[][]
  }
}

export interface InstagramProfile {
  success: boolean
  result?: Record<string, unknown>
}

export interface MetaAdsInsights {
  success: boolean
  result?: Record<string, unknown>
}

export type VibeyApiResponse<T = unknown> = T & { success: boolean; error?: string }

export interface VibeyConversation {
  id: string
  title: string | null
  campaign_id: string | null
  agent_id: string | null
  created_at: string
  updated_at: string
}

export interface VibeyMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export type StreamPhase = 'thinking' | 'streaming' | 'executing'

export interface StreamCallbacks {
  onPhase?: (phase: StreamPhase, message?: string) => void
  onContent?: (delta: string) => void
  onToolStart?: (name: string, label: string) => void
  onToolEnd?: (name: string, status: string) => void
  onDone?: () => void
  onError?: (error: string) => void
}
