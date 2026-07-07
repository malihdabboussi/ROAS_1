import type { Logger } from '@nestjs/common'
import type { UsageData } from '../types/stream-events'
import type {
  CompletedGeneration,
  OpenClawCompletionResult,
  ProviderBillingStartedEvent,
  ProxyOptions,
  SystemPromptReport,
  TraceRecoveryEvent,
  ToolStep,
} from './openclaw-proxy.types'

export type OpenClawStreamTimingLogger = (
  stage: string,
  extra?: Record<string, unknown>,
) => void

export type CachedMetaAdAccount = { id: string; name: string; currency?: string }

export type CachedMetaPage = {
  id: string
  name: string
  instagram_business_account?: { id: string; username?: string }
}

export type OpenClawStreamContext = {
  agentId: string
  correlation: string
  logger: Logger
  logStreamTiming: OpenClawStreamTimingLogger
  options: ProxyOptions
  resolvedModel: string
  streamStartedAt: number
  streamTimingLogsEnabled: boolean
}

export type OpenClawStreamState = {
  buffer: string
  fullContent: string
  toolSteps: ToolStep[]
  artifactOutputBlocks: Array<Record<string, unknown>>
  recoveryEvents: TraceRecoveryEvent[]
  hasEmittedContent: boolean
  usage?: UsageData
  generationId?: string
  completedGenerations: CompletedGeneration[]
  providerBillingAttempts: ProviderBillingStartedEvent[]
  providerBillingAttemptWriteFailed: boolean
  failedMessage?: string
  truncated: boolean
  fullSystemPrompt?: string
  llmInput?: Record<string, unknown>
  llmOutput?: unknown[]
  lastCallInputTokens?: number
  contextWindowTokens?: number
  compactionCount?: number
  systemPromptReport?: SystemPromptReport
  sawToolStart: boolean
  lastEventAt: number
  stallAborted: boolean
  streamTimingStages: Set<string>
  activeToolLabels: Record<string, string>
  activeToolActions: Record<string, string | undefined>
  toolNameByCallId: Record<string, string>
  activeArtifactLabels: Record<string, string>
  artifactToolCallIds: Set<string>
  earlyStartedToolIds: Set<string>
  cachedMetaAdAccounts: CachedMetaAdAccount[]
  cachedMetaPages: CachedMetaPage[]
  hiddenToolStartCount: number
  hiddenToolEndCount: number
  hiddenToolFailedCount: number
  hiddenToolNameCounts: Record<string, number>
  emittedHardBlockFallback: boolean
  contentPreviewEnabled: boolean
  lastContentPreviewAt: number
  contentPreviewBuffer: string
}

export function createOpenClawStreamState(now = Date.now()): OpenClawStreamState {
  return {
    buffer: '',
    fullContent: '',
    toolSteps: [],
    artifactOutputBlocks: [],
    recoveryEvents: [],
    hasEmittedContent: false,
    completedGenerations: [],
    providerBillingAttempts: [],
    providerBillingAttemptWriteFailed: false,
    truncated: false,
    sawToolStart: false,
    lastEventAt: now,
    stallAborted: false,
    streamTimingStages: new Set<string>(),
    activeToolLabels: Object.create(null) as Record<string, string>,
    activeToolActions: Object.create(null) as Record<string, string | undefined>,
    toolNameByCallId: Object.create(null) as Record<string, string>,
    activeArtifactLabels: Object.create(null) as Record<string, string>,
    artifactToolCallIds: new Set<string>(),
    earlyStartedToolIds: new Set<string>(),
    cachedMetaAdAccounts: [],
    cachedMetaPages: [],
    hiddenToolStartCount: 0,
    hiddenToolEndCount: 0,
    hiddenToolFailedCount: 0,
    hiddenToolNameCounts: Object.create(null) as Record<string, number>,
    emittedHardBlockFallback: false,
    contentPreviewEnabled: true,
    lastContentPreviewAt: 0,
    contentPreviewBuffer: '',
  }
}

export function logFirstStreamTiming(
  state: OpenClawStreamState,
  context: OpenClawStreamContext,
  stage: string,
  extra?: Record<string, unknown>,
): void {
  if (state.streamTimingStages.has(stage)) return
  state.streamTimingStages.add(stage)
  context.logStreamTiming(stage, extra)
}

export function buildOpenClawCompletionResult(
  state: OpenClawStreamState,
): OpenClawCompletionResult {
  return {
    content: state.fullContent,
    toolSteps: state.toolSteps,
    artifactOutputBlocks: state.artifactOutputBlocks,
    recoveryEvents: state.recoveryEvents,
    usage: state.usage,
    generationId: state.generationId,
    completedGenerations: state.completedGenerations,
    providerBillingAttempts: state.providerBillingAttempts,
    providerBillingAttemptWriteFailed: state.providerBillingAttemptWriteFailed,
    failed: state.failedMessage,
    truncated: state.truncated,
    fullSystemPrompt: state.fullSystemPrompt,
    llmInput: state.llmInput,
    llmOutput: state.llmOutput,
    lastCallInputTokens: state.lastCallInputTokens,
    contextWindowTokens: state.contextWindowTokens,
    compactionCount: state.compactionCount,
    systemPromptReport: state.systemPromptReport,
  }
}
