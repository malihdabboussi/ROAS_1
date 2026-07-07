export type AgentRuntimeAutoscalerMode = 'active' | 'dry_run' | 'off'

export type RailwayApiTokenType = 'project' | 'bearer'

export interface AgentRuntimeAutoscalerRuntimeConfig {
  enabled: boolean
  mode: AgentRuntimeAutoscalerMode
  pollMs: number
  lockTtlMs: number
  minReplicas: number
  maxReplicas: number
  scaleUpWaitMs: number
  scaleUpConsecutiveSamples: number
  scaleUpCooldownMs: number
  scaleDownIdleMs: number
  scaleDownCooldownMs: number
  projectId: string
  environmentId: string
  serviceId: string
  region: string
  apiToken: string
  apiTokenType: RailwayApiTokenType
}

export interface QueuePressureSnapshot {
  waiting: number
  prioritized: number
  delayed: number
  active: number
  oldestWaitingMs: number
  sampledAtMs: number
}

export interface AgentRuntimeAutoscalerState {
  consecutiveScaleUpSamples: number
  idleSinceMs: number | null
  lastScaleAtMs: number
}

export type AgentRuntimeAutoscalerAction = 'none' | 'scale_up' | 'scale_down'

export interface AgentRuntimeAutoscalerDecision {
  action: AgentRuntimeAutoscalerAction
  targetReplicas: number
  reason: string
  nextState: AgentRuntimeAutoscalerState
}
