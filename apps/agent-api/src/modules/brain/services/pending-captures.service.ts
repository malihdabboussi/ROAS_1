import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { BrainRuntimeRepository } from '../repositories/brain-runtime.repository'

type PendingCaptureRecord = {
  brain_id: string
  profile_id?: string | null
  snapshots?: Record<string, unknown>[] | null
  agent_id?: string | null
  session_id?: string | null
  context?: string | null
  source_type?: string | null
}

@Injectable()
export class PendingCapturesService {
  private readonly logger = new Logger(PendingCapturesService.name)
  private readonly supabase: SupabaseClient

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: BrainRuntimeRepository,
  ) {
    this.supabase = svc.client
  }

  async submitPending(params: {
    brainId: string
    profileId: string
    snapshots: Record<string, unknown>[]
    embeddings?: number[][]
    agentId?: string
    sessionId?: string
    context?: string
    sourceType?: string
    sourceId?: string
    sourceTitle?: string
    tokensUsed?: number
  }): Promise<{ id: string }> {
    const autoAcceptAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const captureContext = params.sourceTitle
      ? `${params.context ?? 'Auto-extracted conversation'} (${params.sourceTitle})`
      : (params.context ?? null)

    const { data, error } = await this.repository.createPendingCapture(this.supabase, {
      brain_id: params.brainId,
      profile_id: params.profileId,
      snapshots: params.snapshots,
      embeddings: params.embeddings ?? null,
      agent_id: params.agentId ?? null,
      session_id: params.sessionId ?? params.sourceId ?? null,
      context: captureContext,
      source_type: params.sourceType ?? 'conversation',
      status: 'pending',
      auto_accept_at: autoAcceptAt,
      tokens_used: params.tokensUsed ?? 0,
    })

    if (error) throw new Error(`Failed to submit pending capture: ${error.message}`)
    const captureId = (data as { id: string }).id
    this.logger.log(`Pending capture submitted: ${captureId} (auto-accept at ${autoAcceptAt})`)
    return { id: captureId }
  }

  async listPending(profileId: string) {
    const { data, error } = await this.repository.listPendingCaptures(this.supabase, profileId)
    if (error) throw new Error(`Failed to list pending captures: ${error.message}`)
    return data ?? []
  }

  async acceptCapture(id: string, profileId?: string) {
    const { data: capture, error: fetchErr } = await this.repository.findPendingCapture(
      this.supabase,
      { id, profileId },
    )
    if (fetchErr || !capture) throw new Error('Pending capture not found')
    const captureRow = capture as PendingCaptureRecord

    const snapshots = Array.isArray(captureRow.snapshots) ? captureRow.snapshots : []
    for (const snapshot of snapshots) {
      const snapshotSourceType =
        typeof snapshot?.source_type === 'string' && snapshot.source_type.length > 0
          ? snapshot.source_type
          : captureRow.source_type || 'conversation'
      const snapshotSourceId =
        typeof snapshot?.source_id === 'string' && snapshot.source_id.length > 0
          ? snapshot.source_id
          : captureRow.session_id
      const snapshotSourceTitle =
        typeof snapshot?.source_title === 'string' && snapshot.source_title.length > 0
          ? snapshot.source_title
          : null

      await this.repository.insertSnapshot(this.supabase, {
        brain_id: captureRow.brain_id,
        name: String(snapshot?.title ?? snapshot?.content ?? 'Captured snapshot'),
        type: 'Model',
        core: String(snapshot?.content ?? ''),
        confidence: Number(snapshot?.confidence ?? 0.8),
        significance_score: Number(snapshot?.significance ?? 0.6),
        tags: Array.isArray(snapshot?.tags) ? snapshot.tags : [],
        source: snapshotSourceTitle,
        source_type: snapshotSourceType,
        source_id: snapshotSourceId,
        agent_id: captureRow.agent_id,
        session_id: captureRow.session_id,
        capture_context: captureRow.context,
      })
    }

    const updateErr = await this.repository.markPendingCaptureAccepted(this.supabase, {
      id,
      reviewedAt: new Date().toISOString(),
    })
    if (updateErr) throw new Error(`Failed to mark capture accepted: ${updateErr.message}`)
    return { accepted: true, snapshotsCreated: snapshots.length }
  }

  async rejectCapture(id: string, profileId?: string) {
    const error = await this.repository.markPendingCaptureRejected(this.supabase, {
      id,
      profileId,
      reviewedAt: new Date().toISOString(),
    })
    if (error) throw new Error(`Failed to reject capture: ${error.message}`)
    return { rejected: true }
  }
}
