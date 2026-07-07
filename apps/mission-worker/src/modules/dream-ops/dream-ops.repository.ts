import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../lib/services/database.service'
import type { DreamOpsOutboxRow, DreamOpsSettingRow } from './types'

@Injectable()
export class DreamOpsRepository {
  constructor(private readonly database: DatabaseService) {}

  async listEnabledSettings(): Promise<DreamOpsSettingRow[]> {
    const { data, error } = await this.database
      .getClient()
      .from('dream_ops_settings')
      .select(
        'id, org_id, user_id, operation_type, subject_kind, subject_key, target_id, enabled, schedule, local_time, timezone, lookback_hours, min_activity_threshold, last_queued_local_date',
      )
      .eq('enabled', true)
      .in('schedule', ['daily', 'weekdays'])
      .limit(500)

    if (error) throw new Error(`Failed to load Dream Ops settings: ${error.message}`)
    return (data ?? []) as DreamOpsSettingRow[]
  }

  async findOutboxByDedupeKey(dedupeKey: string): Promise<{ id: string } | null> {
    const { data, error } = await this.database
      .getClient()
      .from('dream_ops_outbox')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Dream Ops outbox: ${error.message}`)
    return (data as { id: string } | null) ?? null
  }

  async findByDedupeKey(dedupeKey: string): Promise<{ id: string } | null> {
    const { data, error } = await this.database
      .getClient()
      .from('dream_ops_runs')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve Dream Ops run: ${error.message}`)
    return (data as { id: string } | null) ?? null
  }

  async insertOutbox(payload: Record<string, unknown>): Promise<{ id: string }> {
    const { data, error } = await this.database
      .getClient()
      .from('dream_ops_outbox')
      .insert(payload)
      .select('id')
      .single()
    if (error) throw new Error(`Failed to enqueue Dream Ops job: ${error.message}`)
    return data as { id: string }
  }

  async markSettingQueued(settingId: string, localDate: string): Promise<void> {
    const { error } = await this.database
      .getClient()
      .from('dream_ops_settings')
      .update({ last_queued_local_date: localDate })
      .eq('id', settingId)
    if (error) throw new Error(`Failed to update Dream Ops setting: ${error.message}`)
  }

  async createRun(payload: Record<string, unknown>): Promise<{ id: string }> {
    const { data, error } = await this.database
      .getClient()
      .from('dream_ops_runs')
      .insert({ ...payload, started_at: new Date().toISOString() })
      .select('id')
      .single()
    if (error) throw new Error(`Failed to create Dream Ops run: ${error.message}`)
    return data as { id: string }
  }

  async completeRun(id: string, output: Record<string, unknown>): Promise<void> {
    const { error } = await this.database
      .getClient()
      .from('dream_ops_runs')
      .update({ ...output, completed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(`Failed to complete Dream Ops run: ${error.message}`)
  }

  async countRecommendationsForRun(runId: string): Promise<number> {
    const { count, error } = await this.database
      .getClient()
      .from('agent_improvement_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('source_dream_run_id', runId)
    if (error) throw new Error(`Failed to count Dream Ops proposals: ${error.message}`)
    return count ?? 0
  }

  async getRunOutput(runId: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.database
      .getClient()
      .from('dream_ops_runs')
      .select('output')
      .eq('id', runId)
      .maybeSingle()
    if (error) throw new Error(`Failed to load Dream Ops run output: ${error.message}`)
    const output = (data as { output?: unknown } | null)?.output
    return output && typeof output === 'object' && !Array.isArray(output)
      ? (output as Record<string, unknown>)
      : {}
  }

  async markOutboxDone(outboxId: string): Promise<void> {
    const { error } = await this.database
      .getClient()
      .from('dream_ops_outbox')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', outboxId)
    if (error) throw new Error(`Failed to mark Dream Ops outbox done: ${error.message}`)
  }

  async markOutboxFailed(outboxId: string, message: string): Promise<void> {
    const { error } = await this.database
      .getClient()
      .from('dream_ops_outbox')
      .update({
        status: 'failed',
        error: message.slice(0, 1200),
        processed_at: new Date().toISOString(),
      })
      .eq('id', outboxId)
    if (error) throw new Error(`Failed to mark Dream Ops outbox failed: ${error.message}`)
  }

  async claimPendingRows(batchSize: number): Promise<DreamOpsOutboxRow[]> {
    if (this.database.hasPgPool()) {
      const { rows } = await this.database.pgQuery<DreamOpsOutboxRow>(
        `
          WITH candidates AS (
            SELECT id
            FROM dream_ops_outbox
            WHERE status = 'pending'
              AND next_attempt_at <= NOW()
            ORDER BY created_at ASC
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          )
          UPDATE dream_ops_outbox doo
          SET status = 'processing',
              attempts = doo.attempts + 1,
              error = NULL
          FROM candidates c
          WHERE doo.id = c.id
          RETURNING doo.id, doo.org_id, doo.user_id, doo.operation_type, doo.subject_kind,
                    doo.subject_key, doo.target_id, doo.dedupe_key, doo.payload,
                    doo.attempts, doo.max_attempts
        `,
        [batchSize],
      )
      return rows
    }

    const client = this.database.getClient()
    const { data } = await client
      .from('dream_ops_outbox')
      .select(
        'id, org_id, user_id, operation_type, subject_kind, subject_key, target_id, dedupe_key, payload, attempts, max_attempts',
      )
      .eq('status', 'pending')
      .lte('next_attempt_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(batchSize)

    const claimed: DreamOpsOutboxRow[] = []
    for (const row of (data ?? []) as DreamOpsOutboxRow[]) {
      const { data: claimedRow } = await client
        .from('dream_ops_outbox')
        .update({ status: 'processing', attempts: Number(row.attempts ?? 0) + 1, error: null })
        .eq('id', row.id)
        .eq('status', 'pending')
        .select(
          'id, org_id, user_id, operation_type, subject_kind, subject_key, target_id, dedupe_key, payload, attempts, max_attempts',
        )
        .maybeSingle()
      if (claimedRow) claimed.push(claimedRow as DreamOpsOutboxRow)
    }
    return claimed
  }

  async markRetry(row: DreamOpsOutboxRow, message: string): Promise<void> {
    const attempts = Number(row.attempts || 0)
    const maxAttempts = Number(row.max_attempts || 3)
    const failed = attempts >= maxAttempts
    const nextAttemptAt = failed
      ? new Date().toISOString()
      : new Date(Date.now() + Math.min(60, 2 * Math.pow(2, Math.max(0, attempts - 1))) * 1000)
          .toISOString()
    const payload = {
      status: failed ? 'failed' : 'pending',
      error: message.slice(0, 1200),
      next_attempt_at: nextAttemptAt,
      processed_at: failed ? new Date().toISOString() : null,
    }

    if (this.database.hasPgPool()) {
      await this.database.pgQuery(
        `UPDATE dream_ops_outbox SET status = $2, error = $3, next_attempt_at = $4, processed_at = $5 WHERE id = $1`,
        [row.id, payload.status, payload.error, payload.next_attempt_at, payload.processed_at],
      )
      return
    }

    await this.database.getClient().from('dream_ops_outbox').update(payload).eq('id', row.id)
  }
}
