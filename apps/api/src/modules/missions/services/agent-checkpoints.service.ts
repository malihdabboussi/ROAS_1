import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isSystemAgentKey } from '../lib/system-agent-keys'
import { AgentCheckpointsRepository } from '../repositories/agent-checkpoints.repository'

@Injectable()
export class AgentCheckpointsService {
  constructor(private readonly repository: AgentCheckpointsRepository) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    opts: { limit?: string; cursor?: string | null },
  ) {
    const normalizedAgentKey = this.normalizeAgentKey(agentKey)
    this.assertMutableAgent(normalizedAgentKey)
    const limit = Math.min(Math.max(Number(opts.limit ?? 30) || 30, 1), 100)
    return this.repository.list(supabase, userId, orgId, normalizedAgentKey, {
      limit,
      cursor: opts.cursor ?? null,
    })
  }

  async get(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    checkpointId: string,
  ) {
    const normalizedAgentKey = this.normalizeAgentKey(agentKey)
    this.assertMutableAgent(normalizedAgentKey)
    const checkpoint = await this.repository.getById(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
      checkpointId,
    )
    if (!checkpoint) throw new NotFoundException('Checkpoint not found')
    const previous = await this.repository.getPrevious(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
      checkpoint.created_at,
    )
    return { checkpoint, previous_checkpoint: previous }
  }

  async updateSummary(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    checkpointId: string,
    summary: string,
  ) {
    const normalizedAgentKey = this.normalizeAgentKey(agentKey)
    this.assertMutableAgent(normalizedAgentKey)
    const cleanSummary = summary.trim()
    if (cleanSummary.length === 0 || cleanSummary.length > 140) {
      throw new BadRequestException('Summary must be 1-140 characters')
    }
    return this.repository.updateSummary(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
      checkpointId,
      cleanSummary,
    )
  }

  async restore(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    checkpointId: string,
  ) {
    const normalizedAgentKey = this.normalizeAgentKey(agentKey)
    this.assertMutableAgent(normalizedAgentKey)
    const checkpoint = await this.repository.getById(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
      checkpointId,
    )
    if (!checkpoint) throw new NotFoundException('Checkpoint not found')
    await this.repository.restoreSnapshot(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
      checkpoint.snapshot,
    )
    const restore = await this.repository.insertRestoreCheckpoint(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
      checkpoint.source_conversation_id,
      `Restored: ${checkpoint.summary}`.slice(0, 140),
      checkpoint.snapshot,
    )
    return { ok: true, checkpoint_id: restore.id }
  }

  async createLearningLoopCheckpoint(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    summary: string,
  ) {
    const normalizedAgentKey = this.normalizeAgentKey(agentKey)
    this.assertMutableAgent(normalizedAgentKey)
    const cleanSummary = summary.trim()
    if (cleanSummary.length === 0 || cleanSummary.length > 140) {
      throw new BadRequestException('Summary must be 1-140 characters')
    }
    const snapshot = await this.repository.createSnapshot(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
    )
    return this.repository.insertLearningLoopCheckpoint(
      supabase,
      userId,
      orgId,
      normalizedAgentKey,
      cleanSummary,
      snapshot,
    )
  }

  private normalizeAgentKey(agentKey: string): string {
    return agentKey.toLowerCase().replace(/[^a-z0-9_]/g, '_')
  }

  private assertMutableAgent(agentKey: string): void {
    if (isSystemAgentKey(agentKey)) {
      throw new ForbiddenException('System agents cannot use checkpoints')
    }
  }
}
