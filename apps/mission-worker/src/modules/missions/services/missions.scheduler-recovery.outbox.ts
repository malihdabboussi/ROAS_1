import { Logger } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'
import { priorityToRank } from '../types'

export async function enqueueMissionOutboxEvent(
  databaseService: DatabaseService,
  logger: Logger,
  input: {
    missionId: string
    userId: string
    orgId?: string | null
    eventType: string
    dedupeKey: string
    payload?: Record<string, unknown>
    requeueExistingDedupeKey?: boolean
  },
): Promise<void> {
  let rank = 3
  let resolvedOrgId: string | null = input.orgId ?? null
  try {
    const supabaseLookup = databaseService.getClient()
    const { data: missionRow } = await supabaseLookup
      .from('missions')
      .select('priority, org_id')
      .eq('id', input.missionId)
      .eq('user_id', input.userId)
      .maybeSingle()
    rank = priorityToRank(missionRow?.priority)
    resolvedOrgId = (missionRow?.org_id as string | null | undefined) ?? resolvedOrgId
  } catch {
    rank = 3
  }

  try {
    if (!databaseService.hasPgPool()) {
      const supabase = databaseService.getClient()
      if (input.requeueExistingDedupeKey) {
        const { error } = await supabase.from('mission_outbox').upsert(
          {
            mission_id: input.missionId,
            user_id: input.userId,
            org_id: resolvedOrgId,
            event_type: input.eventType,
            dedupe_key: input.dedupeKey,
            payload: input.payload || {},
            priority_rank: rank,
            status: 'pending',
            next_attempt_at: new Date().toISOString(),
            locked_at: null,
            error: null,
            attempts: 0,
            processed_at: null,
          },
          { onConflict: 'dedupe_key' },
        )
        if (error) throw new Error(error.message)
        return
      }
      const { error } = await supabase.from('mission_outbox').insert({
        mission_id: input.missionId,
        user_id: input.userId,
        org_id: resolvedOrgId,
        event_type: input.eventType,
        dedupe_key: input.dedupeKey,
        payload: input.payload || {},
        priority_rank: rank,
        status: 'pending',
      })
      if (error) throw new Error(error.message)
      return
    }

    const conflictSql = input.requeueExistingDedupeKey
      ? `
          ON CONFLICT (dedupe_key) DO UPDATE SET
            mission_id = EXCLUDED.mission_id,
            user_id = EXCLUDED.user_id,
            org_id = EXCLUDED.org_id,
            event_type = EXCLUDED.event_type,
            payload = EXCLUDED.payload,
            priority_rank = EXCLUDED.priority_rank,
            status = 'pending',
            next_attempt_at = NOW(),
            locked_at = NULL,
            error = NULL,
            attempts = 0,
            processed_at = NULL
        `
      : `ON CONFLICT (dedupe_key) DO NOTHING`

    await databaseService.pgQuery(
      `
          INSERT INTO mission_outbox (
            mission_id,
            user_id,
            org_id,
            event_type,
            dedupe_key,
            payload,
            priority_rank,
            status,
            next_attempt_at
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::jsonb, $7::smallint, 'pending', NOW())
          ${conflictSql}
        `,
      [
        input.missionId,
        input.userId,
        resolvedOrgId,
        input.eventType,
        input.dedupeKey,
        JSON.stringify(input.payload || {}),
        rank,
      ],
    )
  } catch (error) {
    logger.error(`Failed to enqueue outbox event ${input.eventType}: ${(error as Error).message}`)
  }
}
