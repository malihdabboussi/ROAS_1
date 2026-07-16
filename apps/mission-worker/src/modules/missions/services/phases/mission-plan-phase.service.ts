import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Job } from 'bullmq'
import { DatabaseService } from '../../../../lib/services/database.service'
import type { MissionJobData, MissionJobResult, MissionStatus } from '../../types'
import { expandMissionPlaybook } from '../../playbooks/webinar-fulfillment.playbook'
import { MissionOpenclawGateway } from '../gateways/mission-openclaw.gateway'
import { MissionAgentStateService } from '../persistence/mission-agent-state.service'
import { MissionStateRepository } from '../persistence/mission-state.repository'
import { UserNotificationEmitterService } from '../user-notification-emitter.service'
import { MissionJsonService } from '../utils/mission-json.service'
import { MissionPhaseSupportService } from './mission-phase-support.service'

@Injectable()
export class MissionPlanPhaseService {
  private readonly logger = new Logger(MissionPlanPhaseService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly stateRepo: MissionStateRepository,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly agentStateService: MissionAgentStateService,
    private readonly jsonService: MissionJsonService,
    private readonly support: MissionPhaseSupportService,
    private readonly notificationEmitter: UserNotificationEmitterService,
  ) {}

  async process(job: Job<MissionJobData>): Promise<MissionJobResult> {
    const { missionId } = job.data
    const missionClient = this.databaseService.getClient()

    const mission = await this.stateRepo.getMission(
      missionClient,
      missionId,
      job.data.userId,
      job.data.orgId ?? null,
    )
    const executionTimeoutMs = this.support.getTimeoutMs()
    const mgr = await this.stateRepo.resolveManagerKey(
      missionClient,
      mission.user_id,
      mission.org_id ?? null,
    )

    const statusStr = String(mission.status || '')
    if (statusStr !== 'inbox' && statusStr !== 'planning') {
      this.logger.warn(
        `Skipping stale plan job for mission ${missionId}: current status is ${statusStr}`,
      )
      return {
        missionId,
        success: true,
        status: mission.status as MissionStatus,
        processedAt: new Date().toISOString(),
        output: { skipped_plan: true, reason: 'mission_not_plannable' },
      }
    }

    try {
      const missionInputEarly =
        mission.input && typeof mission.input === 'object' && !Array.isArray(mission.input)
          ? (mission.input as Record<string, unknown>)
          : {}
      const playbookIdEarly =
        typeof missionInputEarly.playbook_id === 'string'
          ? missionInputEarly.playbook_id.trim()
          : ''

      if (playbookIdEarly === 'webinar-fulfillment' && mission.campaign_id) {
        await this.ensureWebinarFulfillmentTeam(mission, playbookIdEarly)
      }

      if (mission.campaign_id) {
        let campaignWorkersQuery = missionClient
          .from('campaign_agents')
          .select('agent_key')
          .eq('campaign_id', mission.campaign_id)
        if (mission.org_id) {
          campaignWorkersQuery = campaignWorkersQuery.eq('org_id', mission.org_id)
        } else {
          campaignWorkersQuery = campaignWorkersQuery
            .eq('user_id', mission.user_id)
            .is('org_id', null)
        }
        const { data: campaignWorkers } = await campaignWorkersQuery
        if (!campaignWorkers || campaignWorkers.length === 0) {
          const blockedMsg =
            'This campaign has no team members assigned yet. Add employees to the campaign first, then comment here to retry.'
          await this.stateRepo.updateMissionState(missionClient, missionId, {
            status: 'blocked',
            current_agent_key: mgr,
            progress_notes: blockedMsg,
          })
          await this.stateRepo.insertLog(
            missionClient,
            mission,
            'mission.planning.blocked',
            mission.status,
            'blocked',
            {
              feedback: blockedMsg,
              reason: 'no_campaign_workers',
              campaign_id: mission.campaign_id,
            },
            mgr,
          )
          await this.notificationEmitter.emitBlocked(mission, blockedMsg, mgr)
          return {
            missionId,
            success: true,
            status: 'blocked',
            processedAt: new Date().toISOString(),
            output: { kind: 'blocked', feedback: blockedMsg, reason: 'no_campaign_workers' },
          }
        }
      }

      if (this.databaseService.hasPgPool()) {
        try {
          await this.databaseService.pgQuery(
            `UPDATE mission_subtasks SET status = 'cancelled', updated_at = NOW() WHERE mission_id = $1::uuid AND status NOT IN ('done', 'cancelled')`,
            [missionId],
          )
        } catch (e) {
          this.logger.warn(`plan_phase: stale subtask cleanup PG failed: ${(e as Error).message}`)
        }
      } else {
        await missionClient
          .from('mission_subtasks')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('mission_id', missionId)
          .not('status', 'in', '("done","cancelled")')
      }

      await this.stateRepo.updateMissionState(missionClient, missionId, {
        status: 'planning',
        current_agent_key: mgr,
      })
      await this.stateRepo.updateAgentStatus(
        missionClient,
        mission.user_id,
        mgr,
        'working',
        mission.org_id ?? null,
      )
      await this.stateRepo.insertLog(
        missionClient,
        mission,
        'mission.planning.started',
        mission.status,
        'planning',
        {},
        mgr,
      )

      const missionInput =
        mission.input && typeof mission.input === 'object' && !Array.isArray(mission.input)
          ? (mission.input as Record<string, unknown>)
          : {}
      const playbookId =
        typeof missionInput.playbook_id === 'string' ? missionInput.playbook_id.trim() : ''

      let rawPlanResult: Record<string, unknown>
      if (playbookId) {
        let workerAgentKeys: string[] = []
        if (mission.campaign_id) {
          let caQ = missionClient
            .from('campaign_agents')
            .select('agent_key')
            .eq('campaign_id', mission.campaign_id)
          if (mission.org_id) caQ = caQ.eq('org_id', mission.org_id)
          else caQ = caQ.eq('user_id', mission.user_id).is('org_id', null)
          const { data: workers } = await caQ
          workerAgentKeys = (workers || []).map((w) => w.agent_key)
        }
        const expanded = expandMissionPlaybook({
          playbookId,
          mission: {
            id: mission.id,
            title: mission.title,
            brief: mission.brief,
            user_id: mission.user_id,
            org_id: mission.org_id ?? null,
            input: missionInput,
          },
          workerAgentKeys,
          managerKey: mgr,
        })
        if (!expanded) {
          throw new Error(`Unknown mission playbook: ${playbookId}`)
        }
        rawPlanResult = expanded
        await this.stateRepo.insertLog(
          missionClient,
          mission,
          'mission.progress',
          'planning',
          'planning',
          {
            note: `Expanded playbook "${playbookId}" into a guided plan (no freeform invent).`,
            playbook_id: playbookId,
          },
          mgr,
        )
      } else {
        rawPlanResult = await this.support.withTimeout(
          this.openclawGateway.callOpenClawForPlan(mission, mgr),
          executionTimeoutMs,
          `Plan phase timed out after ${Math.floor(executionTimeoutMs / 1000)}s`,
        )
      }
      const planResult = this.jsonService.sanitizePlanForUser(rawPlanResult)

      const capabilityGap = planResult.capability_gap as
        | { exists?: boolean; note?: string; suggested_hire?: string }
        | undefined
      if (capabilityGap?.exists === true && capabilityGap.note) {
        try {
          await missionClient.from('agent_awareness_points').insert({
            user_id: mission.user_id,
            org_id: mission.org_id ?? null,
            agent_key: mgr,
            campaign_id: mission.campaign_id ?? null,
            content: `Skill gap detected for mission "${mission.title}": ${capabilityGap.note}${capabilityGap.suggested_hire ? ` Consider hiring a ${capabilityGap.suggested_hire}.` : ''}`,
            point_type: 'observation',
          })
        } catch (e) {
          this.logger.warn(`Failed to insert capability gap awareness point: ${e}`)
        }
      }

      if (planResult.kind === 'blocked' || planResult.blocked === true) {
        await this.stateRepo.updateMissionState(missionClient, missionId, {
          status: 'blocked',
          current_agent_key: mgr,
          progress_notes: (planResult.feedback as string) || 'Blocked — requires user input',
        })
        await this.stateRepo.insertLog(
          missionClient,
          mission,
          'mission.planning.blocked',
          'planning',
          'blocked',
          planResult,
          mgr,
        )
        await this.stateRepo.updateAgentStatus(
          missionClient,
          mission.user_id,
          mgr,
          'idle',
          mission.org_id ?? null,
        )
        await this.notificationEmitter.emitBlocked(
          mission,
          (planResult.feedback as string) || 'Blocked — requires your input',
          mgr,
        )

        return {
          missionId,
          success: true,
          status: 'blocked',
          processedAt: new Date().toISOString(),
          output: planResult,
        }
      }

      const assignedAgent = planResult.assignTo as string
      const planSummary = planResult.summary || planResult.title || 'Plan created'
      const subtaskCount = Array.isArray(planResult.subtasks)
        ? (planResult.subtasks as unknown[]).length
        : 0
      await this.stateRepo.insertLog(
        missionClient,
        mission,
        'mission.progress',
        'planning',
        'planning',
        {
          note: `Analyzed the brief and created a plan with ${subtaskCount} subtask(s). Assigning to ${assignedAgent}. Summary: ${planSummary}`,
        },
        mgr,
      )

      const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
      const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
      const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
      const planCallbackFullUrl = `${baseUrl}/api/internal/missions/plan`

      const planRes = await fetch(planCallbackFullUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${internalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mission_id: missionId,
          user_id: mission.user_id,
          org_id: mission.org_id ?? null,
          ...planResult,
        }),
      })
      if (!planRes.ok) {
        const text = await planRes.text().catch(() => '')
        throw new Error(`Plan creation API failed (${planRes.status}): ${text}`)
      }

