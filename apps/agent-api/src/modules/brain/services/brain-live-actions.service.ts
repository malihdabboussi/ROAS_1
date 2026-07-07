import type { Logger } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BrainLiveRepository } from '../repositories/brain-live.repository'
import type { MemoryType } from '../types/brain.types'
import type { BrainLiveAction, LiveSessionScope } from './brain-live.types'
import { BRAIN_LIVE_ACTIONS } from './brain-live.types'
import { CrystallizationService } from './crystallization.service'
import { MemoriesService } from './memories.service'

interface ExecuteBrainActionInput {
  supabase: SupabaseClient
  memoriesService: MemoriesService
  crystallizationService: CrystallizationService
  liveRepository: BrainLiveRepository
  logger: Logger
  resolveScopeBrainId: (scope: LiveSessionScope, userId: string) => Promise<string>
  userId: string
  orgId: string | null
  scope: LiveSessionScope
  action: string
  data: Record<string, unknown>
  sessionId: string
}

@Injectable()
export class BrainLiveActionsService {
  async executeBrainAction(input: ExecuteBrainActionInput): Promise<Record<string, unknown>> {
    const { action, data, logger, orgId, resolveScopeBrainId, scope, sessionId, userId } = input
    if (!BRAIN_LIVE_ACTIONS.includes(action as BrainLiveAction)) {
      return { success: false, error: `Unknown action: ${action}` }
    }

    const brainId = await resolveScopeBrainId(scope, userId)

    try {
      switch (action as BrainLiveAction) {
        case 'save_user_memory': {
          const VALID_MEMORY_TYPES: MemoryType[] = [
            'fact',
            'decision',
            'insight',
            'story',
            'framework',
            'preference',
            'event',
          ]
          const rawType = String(data.memory_type ?? 'fact')
          const memoryType: MemoryType = VALID_MEMORY_TYPES.includes(rawType as MemoryType)
            ? (rawType as MemoryType)
            : 'fact'

          const result = await input.memoriesService.createMemory(input.supabase, {
            content: String(data.content ?? ''),
            memory_type: memoryType,
            source_type: 'conversation',
            source_id: `voice_atlas_${sessionId}`,
            source_title: 'Voice conversation with Atlas',
            tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
            speaker: userId,
            agent_id: scope.type === 'agent' ? (scope.agentId ?? undefined) : undefined,
            confidence: 0.8,
            significance: 0.7,
            metadata: { user_id: userId },
            brain_id: brainId || undefined,
          })
          return { success: true, memory_id: result?.id, content: data.content }
        }

        case 'search_user_brain': {
          const query = String(data.query ?? '')
          if (!query) return { success: false, error: 'query is required' }

          if (scope.type === 'company' && brainId) {
            const { data: objects, error: objectError } =
              await input.liveRepository.searchCompanyCortexObjects(input.supabase, {
                brainId,
                query,
                limit: Math.min(Number(data.limit) || 5, 10),
              })
            if (objectError) {
              return { success: false, error: objectError.message }
            }
            const rows = (objects ?? []) as Array<Record<string, unknown>>
            return {
              success: true,
              count: rows.length,
              results: rows.map((r) => ({
                id: r.id,
                content: `${r.title}: ${r.truth}`,
                type: r.object_type,
                created_at: r.updated_at,
                tags: ['company_cortex_object'],
              })),
            }
          }

          const searchResult = await input.memoriesService.searchMemories(input.supabase, {
            query,
            limit: Math.min(Number(data.limit) || 5, 10),
            user_id: userId,
            brain_id: brainId || undefined,
            org_id: orgId,
          })
          return {
            success: true,
            count: searchResult.results?.length ?? 0,
            results: (searchResult.results ?? []).slice(0, 5).map((r: any) => ({
              id: r.id,
              content: r.content,
              type: r.memory_type ?? r.type,
              created_at: r.created_at,
              tags: r.tags,
            })),
          }
        }

        case 'search_brain_context': {
          const query = String(data.query ?? '')
          if (!query) return { success: false, error: 'query is required' }
          const current = await this.executeBrainAction({
            ...input,
            action: 'search_user_brain',
          })
          return { ...current, action_note: 'Voice mode searched the current live Brain context.' }
        }

        case 'list_user_brain_memories': {
          const limit = Math.min(Number(data.limit) || 5, 20)
          const memories = await input.memoriesService.listMemories(
            input.supabase,
            userId,
            { limit },
            brainId || undefined,
          )
          return {
            success: true,
            count: memories.length,
            memories: memories.slice(0, limit).map((m: any) => ({
              id: m.id,
              content: m.content,
              type: m.memory_type,
              node_type: 'memory',
              created_at: m.created_at,
              tags: m.tags,
            })),
          }
        }

        case 'get_brain_stats': {
          if (!brainId) return { success: false, error: 'Could not resolve brain' }
          const [memCount, snapCount] = await Promise.all([
            input.liveRepository.countMemoryRowsByType(input.supabase, brainId),
            input.liveRepository.countSnapshots(input.supabase, brainId),
          ])
          const byType: Record<string, number> = {}
          for (const row of memCount.rows) {
            const t = (row as Record<string, unknown>).memory_type as string
            byType[t] = (byType[t] ?? 0) + 1
          }
          return {
            success: true,
            stats: { total_memories: memCount.count, total_snapshots: snapCount, by_type: byType },
          }
        }

        case 'crystallize_user_brain': {
          if (scope.type === 'company') {
            return {
              success: false,
              error:
                'Company Cortex uses scheduled dream formation — crystallize is not available in voice.',
            }
          }
          const crystallizeInput = String(data.input ?? '')
          if (!crystallizeInput) return { success: false, error: 'input text is required' }
          const result = await input.crystallizationService.crystallize(
            input.supabase,
            crystallizeInput,
            userId,
            'voice_atlas',
            sessionId,
            brainId || undefined,
            orgId,
            {
              asserted_at: new Date().toISOString(),
              temporal_source: 'voice_atlas',
            },
          )
          if ('skipped' in result) {
            return { success: true, skipped: true, reason: result.reason }
          }
          return { success: true, snapshot: result.snapshot }
        }

        case 'list_available_brains':
          return this.handleListAvailableBrains(input, brainId)

        default:
          return { success: false, error: `Unhandled action: ${action}` }
      }
    } catch (err) {
      logger.error(
        `brain_live_action_failed action=${action} userId=${userId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      return { success: false, error: err instanceof Error ? err.message : 'Action failed' }
    }
  }

  private async handleListAvailableBrains(
    input: ExecuteBrainActionInput,
    currentBrainId: string,
  ): Promise<Record<string, unknown>> {
    const { data: brains, error } = await input.liveRepository.listAvailableBrains(
      input.supabase,
      input.userId,
    )
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      current_brain_id: currentBrainId,
      brains: (brains ?? []).map((b: any) => ({
        brain_id: b.id,
        name: b.name,
        type: b.is_default ? 'personal' : 'agent',
        agent_id: b.agent_id ?? null,
        is_current: b.id === currentBrainId,
      })),
    }
  }
}
