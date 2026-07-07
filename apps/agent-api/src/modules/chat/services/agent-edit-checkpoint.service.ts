import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentEditCheckpointRepository } from '../repositories/agent-edit-checkpoint.repository'
import type {
  AgentCheckpointMutation,
  AgentCheckpointSnapshot,
} from '../../shared/services/request-context.service'

const SYSTEM_AGENT_KEYS = new Set(['vibey', 'hr', 'brain_scholar', 'atlas', 'viktor'])

@Injectable()
export class AgentEditCheckpointService {
  private readonly logger = new Logger(AgentEditCheckpointService.name)

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: AgentEditCheckpointRepository = new AgentEditCheckpointRepository(),
  ) {}

  async finalizeTurn(input: {
    userId: string
    orgId?: string | null
    conversationId: string
    messageId: string
    mutations: AgentCheckpointMutation[]
  }): Promise<void> {
    if (input.mutations.length === 0) return
    const supabase = this.svc.client
    for (const mutation of input.mutations) {
      if (SYSTEM_AGENT_KEYS.has(mutation.agentKey)) continue
      await this.finalizeAgentTurn(supabase, input, mutation)
    }
  }

  private async finalizeAgentTurn(
    supabase: SupabaseClient,
    turn: {
      userId: string
      orgId?: string | null
      conversationId: string
      messageId: string
    },
    mutation: AgentCheckpointMutation,
  ): Promise<void> {
    const existing = await this.hasAnyCheckpoint(
      supabase,
      turn.userId,
      turn.orgId,
      mutation.agentKey,
    )
    if (!existing && mutation.preSnapshot) {
      await this.insertCheckpoint(supabase, {
        userId: turn.userId,
        orgId: turn.orgId,
        agentKey: mutation.agentKey,
        conversationId: turn.conversationId,
        messageId: null,
        kind: 'baseline',
        summary: 'Original version',
        snapshot: mutation.preSnapshot,
      })
    }

    const currentSnapshot = await this.captureSnapshot(
      supabase,
      turn.userId,
      turn.orgId,
      mutation.agentKey,
    )
    const summary = this.buildSummary(mutation.summaries)
    await this.insertCheckpoint(supabase, {
      userId: turn.userId,
      orgId: turn.orgId,
      agentKey: mutation.agentKey,
      conversationId: turn.conversationId,
      messageId: turn.messageId,
      kind: 'auto_turn',
      summary,
      snapshot: currentSnapshot,
    })
  }

  private async hasAnyCheckpoint(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
  ): Promise<boolean> {
    return this.repository.hasAnyCheckpoint(supabase, { userId, orgId, agentKey })
  }

  private async insertCheckpoint(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      agentKey: string
      conversationId: string
      messageId: string | null
      kind: 'auto_turn' | 'baseline'
      summary: string
      snapshot: AgentCheckpointSnapshot
    },
  ): Promise<void> {
    if (input.messageId) {
      const hasDuplicate = await this.repository.hasDuplicateMessageCheckpoint(supabase, {
        userId: input.userId,
        orgId: input.orgId,
        agentKey: input.agentKey,
        messageId: input.messageId,
        kind: input.kind,
      })
      if (hasDuplicate) return
    }

    const error = await this.repository.insertCheckpoint(supabase, input)
    if (error) {
      this.logger.warn(
        `Failed to insert ${input.kind} checkpoint for ${input.agentKey}: ${error.message}`,
      )
      throw new Error(`Failed to insert checkpoint: ${error.message}`)
    }
  }

  private async captureSnapshot(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
  ): Promise<AgentCheckpointSnapshot> {
    const [definitionsResult, skillsResult] = await Promise.all([
      this.repository.listAgentDefinitions(supabase, { userId, orgId, agentKey }),
      this.repository.listAgentSkills(supabase, { userId, orgId, agentKey }),
    ])
    if (definitionsResult.error) {
      throw new Error(`Failed to capture agent definitions: ${definitionsResult.error.message}`)
    }
    if (skillsResult.error) {
      throw new Error(`Failed to capture agent skills: ${skillsResult.error.message}`)
    }
    return {
      definitions: ((definitionsResult.data ?? []) as Array<Record<string, unknown>>).map(
        (row) => ({
          file_name: String(row.file_name),
          content: String(row.content ?? ''),
        }),
      ),
      skills: ((skillsResult.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        skill_key: String(row.skill_key),
        name: String(row.name ?? ''),
        description: String(row.description ?? ''),
        markdown_content: String(row.markdown_content ?? ''),
        is_enabled: row.is_enabled !== false,
      })),
    }
  }

  private buildSummary(summaries: string[]): string {
    const distinct = Array.from(
      new Set(summaries.map((summary) => summary.trim()).filter((summary) => summary.length > 0)),
    )
    const joined = (distinct.length > 0 ? distinct : ['Updated agent identity']).join(' · ')
    if (joined.length <= 140) return joined
    return `${joined.slice(0, 137)}...`
  }
}
