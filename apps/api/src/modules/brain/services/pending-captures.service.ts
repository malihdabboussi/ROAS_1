import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PendingCapturesRepository } from '../repositories/pending-captures.repository'

@Injectable()
export class PendingCapturesService {
  private readonly logger = new Logger(PendingCapturesService.name)

  constructor(private readonly pendingCapturesRepository: PendingCapturesRepository) {}

  async listPending(supabase: SupabaseClient, userId: string) {
    const { data, error } = await this.pendingCapturesRepository.listPending(supabase, userId)

    if (error) throw new Error(`Failed to list pending captures: ${error.message}`)
    return data ?? []
  }

  async acceptCapture(supabase: SupabaseClient, userId: string, captureId: string) {
    const capture = await this.pendingCapturesRepository.findPendingCapture(
      supabase,
      userId,
      captureId,
    )

    if (!capture) throw new NotFoundException('Pending capture not found')

    const snapshots = capture.snapshots as Record<string, unknown>[]
    if (Array.isArray(snapshots)) {
      for (const snapshot of snapshots) {
        const snapshotSourceType =
          typeof snapshot?.source_type === 'string' && snapshot.source_type.length > 0
            ? snapshot.source_type
            : capture.source_type || 'conversation'
        const snapshotSourceId =
          typeof snapshot?.source_id === 'string' && snapshot.source_id.length > 0
            ? snapshot.source_id
            : capture.session_id
        const snapshotSourceTitle =
          typeof snapshot?.source_title === 'string' && snapshot.source_title.length > 0
            ? snapshot.source_title
            : null

        await this.pendingCapturesRepository.insertAcceptedSnapshot(supabase, {
          brain_id: capture.brain_id,
          name: String(snapshot.title ?? snapshot.content ?? 'Captured snapshot'),
          type: 'Model',
          core: String(snapshot.content ?? ''),
          one_liner: null,
          story: null,
          moment: null,
          emotion: null,
          source: snapshotSourceTitle,
          trigger_pattern: null,
          method: null,
          steps: null,
          filter: null,
          challenge: null,
          break_test: null,
          risks: null,
          proof: null,
          tags: snapshot.tags ?? [],
          confidence: snapshot.confidence ?? 0.8,
          significance_score: snapshot.significance ?? 0.6,
          source_type: snapshotSourceType,
          source_id: snapshotSourceId,
          agent_id: capture.agent_id,
          session_id: capture.session_id,
          capture_context: capture.context,
        })
      }
    }

    await this.pendingCapturesRepository.markAccepted(supabase, captureId, new Date().toISOString())

    this.logger.log(`Accepted capture ${captureId}: ${snapshots?.length ?? 0} snapshots moved`)
    return { accepted: true, snapshotsCreated: snapshots?.length ?? 0 }
  }

  async rejectCapture(supabase: SupabaseClient, userId: string, captureId: string) {
    await this.pendingCapturesRepository.markRejected(
      supabase,
      userId,
      captureId,
      new Date().toISOString(),
    )
    return { rejected: true }
  }
}
