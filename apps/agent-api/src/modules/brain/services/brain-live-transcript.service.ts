import type { Logger } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TokenUsage } from '../../billing/services/credits.service'
import { CreditsService } from '../../billing/services/credits.service'
import { BrainLiveRepository } from '../repositories/brain-live.repository'
import type { DelegationState } from './brain-live.types'

interface TranscriptPersistenceInput {
  liveRepository: BrainLiveRepository
  supabase: SupabaseClient
  logger: Logger
}

@Injectable()
export class BrainLiveTranscriptService {
  async saveTranscriptMessage(
    input: TranscriptPersistenceInput & {
      conversationId: string
      role: 'user' | 'assistant'
      content: string
      metadata?: Record<string, unknown>
    },
  ): Promise<Record<string, unknown> | null> {
    if (!input.conversationId || !input.content.trim()) return null
    try {
      const { data, error } = await input.liveRepository.insertTranscriptMessage(input.supabase, {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content.trim(),
        metadata: input.metadata,
      })
      if (error) {
        input.logger.warn(
          `transcript_save_failed conv=${input.conversationId} role=${input.role} err=${error.message}`,
        )
        return null
      }
      return data ?? null
    } catch (err) {
      input.logger.warn(
        `transcript_save_error conv=${input.conversationId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      return null
    }
  }

  async saveVoiceTasksSummary(
    input: TranscriptPersistenceInput & {
      conversationId: string
      tasks: Array<{ delegationId: string; task: string; status: string }>
      agentId?: string
      delegations: Map<string, DelegationState>
    },
  ): Promise<void> {
    if (!input.conversationId || input.tasks.length === 0) return

    const rows: Array<Record<string, unknown>> = []

    for (const t of input.tasks) {
      const ds = input.delegations.get(t.delegationId)
      const content = ds?.content?.trim() || ''
      const orderedBlocks = ds?.orderedBlocks ?? []
      const toolSteps = ds?.toolSteps ?? []

      rows.push({
        conversation_id: input.conversationId,
        role: 'assistant',
        content: content || t.task,
        metadata: {
          source: 'voice_live',
          delegation_task: true,
          delegation_id: t.delegationId,
          voice_task_label: t.task,
          voice_task_status: t.status,
          agent_id: input.agentId,
          ...(toolSteps.length > 0
            ? { tool_steps: toolSteps.map((s) => ({ label: s.label })) }
            : {}),
          ...(orderedBlocks.length > 0
            ? { content_blocks_ordered: structuredClone(orderedBlocks) }
            : {}),
        },
      })
    }

    try {
      const { error } = await input.liveRepository.insertVoiceTaskSummaryRows(
        input.supabase,
        rows,
      )
      if (error) {
        input.logger.warn(
          `voice_tasks_save_failed conv=${input.conversationId} count=${rows.length} err=${error.message}`,
        )
      }
    } catch (err) {
      input.logger.warn(
        `voice_tasks_save_error conv=${input.conversationId} err=${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  async trackSessionUsage(input: {
    creditsService: CreditsService
    logger: Logger
    userId: string
    durationSeconds: number
    orgId?: string | null
  }): Promise<void> {
    if (input.durationSeconds <= 0) return
    const estimatedTokens = Math.round(input.durationSeconds * 40)
    try {
      await input.creditsService.processDirectTextUsage({
        userId: input.userId,
        orgId: input.orgId ?? undefined,
        feature: 'brain',
        action: 'live_voice',
        modelName: 'gemini/live-flash',
        usage: {
          input: Math.round(estimatedTokens * 0.4),
          output: Math.round(estimatedTokens * 0.6),
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: estimatedTokens,
        } satisfies TokenUsage,
        costSource: 'gemini_live_estimate',
      })
    } catch (err) {
      input.logger.warn(
        `credit_deduction_failed feature=brain action=live_voice userId=${input.userId} durationSec=${input.durationSeconds} err=${err instanceof Error ? err.message : String(err)}`,
      )
      throw err
    }
  }
}
