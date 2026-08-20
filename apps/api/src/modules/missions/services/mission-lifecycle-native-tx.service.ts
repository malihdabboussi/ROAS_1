import { randomUUID } from 'crypto'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PostgresDirectService } from '@vibey/api-shared'
import type { AddMissionCommentDto, CreateMissionDto } from '../dto'
import { MISSION_COMMENT_DIRECTIVE_EXECUTOR_KEY } from '../mission-comment-directive.constants'
import { priorityToRank } from '../types/missions.types'

@Injectable()
export class MissionLifecycleNativeTxService {
  constructor(private readonly postgresDirect: PostgresDirectService) {}

  isEnabled(): boolean {
    return this.postgresDirect.hasConnectionString()
  }

  async addUserCommentTransactional(
    userId: string,
    missionId: string,
    dto: AddMissionCommentDto,
    orgId?: string | null,
  ) {
    return this.postgresDirect.withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_lock(abs(hashtext($1::text))::bigint)', [missionId])
      try {
        const missionScopeClause = orgId
          ? 'AND org_id = $2::uuid'
          : 'AND user_id = $2::uuid AND org_id IS NULL'
        const missionResult = await client.query(
          `
            SELECT *
            FROM missions
            WHERE id = $1::uuid
              ${missionScopeClause}
            LIMIT 1
          `,
          [missionId, orgId ?? userId],
        )
        const mission = missionResult.rows[0]
        if (!mission) throw new NotFoundException('Mission not found')

        const commentResult = await client.query(
          `
            INSERT INTO missions_logs (
              mission_id,
              user_id,
              org_id,
              event_type,
              agent_key,
              payload
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, 'user.comment', $4::text, $5::jsonb)
            RETURNING *
          `,
          [
            missionId,
            userId,
            orgId ?? null,
            dto.agent_key ?? null,
            JSON.stringify({
              message: dto.message,
              ...(dto.agent_key ? { commented_by_agent_key: dto.agent_key } : {}),
              ...(dto.attachments?.length ? { attachments: dto.attachments } : {}),
            }),
          ],
        )
        const commentLog = commentResult.rows[0]

        await client.query(
          `
            INSERT INTO missions_logs (
              mission_id,
              user_id,
              org_id,
              event_type,
              from_status,
              to_status,
              agent_key,
              correlation_id,
              payload
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, 'mission.comment.triage.requested', $4::text, $4::text, $5::text, $6::uuid, $7::jsonb)
          `,
          [
            missionId,
            userId,
            orgId ?? null,
            mission.status,
            MISSION_COMMENT_DIRECTIVE_EXECUTOR_KEY,
            mission.correlation_id,
            JSON.stringify({
              reason: 'user_comment_directive',
              comment_id: commentLog.id,
            }),
          ],
        )

        await client.query(
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
              next_attempt_at,
              attempts,
              max_attempts
            )
            VALUES (
              $1::uuid,
              $2::uuid,
              $3::uuid,
              'mission.comment.directive',
              $4::text,
              $5::jsonb,
              $6::smallint,
              'pending',
              NOW(),
              0,
              8
            )
            ON CONFLICT (dedupe_key) DO NOTHING
          `,
          [
            missionId,
            userId,
            orgId ?? null,
            `mission:${missionId}:directive:comment:${commentLog.id}`,
            JSON.stringify({
              comment_id: commentLog.id,
              comment_message: dto.message,
              from_status: mission.status,
              correlation_id: mission.correlation_id,
            }),
            priorityToRank(mission.priority),
          ],
        )

        return commentLog
      } finally {
        await client.query('SELECT pg_advisory_unlock(abs(hashtext($1::text))::bigint)', [
          missionId,
        ])
      }
    })
  }

  async createTransactional(
    userId: string,
    dto: CreateMissionDto,
    idempotencyKey: string,
    orgId?: string | null,
    missionVisibility: 'private' | 'space' = 'private',
  ) {
    return this.postgresDirect.withTransaction(async (client) => {
      const existingResult = await client.query(
        `
            SELECT *
            FROM missions
            WHERE idempotency_key = $1::text
              ${orgId ? 'AND org_id = $2::uuid' : 'AND user_id = $2::uuid AND org_id IS NULL'}
            LIMIT 1
          `,
        [idempotencyKey, orgId ?? userId],
      )
      if ((existingResult.rowCount || 0) > 0) {
        return existingResult.rows[0]
      }

      const managerKeyResult = await client.query(
        `
            SELECT agent_key
            FROM agents_registry
            WHERE ${orgId ? 'user_id IS NULL AND org_id = $1::uuid' : 'user_id = $1::uuid AND org_id IS NULL'}
              AND level = ANY($2::text[])
              AND is_active = TRUE
            ORDER BY created_at ASC
            LIMIT 1
          `,
        [orgId ?? userId, ['c_level', 'manager']],
      )
      const assignedAgentKey =
        dto.assigned_agent_key ||
        (managerKeyResult.rows[0] as { agent_key?: string } | undefined)?.agent_key ||
        'vibey'

      if (dto.assigned_agent_key) {
        const activeCheck = await client.query(
          `
              SELECT is_active
              FROM agents_registry
              WHERE ${orgId ? 'user_id IS NULL AND org_id = $1::uuid' : 'user_id = $1::uuid AND org_id IS NULL'}
                AND agent_key = $2::text
              LIMIT 1
            `,
          [orgId ?? userId, dto.assigned_agent_key],
        )
        const row = activeCheck.rows[0] as { is_active?: boolean | null } | undefined
        if (row && row.is_active === false) {
          throw new BadRequestException(
            `Agent '${dto.assigned_agent_key}' is deactivated and cannot be assigned`,
          )
        }
      }

      const correlationId = randomUUID()
      const missionInsert = await client.query(
        `
            INSERT INTO missions (
              user_id,
              org_id,
              parent_mission_id,
              campaign_id,
              space_id,
              source_space_item_id,
              mission_visibility,
              title,
              brief,
              description,
              status,
              priority,
              assigned_agent_key,
              current_agent_key,
              correlation_id,
              idempotency_key,
              retry_count,
              input,
              scheduled_at
            )
            VALUES (
              $1::uuid,
              $2::uuid,
              $3::uuid,
              $4::uuid,
              $5::uuid,
              $6::uuid,
              $7::text,
              $8::text,
              $9::text,
              $10::text,
              'inbox',
              $11::text,
              $12::text,
              NULL,
              $13::uuid,
              $14::text,
              0,
              $15::jsonb,
              $16::timestamptz
            )
            RETURNING *
          `,
        [
          userId,
          orgId ?? null,
          dto.parent_mission_id || null,
          dto.campaign_id || null,
          dto.space_id || null,
          dto.source_space_item_id || null,
          missionVisibility,
          dto.title,
          dto.brief || null,
          dto.description || null,
          dto.priority || 'medium',
          assignedAgentKey,
          correlationId,
          idempotencyKey,
          JSON.stringify(dto.input || {}),
          dto.scheduled_at ?? null,
        ],
      )

      const mission = missionInsert.rows[0]
      const queuePayload = {
        mission_id: mission.id,
        user_id: userId,
        correlation_id: mission.correlation_id,
        assigned_agent_key: mission.assigned_agent_key,
        title: mission.title,
        brief: mission.brief,
        input: mission.input,
      }

      await client.query(
        `
            INSERT INTO missions_logs (
              mission_id,
              user_id,
              org_id,
              event_type,
              to_status,
              agent_key,
              correlation_id,
              payload
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, 'mission.created', 'inbox', $4::text, $5::uuid, $6::jsonb)
          `,
        [
          mission.id,
          userId,
          orgId ?? null,
          mission.assigned_agent_key || null,
          mission.correlation_id,
          JSON.stringify({ queue_trigger: queuePayload }),
        ],
      )

      await client.query(
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
              next_attempt_at,
              attempts,
              max_attempts
            )
            VALUES (
              $1::uuid,
              $2::uuid,
              $3::uuid,
              'mission.plan.requested',
              $4::text,
              $5::jsonb,
              $6::smallint,
              'pending',
              NOW(),
              0,
              8
            )
            ON CONFLICT (dedupe_key) DO NOTHING
          `,
        [
          mission.id,
          userId,
          orgId ?? null,
          `mission:${mission.id}:plan:create:${idempotencyKey}`,
          JSON.stringify({
            requested_by: 'create',
            idempotency_key: idempotencyKey,
            ...(dto.scheduled_at ? { scheduled_at: dto.scheduled_at } : {}),
          }),
          priorityToRank(dto.priority),
        ],
      )

      return {
        ...mission,
        queue_trigger: queuePayload,
      }
    })
  }

  async retryTransactional(
    userId: string,
    missionId: string,
    opts?: { retriedBy?: 'user' | 'awareness'; awareness_session_id?: string },
    orgId?: string | null,
  ) {
    const retriedBy = opts?.retriedBy ?? 'user'
    return this.postgresDirect.withTransaction(async (client) => {
      await client.query('SELECT pg_advisory_lock(abs(hashtext($1::text))::bigint)', [missionId])
      try {
        const existingResult = await client.query(
          `
            SELECT *
            FROM missions
            WHERE id = $1::uuid
              ${orgId ? 'AND org_id = $2::uuid' : 'AND user_id = $2::uuid AND org_id IS NULL'}
            LIMIT 1
          `,
          [missionId, orgId ?? userId],
        )
        const existing = existingResult.rows[0]
        if (!existing) throw new NotFoundException('Mission not found')
        if (existing.status !== 'error' && existing.status !== 'failed') {
          throw new Error('Only error or failed missions can be retried')
        }

        const updatedResult = await client.query(
          `
            UPDATE missions
            SET status = 'inbox',
                updated_at = NOW(),
                error = NULL
            WHERE id = $1::uuid
              ${orgId ? 'AND org_id = $2::uuid' : 'AND user_id = $2::uuid AND org_id IS NULL'}
            RETURNING *
          `,
          [missionId, orgId ?? userId],
        )
        const updated = updatedResult.rows[0]

        await client.query(
          `
            INSERT INTO missions_logs (
              mission_id,
              user_id,
              org_id,
              event_type,
              from_status,
              to_status,
              correlation_id,
              payload
            )
            VALUES ($1::uuid, $2::uuid, $3::uuid, 'mission.retried', $4::text, 'inbox', $5::uuid, $6::jsonb)
          `,
          [
            missionId,
            userId,
            orgId ?? null,
            existing.status,
            updated.correlation_id,
            JSON.stringify({
              retried_by: retriedBy,
              ...(opts?.awareness_session_id
                ? { awareness_session_id: opts.awareness_session_id }
                : {}),
            }),
          ],
        )

        await client.query(
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
              next_attempt_at,
              attempts,
              max_attempts
            )
            VALUES (
              $1::uuid,
              $2::uuid,
              $3::uuid,
              'mission.plan.requested',
              $4::text,
              $5::jsonb,
              $6::smallint,
              'pending',
              NOW(),
              0,
              8
            )
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
          `,
          [
            missionId,
            userId,
            orgId ?? null,
            `mission:${missionId}:plan:retry`,
            JSON.stringify({
              requested_by: retriedBy === 'awareness' ? 'awareness_retry' : 'retry',
              ...(opts?.awareness_session_id
                ? { awareness_session_id: opts.awareness_session_id }
                : {}),
            }),
            priorityToRank(existing.priority),
          ],
        )

        return updated
      } finally {
        await client.query('SELECT pg_advisory_unlock(abs(hashtext($1::text))::bigint)', [
          missionId,
        ])
      }
    })
  }
}
