import { randomUUID } from 'crypto'
import { ConflictException, NotFoundException } from '@nestjs/common'
import type { CreateMissionPlanDto } from '../dto'
import { priorityToRank } from '../types/missions.types'
import { MissionInternalBase, type MissionParsedPlanSubtask } from './mission-internal.base'

export abstract class MissionInternalPlanBase extends MissionInternalBase {
  protected abstract createPlanWithRepository(
    dto: CreateMissionPlanDto,
    parsedSubtasks: MissionParsedPlanSubtask[],
  ): Promise<unknown>

  async internalCreatePlan(dto: CreateMissionPlanDto) {
    // Pre-flight: validate human assignees before we enter the transaction so the planner
    // gets a clean BadRequest instead of a constraint violation inside the lock.
    const preflightClient = this.getServiceRoleClient()
    const parsedSubtasks = (dto.subtasks || []).map((st) => ({
      ...st,
      _assignee: this.resolveSubtaskAssignee(st.assignTo),
    }))
    const humanCount = parsedSubtasks.filter((s) => s._assignee.type === 'human').length
    for (const st of parsedSubtasks) {
      if (st._assignee.type === 'human' && st._assignee.user_id) {
        await this.assertHumanAssignee(preflightClient, dto.org_id, st._assignee.user_id)
      }
    }
    if (humanCount > 0) {
      this.metrics.log(
        `metric=human_subtask_created mission=${dto.mission_id} count=${humanCount} total_subtasks=${parsedSubtasks.length}`,
      )
    }

    if (this.useNativeMissionTx()) {
      return this.postgresDirect.withTransaction(async (client) => {
        await client.query('SELECT pg_advisory_lock(abs(hashtext($1::text))::bigint)', [
          dto.mission_id,
        ])
        try {
          const missionResult = await client.query(
            `
            SELECT *
            FROM missions
            WHERE id = $1::uuid
              AND user_id = $2::uuid
              AND org_id IS NOT DISTINCT FROM $3::uuid
            LIMIT 1
          `,
            [dto.mission_id, dto.user_id, dto.org_id ?? null],
          )
          const mission = missionResult.rows[0]
          if (!mission) throw new NotFoundException('Mission not found')

          const activeSubtasksResult = await client.query(
            `
            SELECT count(*)::int AS cnt
            FROM mission_subtasks
            WHERE mission_id = $1::uuid
              AND user_id = $2::uuid
              AND org_id IS NOT DISTINCT FROM $3::uuid
              AND status NOT IN ('done', 'cancelled')
          `,
            [dto.mission_id, dto.user_id, dto.org_id ?? null],
          )
          if ((activeSubtasksResult.rows[0]?.cnt ?? 0) > 0) {
            throw new ConflictException(
              'Active subtasks already exist for this mission. Use prepare-replan to cancel them first.',
            )
          }

          const profileResult = await client.query(
            `SELECT auto_approve_plans FROM profiles WHERE id = $1::uuid LIMIT 1`,
            [dto.user_id],
          )
          const userAutoApprove = profileResult.rows[0]?.auto_approve_plans === true

          const approvalRoundResult = await client.query(
            `SELECT count(*)::int AS cnt FROM missions_logs WHERE mission_id = $1::uuid AND event_type = 'mission.plan.pending_approval'`,
            [dto.mission_id],
          )
          const priorApprovalRounds = approvalRoundResult.rows[0]?.cnt ?? 0
          const autoApprove = userAutoApprove || priorApprovalRounds >= 3

          const managerKeyResult = await client.query(
            `
            SELECT agent_key
            FROM agents_registry
            WHERE user_id = $1::uuid
              AND level = ANY($2::text[])
            ORDER BY created_at ASC
            LIMIT 1
          `,
            [dto.user_id, ['c_level', 'manager']],
          )
          const managerKey =
            (managerKeyResult.rows[0] as { agent_key?: string } | undefined)?.agent_key || 'vibey'

          const subtaskIdMap = this.createSubtaskIdMap(parsedSubtasks)
          const planContent = this.buildPlanContent(dto, subtaskIdMap)

          const planResult = await client.query(
            `
            INSERT INTO missions_plans (mission_id, user_id, org_id, content, created_by)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4::jsonb, $5::text)
            ON CONFLICT (mission_id) DO UPDATE
              SET content    = EXCLUDED.content,
                  created_by = EXCLUDED.created_by,
                  updated_at = NOW()
            RETURNING *
          `,
            [
              dto.mission_id,
              dto.user_id,
              dto.org_id ?? null,
              JSON.stringify(planContent),
              managerKey,
            ],
          )
          const plan = planResult.rows[0]

          if (parsedSubtasks.length > 0) {
            for (let i = 0; i < parsedSubtasks.length; i++) {
              const subtask = parsedSubtasks[i]
              const dbId = subtaskIdMap.get(subtask.id)
              if (!dbId) continue
              const dependsOn = (subtask.dependsOn || [])
                .map((depId) => subtaskIdMap.get(depId))
                .filter((id): id is string => !!id)

              const isHuman = subtask._assignee.type === 'human'
              const readyRoot = (subtask.dependsOn || []).length === 0
              const initialStatus = isHuman && readyRoot ? 'awaiting_human' : 'pending'
              const awaitingSince = isHuman && readyRoot ? new Date().toISOString() : null
              const slaEscalateAt = isHuman && readyRoot ? this.humanSubtaskSlaAt() : null

              await client.query(
                `
                INSERT INTO mission_subtasks (
                  id,
                  mission_id,
                  user_id,
                  org_id,
                  title,
                  status,
                  assignee_type,
                  assigned_agent_key,
                  assigned_user_id,
                  awaiting_human_since,
                  sla_escalate_at,
                  sort_order,
                  depends_on,
                  intent,
                  scheduled_at,
                  output_contract,
                  contract_status,
                  contract_verification,
                  preflight_attempts,
                  correction_attempts
                )
                VALUES (
                  $1::uuid,
                  $2::uuid,
                  $3::uuid,
                  $4::uuid,
                  $5::text,
                  $6::text,
                  $7::text,
                  $8::text,
                  $9::uuid,
                  $10::timestamptz,
                  $11::timestamptz,
                  $12::int,
                  $13::uuid[],
                  $14::jsonb,
                  $15::timestamptz,
                  $16::jsonb,
                  $17::text,
                  $18::jsonb,
                  $19::int,
                  $20::int
                )
              `,
                [
                  dbId,
                  dto.mission_id,
                  dto.user_id,
                  dto.org_id ?? null,
                  subtask.title,
                  initialStatus,
                  isHuman ? 'human' : 'agent',
                  isHuman ? null : subtask._assignee.agent_key,
                  isHuman ? subtask._assignee.user_id : null,
                  awaitingSince,
                  slaEscalateAt,
                  i,
                  dependsOn,
                  JSON.stringify(subtask.intent || {}),
                  subtask.scheduledAt ?? null,
                  subtask.outputContract ? JSON.stringify(subtask.outputContract) : null,
                  subtask.outputContract ? 'pending' : null,
                  null,
                  0,
                  0,
                ],
              )
            }
          }

          const targetStatus = autoApprove ? 'todo' : 'pending_approval'

          // Top-level assignTo is the fallback worker for the mission row. If the planner
          // handed back a human:<uuid> token we fall back to the manager agent to keep
          // agents_registry invariants intact; the human lives on the subtask, not the mission.
          const parsedMissionAssign = this.resolveSubtaskAssignee(dto.assignTo)
          const missionAgentKey =
            parsedMissionAssign.type === 'agent'
              ? (parsedMissionAssign.agent_key ?? managerKey)
              : managerKey

          await client.query(
            `
            UPDATE missions
            SET status = $3::text,
                updated_at = NOW(),
                plan_id = $4::uuid,
                assigned_agent_key = $5::text,
                current_agent_key = $6::text
            WHERE id = $1::uuid
              AND user_id = $2::uuid
              AND org_id IS NOT DISTINCT FROM $7::uuid
          `,
            [
              dto.mission_id,
              dto.user_id,
              targetStatus,
              plan.id,
              missionAgentKey,
              missionAgentKey,
              dto.org_id ?? null,
            ],
          )

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
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, $6::text, $7::text, $8::uuid, $9::jsonb)
          `,
            [
              dto.mission_id,
              dto.user_id,
              dto.org_id ?? null,
              autoApprove ? 'mission.planned' : 'mission.plan.pending_approval',
              mission.status,
              targetStatus,
              managerKey,
              mission.correlation_id,
              JSON.stringify({ plan_id: plan.id, assigned_to: dto.assignTo }),
            ],
          )

          if (autoApprove) {
            if (parsedSubtasks.length > 0) {
              for (const subtask of parsedSubtasks) {
                const mappedSubtaskId = subtaskIdMap.get(subtask.id)
                if (!mappedSubtaskId) continue
                if ((subtask.dependsOn || []).length > 0) continue

                const isHuman = subtask._assignee.type === 'human'

                if (isHuman) {
                  // Human subtask: skip execute outbox; emit awaiting_human event so the
                  // notifier service can ping the human and the watchdog can start the SLA clock.
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
                      'mission.subtask.awaiting_human.requested',
                      $4::text,
                      $5::jsonb,
                      $6::smallint,
                      'pending',
                      NOW(),
                      0,
                      3
                    )
                    ON CONFLICT (dedupe_key) DO NOTHING
                  `,
                    [
                      dto.mission_id,
                      dto.user_id,
                      dto.org_id ?? null,
                      `mission:${dto.mission_id}:subtask:${mappedSubtaskId}:awaiting_human:plan:${plan.id}`,
                      JSON.stringify({
                        phase: 'awaiting_human',
                        subtask_id: mappedSubtaskId,
                        assigned_user_id: subtask._assignee.user_id,
                        requested_by: 'plan_created',
                        plan_id: plan.id,
                      }),
                      priorityToRank(mission.priority),
                    ],
                  )
                  continue
                }

                const subtaskNextAttempt = subtask.scheduledAt || null

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
                    'mission.subtask.execute.requested',
                    $4::text,
                    $5::jsonb,
                    $6::smallint,
                    'pending',
                    COALESCE($7::timestamptz, NOW()),
                    0,
                    8
                  )
                  ON CONFLICT (dedupe_key) DO NOTHING
                `,
                  [
                    dto.mission_id,
                    dto.user_id,
                    dto.org_id ?? null,
                    `mission:${dto.mission_id}:subtask:${mappedSubtaskId}:execute:plan:${plan.id}`,
                    JSON.stringify({
                      phase: 'execute',
                      subtask_id: mappedSubtaskId,
                      requested_by: 'plan_created',
                      plan_id: plan.id,
                    }),
                    priorityToRank(mission.priority),
                    subtaskNextAttempt,
                  ],
                )
              }
            } else {
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
                  'mission.execute.requested',
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
                  dto.mission_id,
                  dto.user_id,
                  dto.org_id ?? null,
                  `mission:${dto.mission_id}:execute:plan:${plan.id}`,
                  JSON.stringify({
                    phase: 'execute',
                    requested_by: 'plan_created_legacy_execute',
                    plan_id: plan.id,
                  }),
                  priorityToRank(mission.priority),
                ],
              )
            }
          } else {
            await client.query(
              `
              INSERT INTO user_notifications (user_id, org_id, type, title, body, mission_id)
              VALUES ($1::uuid, $4::uuid, 'plan_approval_required', $2::text, $3::text, $5::uuid)
            `,
              [
                dto.user_id,
                `Plan ready: ${dto.title || mission.title}`,
                'A mission plan is waiting for your approval.',
                dto.org_id ?? null,
                dto.mission_id,
              ],
            )
          }

          return plan
        } finally {
          try {
            await client.query('SELECT pg_advisory_unlock(abs(hashtext($1::text))::bigint)', [
              dto.mission_id,
            ])
          } catch {}
        }
      })
    }

    return this.createPlanWithRepository(dto, parsedSubtasks)

  }


}
