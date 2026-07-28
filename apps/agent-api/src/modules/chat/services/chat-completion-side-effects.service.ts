import { Injectable, Logger } from '@nestjs/common'
import { CreditsService, type TokenUsage } from '../../billing/services/credits.service'
import type { CreditData } from '../types/stream-events'
import type { ResolvedSlashCommand } from './chat-slash-command.service'
import type { OpenClawCompletionResult } from './openclaw-proxy.service'
import type {
  ToolStep,
  TraceRecoveryEvent,
  TraceRecoveryStatus,
  TraceTerminalStatus,
  TraceUserVisibleOutcome,
} from './openclaw-proxy.types'
import { OpenRouterCostService, type CompletedGenerationCostInput } from './openrouter-cost.service'
import { SkillRecommendationEventRecorderService } from './skill-recommendation-event-recorder.service'
import { TracingService } from './tracing.service'

export interface ChatCompletionSideEffectsInput {
  agentKey: string
  campaignId?: string
  channel: 'telegram' | 'slack' | 'studio'
  contextWindowTokens?: number
  conversationId: string
  defaultModelId: string
  durationMs: number
  hasOutput: () => boolean
  logger: Logger
  modelSettings?: unknown
  orgId?: string | null
  prompt: string
  requestedModelId: string
  resolvedCommands: ResolvedSlashCommand[]
  resolvedModelId?: string
  result: OpenClawCompletionResult
  sendCreditUpdate: (creditData: CreditData) => void
  sessionKey: string
  toolSteps: ToolStep[]
  traceId: string | null
  terminalStatus?: TraceTerminalStatus
  userVisibleOutcome?: TraceUserVisibleOutcome
  recoveryStatus?: TraceRecoveryStatus
  recoveryEvents?: TraceRecoveryEvent[]
  observability?: Record<string, unknown>
  userId: string
}

@Injectable()
export class ChatCompletionSideEffectsService {
  constructor(
    private readonly costService: OpenRouterCostService,
    private readonly tracing: TracingService,
    private readonly skillRecommendationEvents: SkillRecommendationEventRecorderService,
    private readonly credits: CreditsService,
  ) {}

