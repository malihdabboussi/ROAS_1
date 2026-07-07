import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PostgresDirectService } from '@vibey/api-shared'
import { MissionsPlanDecisionRepository } from '../repositories/missions-plan-decision.repository'
import { MissionsRepository } from '../repositories/missions.repository'
import { priorityToRank } from '../types/missions.types'
import { AgentOnboardingService } from './agent-onboarding.service'
import { MissionOutboxService } from './mission-outbox.service'

@Injectable()
export class MissionsPlanDecisionService {
  constructor(
    private readonly postgresDirect: PostgresDirectService,
    private readonly missionsRepository: MissionsRepository,
    private readonly agentOnboardingService: AgentOnboardingService,
    private readonly missionOutboxService: MissionOutboxService,
    private readonly planDecisionRepository: MissionsPlanDecisionRepository = new MissionsPlanDecisionRepository(),
  ) {}

  async approvePlan(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const mission = await this.missionsRepository.findMissionById(
        supabase,
        missionId,
        userId,
        orgId,
      )
      if (mission.status !== 'pending_approval') {
        throw new Error('Mission is not pending approval')
      }

      const plan = await this.missionsRepository.findPlanByMissionId(supabase, missionId)
      if (!plan) throw new Error('Plan not found for mission')

      const planContent = (plan.content || {}) as Record<string, unknown>
      const recommendedHires = (planContent.recommended_hires || []) as Array<{
        role_key: string
        reason?: string
      }>

      const roleKeyToAgentKey = new Map<string, string>()

      for (const hire of recommendedHires) {
        const result = await this.agentOnboardingService.hireReadyEmployee(
          supabase,
          userId,
          {
            role_key: hire.role_key,
          },
          orgId,
        )
        const hiredAgentKey = String(result.agent?.agent_key || '')
        if (hiredAgentKey) {
          roleKeyToAgentKey.set(hire.role_key, hiredAgentKey)
          if (mission.campaign_id) {
            const agent = await this.planDecisionRepository.findCampaignAgentRegistration(
              supabase,
              userId,
              hiredAgentKey,
              orgId,
            )
            if (agent) {
              await this.planDecisionRepository.upsertCampaignAgent(supabase, {
                  campaign_id: mission.campaign_id,
                  user_id: userId,
                  org_id: orgId ?? null,
                  agent_key: hiredAgentKey,
                  name: String(agent.name ?? hiredAgentKey),
                  status: 'idle',
              })
            }
          }
        }
      }

      const subtasks = await this.planDecisionRepository.listPlanDecisionSubtasks(
        supabase,
        missionId,
        userId,
        orgId,
      )

      for (const sub of subtasks) {
        if (sub.assignee_type === 'human') continue
        const mapped = roleKeyToAgentKey.get(sub.assigned_agent_key || '')
        if (mapped) {
          await this.planDecisionRepository.updateSubtaskAssignedAgent(
            supabase,
            sub.id,
            userId,
            orgId,
            mapped,
          )
        }
      }

      await this.missionsRepository.updateMissionStatus(supabase, missionId, userId, orgId, {
        status: 'todo',
      })

      const nowIso = new Date().toISOString()
      const slaMs = 48 * 60 * 60 * 1000
      for (const sub of subtasks) {
        const deps = Array.isArray(sub.depends_on) ? sub.depends_on : []
        if (deps.length > 0) continue

        if (sub.assignee_type === 'human') {
          // Root-ready human subtask: flip to awaiting_human, start SLA clock, notify.
          await this.planDecisionRepository.markSubtaskAwaitingHuman(
            supabase,
            sub.id,
            nowIso,
            new Date(Date.now() + slaMs).toISOString(),
          )
          await this.missionOutboxService.enqueueOutboxEvent(supabase, {
            missionId,
            userId,
            orgId,
            eventType: 'mission.subtask.awaiting_human.requested',
            dedupeKey: `mission:${missionId}:subtask:${sub.id}:awaiting_human:approved:${plan.id}`,
            priorityRank: priorityToRank(mission.priority),
            payload: {
              phase: 'awaiting_human',
              subtask_id: sub.id,
              assigned_user_id: sub.assigned_user_id,
              requested_by: 'plan_approved',
              plan_id: plan.id,
            },
          })
          continue
        }

        if (String(sub.status) !== 'pending') continue
        await this.missionOutboxService.enqueueOutboxEvent(supabase, {
          missionId,
          userId,
          orgId,
          eventType: 'mission.subtask.execute.requested',
          dedupeKey: `mission:${missionId}:subtask:${sub.id}:execute:approved:${plan.id}`,
          priorityRank: priorityToRank(mission.priority),
          nextAttemptAt: sub.scheduled_at || undefined,
          payload: {
            phase: 'execute',
            subtask_id: sub.id,
            requested_by: 'plan_approved',
            plan_id: plan.id,
          },
        })
      }

      const hiredEntries = [...roleKeyToAgentKey.entries()].map(([roleKey, agentKey]) => ({
        role_key: roleKey,
        agent_key: agentKey,
      }))

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: 'mission.plan.approved',
        from_status: 'pending_approval',
        to_status: 'todo',
        correlation_id: mission.correlation_id,
        payload: {
          plan_id: plan.id,
          ...(hiredEntries.length > 0 ? { hired_agents: hiredEntries } : {}),
        },
      })

      return { ok: true, hired: hiredEntries }
    })
  }

  async rejectPlan(
    supabase: SupabaseClient,
    userId: string,
    missionId: string,
    orgId?: string | null,
  ) {
    return this.postgresDirect.withMissionAdvisoryLock(missionId, async () => {
      const mission = await this.missionsRepository.findMissionById(
        supabase,
        missionId,
        userId,
        orgId,
      )
      if (mission.status !== 'pending_approval') {
        throw new Error('Mission is not pending approval')
      }

      await this.planDecisionRepository.cancelIncompleteSubtasksForRejectedPlan(
        supabase,
        missionId,
      )

      await this.missionsRepository.updateMissionStatus(supabase, missionId, userId, orgId, {
        status: 'planning',
        current_agent_key: null,
      })

      await this.missionOutboxService.enqueueOutboxEvent(supabase, {
        missionId,
        userId,
        orgId,
        eventType: 'mission.plan.requested',
        dedupeKey: `mission:${missionId}:plan:rejected`,
        requeueExistingDedupeKey: true,
        priorityRank: priorityToRank(mission.priority),
        payload: {
          phase: 'plan',
          requested_by: 'plan_rejected',
        },
      })

      await this.missionsRepository.insertMissionLog(supabase, {
        mission_id: missionId,
        user_id: userId,
        org_id: orgId ?? null,
        event_type: 'mission.plan.rejected',
        from_status: 'pending_approval',
        to_status: 'planning',
        correlation_id: mission.correlation_id,
        payload: {},
      })

      return { ok: true }
    })
  }
}