      await this.stateRepo.updateAgentStatus(
        missionClient,
        mission.user_id,
        mgr,
        'idle',
        mission.org_id ?? null,
      )

      const subtasks = planResult.subtasks as
        | Array<{ assignTo?: string; title?: string }>
        | undefined
      const delegationSummary =
        subtasks && subtasks.length > 0
          ? subtasks.map((st) => `${st.title} → ${st.assignTo || assignedAgent}`).join(', ')
          : assignedAgent
      await this.agentStateService.patchAgentState(
        mission.user_id,
        mgr,
        'append_line',
        {
          line: `- [${new Date().toISOString().split('T')[0]}] Delegated "${mission.title}" [${delegationSummary}] (mission:${missionId})`,
        },
        mission.org_id ?? null,
      )

      return {
        missionId,
        success: true,
        status: 'todo',
        processedAt: new Date().toISOString(),
        output: planResult,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown plan phase error'
      await this.support.handlePhaseError(missionClient, mission, mgr, errorMessage, job)
      this.logger.error(`Plan phase failed for mission ${missionId}: ${errorMessage}`)
      throw error
    }
  }

  private async ensureWebinarFulfillmentTeam(
    mission: {
      user_id: string
      org_id?: string | null
      campaign_id?: string | null
    },
    playbookId: string,
  ): Promise<void> {
    const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
    const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
    if (!callbackUrl || !internalToken) {
      this.logger.warn('Skipping webinar team ensure: mission API callback config missing')
      return
    }
    const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
    const ensureUrl = `${baseUrl}/api/internal/agents/ensure-webinar-team`
    const res = await fetch(ensureUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${internalToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: mission.user_id,
        org_id: mission.org_id ?? null,
        campaign_id: mission.campaign_id ?? null,
        playbook_id: playbookId,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Webinar team ensure failed (${res.status}): ${text}`)
    }
    const body = (await res.json().catch(() => null)) as {
      agents?: Array<{ agent_key?: string; role_key?: string; created?: boolean }>
    } | null
    const hired = (body?.agents || [])
      .filter((a) => a.created)
      .map((a) => a.agent_key || a.role_key)
      .filter(Boolean)
    this.logger.log(
      `Webinar fulfillment team ensured for campaign ${mission.campaign_id}` +
        (hired.length ? ` (hired: ${hired.join(', ')})` : ' (already present)'),
    )
  }
}