  runDetached(input: ChatCompletionSideEffectsInput): void {
    const costInput = this.buildCostInput(input.result, input.resolvedModelId)
    const coveredGenerationIds = new Set(
      (input.result.providerBillingAttempts ?? [])
        .filter((attempt) => attempt.recorded === true)
        .map((attempt) => attempt.provider_generation_id)
        .filter((id): id is string => Boolean(id)),
    )
    const billableCostInput = costInput.filter(
      (generation) =>
        !generation.generationId || !coveredGenerationIds.has(generation.generationId),
    )
    const tokenUsage = this.aggregateLiveTokenUsage(input.result, coveredGenerationIds)
    const resultContent = input.result.content
    const resultUsage = input.result.usage
    const resultToolSteps = input.toolSteps
    const resultFullSystemPrompt = input.result.fullSystemPrompt
    const resultLlmInput = input.result.llmInput
    const resultLlmOutput = input.result.llmOutput

    void (async () => {
      let costUsd: number | undefined
      let costSource: string | undefined
      let generationIds: string[] = []
      try {
        const summed = await this.costService.sumGenerationCosts(costInput, input.resolvedModelId)
        costUsd = summed.totalUsd
        costSource = summed.totalUsd !== undefined ? summed.costSource : undefined
        generationIds = summed.generationIds
      } catch (err) {
        input.logger.error(`[Background] Cost lookup failed for ${input.conversationId}: ${err}`)
      }
      input.logger.log(
        JSON.stringify({
          feature: 'chat_generation_cost_v1',
          agent_key: input.agentKey,
          channel: input.channel,
          conversation_id: input.conversationId,
          requested_model: input.requestedModelId,
          resolved_model: input.resolvedModelId ?? null,
          total_cost_usd: costUsd ?? null,
          cost_source: costSource ?? null,
          priced_generation_ids: generationIds,
          generations: (input.result.completedGenerations ?? []).map((generation) => ({
            generation_id: generation.generationId ?? null,
            model: generation.model ?? input.resolvedModelId ?? null,
            stage: generation.stage ?? null,
            input_tokens: generation.usage?.input_tokens ?? null,
            output_tokens: generation.usage?.output_tokens ?? null,
            cache_read_tokens: generation.usage?.cache_read_input_tokens ?? null,
            cache_write_tokens: generation.usage?.cache_creation_input_tokens ?? null,
            provider_cost: generation.providerCost ?? null,
            settlement_recorded: generation.generationId
              ? coveredGenerationIds.has(generation.generationId)
              : false,
          })),
        }),
      )

      this.tracing
        .completeTrace(input.traceId, {
          response: resultContent,
          toolSteps: resultToolSteps,
          usage: resultUsage,
          durationMs: input.durationMs,
          fullSystemPrompt: resultFullSystemPrompt,
          llmInput: resultLlmInput,
          llmOutput: resultLlmOutput,
          costUsd,
          terminalStatus: input.terminalStatus,
          userVisibleOutcome: input.userVisibleOutcome,
          recoveryStatus: input.recoveryStatus,
          recoveryEvents: input.recoveryEvents,
          observability: input.observability,
        })
        .catch(() => {})

      this.skillRecommendationEvents
        .recordCompletion({
          userId: input.userId,
          orgId: input.orgId ?? null,
          agentKey: input.agentKey,
          conversationId: input.conversationId,
          traceId: input.traceId,
          channel: input.channel,
          prompt: input.prompt,
          response: resultContent,
          toolSteps: resultToolSteps,
          resolvedCommands: input.resolvedCommands,
        })
        .catch(() => {})

      try {
        if (!input.hasOutput()) {
          input.logger.log(
            `[Credits] Skipping charge for ${input.conversationId} — no user-visible output`,
          )
          return
        }
        if (costInput.length > 0 && billableCostInput.length === 0) {
          input.logger.log(
            `[Credits] Skipping legacy completion charge for ${input.conversationId} — provider billing settlement owns every generation`,
          )
          return
        }
        if (billableCostInput.length !== costInput.length) {
          const unbilled = await this.costService.sumGenerationCosts(
            billableCostInput,
            input.resolvedModelId,
          )
          costUsd = unbilled.totalUsd
          costSource = unbilled.totalUsd !== undefined ? unbilled.costSource : undefined
          generationIds = unbilled.generationIds
        }

        let creditData: CreditData | undefined
        const primaryResult = await this.credits.processUsage({
          userId: input.userId,
          sessionKey: input.sessionKey,
          conversationId: input.conversationId,
          campaignId: input.campaignId,
          orgId: input.orgId ?? undefined,
          feature: 'chat',
          action: 'message',
          modelName: input.resolvedModelId,
          preComputedCost: costUsd,
          costSource,
          generationIds,
          contextWindowTokens: input.contextWindowTokens,
          requestedModelId: input.requestedModelId,
          resolvedModelId: input.resolvedModelId,
          modelSettings: input.modelSettings,
        })
        if (primaryResult) {
          creditData = {
            credits_used: primaryResult.credits,
            credits_remaining: primaryResult.balance.totalAvailable,
            api_cost: primaryResult.apiCost,
          }
        } else if (tokenUsage) {
          const directResult = await this.credits.processDirectTextUsage({
            userId: input.userId,
            campaignId: input.campaignId,
            conversationId: input.conversationId,
            orgId: input.orgId ?? undefined,
            feature: 'chat',
            action: 'message',
            modelName: input.resolvedModelId ?? input.defaultModelId,
            usage: tokenUsage,
            costSource: costSource ?? 'gateway_tokens',
            contextWindowTokens: input.contextWindowTokens,
            requestedModelId: input.requestedModelId,
            resolvedModelId: input.resolvedModelId ?? undefined,
            modelSettings: input.modelSettings,
          })
          if (directResult) {
            creditData = {
              credits_used: directResult.credits,
              credits_remaining: directResult.balance.totalAvailable,
              api_cost: directResult.apiCost,
            }
          }
        }

        if (creditData) {
          input.logger.log(
            `Credits processed for conversation ${input.conversationId} (remaining=${creditData.credits_remaining})`,
          )
          input.sendCreditUpdate(creditData)
        }
      } catch (err) {
        input.logger.error(
          `[Background] Cost/credit processing failed for ${input.conversationId}: ${err}`,
        )
      }
    })()
  }

  private buildCostInput(
    result: OpenClawCompletionResult,
    resolvedModelId?: string,
  ): CompletedGenerationCostInput[] {
    return (result.completedGenerations ?? []).map((generation) => {
      const inputTokensTotal = generation.usage?.input_tokens ?? 0
      const cacheRead = generation.usage?.cache_read_input_tokens ?? 0
      const cacheWrite = generation.usage?.cache_creation_input_tokens ?? 0
      const rawGenModel =
        generation.model && !generation.model.startsWith('openclaw:')
          ? generation.model
          : resolvedModelId
      const generationModelId = rawGenModel?.replace(/^openrouter\//, '') ?? resolvedModelId
      return {
        generationId: generation.generationId,
        modelId: generationModelId,
        usage: {
          inputTokens: inputTokensTotal,
          outputTokens: generation.usage?.output_tokens ?? 0,
          cacheReadTokens: cacheRead,
          cacheWriteTokens: cacheWrite,
        },
        providerCost: generation.providerCost,
      }
    })
  }

  private aggregateLiveTokenUsage(
    result: OpenClawCompletionResult,
    coveredGenerationIds: Set<string>,
  ): TokenUsage | undefined {
    const completed = (result.completedGenerations ?? []).filter(
      (generation) =>
        !generation.generationId || !coveredGenerationIds.has(generation.generationId),
    )
    if (completed.length === 0) return undefined

    const aggregate: TokenUsage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
    }
    for (const generation of completed) {
      const usage = generation.usage
      if (!usage) continue
      const inputTokens = usage.input_tokens ?? 0
      const cacheRead = usage.cache_read_input_tokens ?? 0
      const cacheWrite = usage.cache_creation_input_tokens ?? 0
      aggregate.input += Math.max(0, inputTokens - cacheRead - cacheWrite)
      aggregate.output += usage.output_tokens ?? 0
      aggregate.cacheRead += cacheRead
      aggregate.cacheWrite += cacheWrite
      aggregate.totalTokens += usage.total_tokens ?? 0
    }
    return aggregate.totalTokens > 0 ? aggregate : undefined
  }
}
