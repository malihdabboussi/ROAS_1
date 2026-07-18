import { randomUUID } from 'crypto'
import { ConflictException } from '@nestjs/common'
import type { CreateMissionPlanDto } from '../dto'
import { priorityToRank } from '../types/missions.types'
import { MissionInternalPlanBase } from './mission-internal-plan.base'
import type { MissionParsedPlanSubtask } from './mission-internal.base'

export abstract class MissionInternalRepositoryPlanBase extends MissionInternalPlanBase {
  protected async createPlanWithRepository(
    dto: CreateMissionPlanDto,
    parsedSubtasks: MissionParsedPlanSubtask[],
  ): Promise<unknown> {
    const supabase = this.getServiceRoleClient()
    return this.postgresDirect.withMissionAdvisoryLock(dto.mission_id, async () => {
      const mission = await this.missionsRepository.findMissionById(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
      )

      const activeSubtaskCount = await this.missionInternalRepository.countActiveSubtasksForMission(
        supabase,
        dto.mission_id,
      )
      if (activeSubtaskCount > 0) {
        throw new ConflictException(
          'Active subtasks already exist for this mission. Use prepare-replan to cancel them first.',
        )
      }

      const userAutoApprove = await this.missionInternalRepository.findUserAutoApprovePlans(
        supabase,
        dto.user_id,
      )
      const priorApprovalRounds = await this.missionInternalRepository.countPlanApprovalRounds(
        supabase,
        dto.mission_id,
      )
      const autoApprove = userAutoApprove || priorApprovalRounds >= 3

      const subtaskIdMap = this.createSubtaskIdMap(parsedSubtasks)
      const planContent = this.buildPlanContent(dto, subtaskIdMap)

      const managerKey = await this.missionsRepository.findPrimaryManagerKey(
        supabase,
        dto.user_id,
        dto.org_id,
      )

      const plan = await this.missionsRepository.createPlan(supabase, {
        mission_id: dto.mission_id,
        user_id: dto.user_id,
        content: planContent,
        created_by: managerKey,
      })

      const subtaskScheduleMap = new Map<string, string | null>()
      const subtaskAssigneeMap = new Map<string, MissionParsedPlanSubtask['_assignee']>()
      if (parsedSubtasks.length > 0) {
        const subtaskRows = parsedSubtasks.map((st, idx) => {
          const dbId = subtaskIdMap.get(st.id) ?? randomUUID()
          subtaskIdMap.set(st.id, dbId)
          subtaskScheduleMap.set(dbId, st.scheduledAt ?? null)
          subtaskAssigneeMap.set(dbId, st._assignee)
          const isHuman = st._assignee.type === 'human'
          const readyRoot = (st.dependsOn || []).length === 0
          return {
            id: dbId,
            mission_id: dto.mission_id,
            user_id: dto.user_id,
            org_id: dto.org_id ?? null,
            title: st.title,
            status: isHuman && readyRoot ? 'awaiting_human' : 'pending',
            assignee_type: (isHuman ? 'human' : 'agent') as 'agent' | 'human',
            assigned_agent_key: isHuman ? null : st._assignee.agent_key,
            assigned_user_id: isHuman ? st._assignee.user_id : null,
            awaiting_human_since: isHuman && readyRoot ? new Date().toISOString() : null,
            sla_escalate_at: isHuman && readyRoot ? this.humanSubtaskSlaAt() : null,
            sort_order: idx,
            depends_on: [] as string[],
            intent: st.intent || {},
            scheduled_at: st.scheduledAt ?? null,
            publish_to_task_list: st.publishToTaskList === true,
            output_contract: st.outputContract ?? null,
            contract_status: st.outputContract ? 'pending' : null,
            contract_verification: null,
            preflight_attempts: 0,
            correction_attempts: 0,
          }
        })
        for (let i = 0; i < parsedSubtasks.length; i++) {
          const deps = parsedSubtasks[i].dependsOn || []
          subtaskRows[i].depends_on = deps
            .map((depId) => subtaskIdMap.get(depId))
            .filter((id): id is string => !!id)
        }
        await this.missionsRepository.createSubtasks(supabase, subtaskRows)
      }

      const targetStatus = autoApprove ? 'todo' : 'pending_approval'

      const parsedMissionAssign = this.resolveSubtaskAssignee(dto.assignTo)
      const missionAgentKey =
        parsedMissionAssign.type === 'agent'
          ? (parsedMissionAssign.agent_key ?? managerKey)
          : managerKey

      await this.missionsRepository.updateMissionStatus(
        supabase,
        dto.mission_id,
        dto.user_id,
        dto.org_id,
        {
          status: targetStatus,
          plan_id: plan.id,
          assigned_agent_key: missionAgentKey,
          current_agent_key: missionAgentKey,
        },
      )

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: dto.mission_id,
        user_id: dto.user_id,
        org_id: dto.org_id ?? null,
        event_type: autoApprove ? 'mission.planned' : 'mission.plan.pending_approval',
        from_status: mission.status,
        to_status: targetStatus,
        agent_key: managerKey,
        correlation_id: mission.correlation_id,
        payload: { plan_id: plan.id, assigned_to: dto.assignTo },
      })

      if (autoApprove) {
        if (parsedSubtasks.length > 0) {
          for (const subtask of parsedSubtasks) {
            const mappedSubtaskId = subtaskIdMap.get(subtask.id)
            if (!mappedSubtaskId) continue
            if ((subtask.dependsOn || []).length > 0) continue

            const subtaskAssignee = subtaskAssigneeMap.get(mappedSubtaskId)
            if (subtaskAssignee?.type === 'human') {
              await this.missionOutboxService.enqueueOutboxEvent(supabase, {
                missionId: dto.mission_id,
                userId: dto.user_id,
                orgId: dto.org_id,
                eventType: 'mission.subtask.awaiting_human.requested',
                dedupeKey: `mission:${dto.mission_id}:subtask:${mappedSubtaskId}:awaiting_human:plan:${plan.id}`,
                priorityRank: priorityToRank(mission.priority),
                payload: {
                  phase: 'awaiting_human',
                  subtask_id: mappedSubtaskId,
                  assigned_user_id: subtaskAssignee.user_id,
                  requested_by: 'plan_created',
                  plan_id: plan.id,
                },
              })
              continue
            }

            const subtaskScheduledAt = subtaskScheduleMap.get(mappedSubtaskId) || undefined

            await this.missionOutboxService.enqueueOutboxEvent(supabase, {
              missionId: dto.mission_id,
              userId: dto.user_id,
              orgId: dto.org_id,
              eventType: 'mission.subtask.execute.requested',
              dedupeKey: `mission:${dto.mission_id}:subtask:${mappedSubtaskId}:execute:plan:${plan.id}`,
              priorityRank: priorityToRank(mission.priority),
              nextAttemptAt: subtaskScheduledAt,
              payload: {
                phase: 'execute',
                subtask_id: mappedSubtaskId,
                requested_by: 'plan_created',
                plan_id: plan.id,
              },
            })
          }
        } else {
          await this.missionOutboxService.enqueueOutboxEvent(supabase, {
            missionId: dto.mission_id,
            userId: dto.user_id,
            orgId: dto.org_id,
            eventType: 'mission.execute.requested',
            dedupeKey: `mission:${dto.mission_id}:execute:plan:${plan.id}`,
            priorityRank: priorityToRank(mission.priority),
            payload: {
              phase: 'execute',
              requested_by: 'plan_created_legacy_execute',
              plan_id: plan.id,
            },
          })
        }
      } else {
        const notificationError =
          await this.missionInternalRepository.insertPlanApprovalNotification(supabase, {
            user_id: dto.user_id,
            org_id: dto.org_id ?? null,
            title: `Plan ready: ${dto.title || mission.title}`,
            body: 'A mission plan is waiting for your approval.',
            mission_id: dto.mission_id,
          })
        if (notificationError) {
          throw new Error(`Failed to insert plan approval notification: ${notificationError}`)
        }
      }

      return plan
    })
  }
}
