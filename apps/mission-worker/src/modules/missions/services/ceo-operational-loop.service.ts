import { randomUUID } from 'crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '../../../lib/services/database.service'
import { AgentPatternEvaluator } from './agent-pattern-evaluator.service'
import { AwarenessActionDispatcher } from './awareness-action-dispatcher.service'
import { MissionOpenclawGateway } from './gateways/mission-openclaw.gateway'
import { MissionJsonService } from './utils/mission-json.service'

type CampaignRow = {
  id: string
  name: string
  status: string | null
  context: Record<string, unknown> | null
  has_active_work: boolean
}

type CampaignAgentRow = {
  campaign_id: string
  agent_key: string
}

type MissionSummaryRow = {
  campaign_id: string | null
  title: string
  status: string
  updated_at: string
}

type OpsMissionDraft = {
  title: string
  brief: string
  campaign_id: string
  assignTo?: string
}

@Injectable()
export class CeoOperationalLoopService {
  private readonly logger = new Logger(CeoOperationalLoopService.name)
  private static readonly COOLDOWN_MS = 10 * 60 * 1000
  private static readonly BACKOFF_MS = 2 * 60 * 60 * 1000

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly evaluator: AgentPatternEvaluator,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly jsonService: MissionJsonService,
    private readonly awarenessActionDispatcher: AwarenessActionDispatcher,
  ) {}

  async runForUser(
    userId: string,
    orgId?: string | null,
  ): Promise<{ acted: boolean; userId: string }> {
    return this.runForUserInner(userId, orgId)
  }

  private async runForUserInner(
    userId: string,
    orgId?: string | null,
  ): Promise<{ acted: boolean; userId: string }> {
    const hasCredits = await this.evaluator.hasAvailableCredits(userId, orgId)
    if (!hasCredits) {
      this.logger.log(
        `[ceo_ops_automation_cap] user_id=${userId} reason=no_credits awareness_disabled`,
      )
      await this.evaluator.disableAwarenessAndNotify(userId, orgId)
      return { acted: false, userId }
    }

    const supabase = this.databaseService.getClient()
    let ceoQuery = supabase
      .from('agents_registry')
      .select('agent_key, name, config')
      .eq('user_id', userId)
      .eq('level', 'c_level')
    if (orgId !== undefined)
      ceoQuery = orgId ? ceoQuery.eq('org_id', orgId) : ceoQuery.is('org_id', null)
    const { data: ceoAgent } = await ceoQuery

    const ceo = (ceoAgent || []).find(
      (row: any) => String(row?.config?.archetype || 'ceo') === 'ceo',
    )
    if (!ceo?.agent_key) return { acted: false, userId }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_ceo_eval_at, ops_backoff_until')
      .eq('id', userId)
      .maybeSingle()
    if (profileError)
      throw new Error(`Failed to load profile for operational loop: ${profileError.message}`)

    const now = Date.now()
    const lastEvalMs = profile?.last_ceo_eval_at ? new Date(profile.last_ceo_eval_at).getTime() : 0
    if (
      lastEvalMs &&
      !Number.isNaN(lastEvalMs) &&
      now - lastEvalMs < CeoOperationalLoopService.COOLDOWN_MS
    ) {
      this.logger.log(`[ceo_ops_automation_cap] user_id=${userId} reason=eval_cooldown`)
      return { acted: false, userId }
    }

    const backoffUntilMs = profile?.ops_backoff_until
      ? new Date(profile.ops_backoff_until).getTime()
      : 0
    if (backoffUntilMs && !Number.isNaN(backoffUntilMs) && backoffUntilMs > now) {
      this.logger.log(
        `[ceo_ops_automation_cap] user_id=${userId} reason=ops_backoff_until until=${profile?.ops_backoff_until}`,
      )
      return { acted: false, userId }
    }

    let campaignsQ = supabase
      .from('campaigns')
      .select('id, name, status, context, has_active_work')
      .eq('user_id', userId)
      .not('status', 'in', '("archived","completed")')
    if (orgId !== undefined)
      campaignsQ = orgId ? campaignsQ.eq('org_id', orgId) : campaignsQ.is('org_id', null)
    const { data: campaigns, error: campaignsError } = await campaignsQ
    if (campaignsError)
      throw new Error(`Failed to load campaigns for operational loop: ${campaignsError.message}`)

    const allCampaigns = (campaigns || []) as CampaignRow[]
    if (allCampaigns.length === 0) return { acted: false, userId }

    const campaignIds = allCampaigns.map((row) => String(row.id))
    const { data: campaignAgents, error: campaignAgentsError } = await supabase
      .from('campaign_agents')
      .select('campaign_id, agent_key')
      .eq('user_id', userId)
      .in('campaign_id', campaignIds)
    if (campaignAgentsError) {
      throw new Error(
        `Failed to load campaign workers for operational loop: ${campaignAgentsError.message}`,
      )
    }

    const byCampaign = new Map<string, string[]>()
    for (const row of (campaignAgents || []) as CampaignAgentRow[]) {
      const key = String(row.campaign_id)
      const list = byCampaign.get(key) || []
      list.push(String(row.agent_key))
      byCampaign.set(key, list)
    }

    const eligibleCampaigns = allCampaigns.filter((campaign) => {
      const context = (campaign.context || {}) as Record<string, unknown>
      const hasNorthStar = Boolean(context.north_star_defined_at)
      const hasWorkers = (byCampaign.get(String(campaign.id)) || []).length > 0
      return hasNorthStar && hasWorkers
    })

    if (eligibleCampaigns.length === 0) return { acted: false, userId }

    let recentMissionsQ = supabase
      .from('missions')
      .select('campaign_id, title, status, updated_at')
      .eq('user_id', userId)
      .in('campaign_id', campaignIds)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (orgId !== undefined)
      recentMissionsQ = orgId
        ? recentMissionsQ.eq('org_id', orgId)
        : recentMissionsQ.is('org_id', null)
    const { data: recentMissions, error: recentMissionsError } = await recentMissionsQ
    if (recentMissionsError) {
      throw new Error(
        `Failed to load recent missions for operational loop: ${recentMissionsError.message}`,
      )
    }

    const missionRows = (recentMissions || []) as MissionSummaryRow[]
    const missionSummaryByCampaign = new Map<string, MissionSummaryRow[]>()
    for (const row of missionRows) {
      const campaignId = String(row.campaign_id || '')
      if (!campaignId) continue
      const list = missionSummaryByCampaign.get(campaignId) || []
      list.push(row)
      missionSummaryByCampaign.set(campaignId, list)
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    let recentDoneQ = supabase
      .from('missions')
      .select('id, title, campaign_id, updated_at')
      .eq('user_id', userId)
      .in('campaign_id', campaignIds)
      .eq('status', 'done')
      .gte('updated_at', sevenDaysAgo)
    if (orgId !== undefined)
      recentDoneQ = orgId ? recentDoneQ.eq('org_id', orgId) : recentDoneQ.is('org_id', null)
    const { data: recentDone } = await recentDoneQ

    const doneIds = (recentDone || []).map((m: { id: string }) => String(m.id))
    const deliverablesByMission = new Map<string, Array<{ title: string; type: string }>>()
    if (doneIds.length > 0) {
      const { data: drows } = await supabase
        .from('mission_deliverables')
        .select('mission_id, title, type')
        .in('mission_id', doneIds)
      for (const r of drows || []) {
        const row = r as { mission_id: string; title: string; type: string }
        const mid = String(row.mission_id)
        const list = deliverablesByMission.get(mid) || []
        list.push({ title: row.title, type: row.type })
        deliverablesByMission.set(mid, list)
      }
    }

    let activeMissQ = supabase
      .from('missions')
      .select('id, title, campaign_id, status')
      .eq('user_id', userId)
      .in('campaign_id', campaignIds)
      .in('status', ['in_progress', 'todo', 'review', 'planning', 'blocked'])
    if (orgId !== undefined)
      activeMissQ = orgId ? activeMissQ.eq('org_id', orgId) : activeMissQ.is('org_id', null)
    const { data: activeMiss } = await activeMissQ

    const activeIds = (activeMiss || []).map((m: { id: string }) => String(m.id))
    const subtasksByMission = new Map<string, string[]>()
    if (activeIds.length > 0) {
      const { data: subs } = await supabase
        .from('mission_subtasks')
        .select('mission_id, title, status, assigned_agent_key')
        .in('mission_id', activeIds)
      for (const s of subs || []) {
        const row = s as {
          mission_id: string
          title: string
          status: string
          assigned_agent_key: string | null
        }
        const mid = String(row.mission_id)
        const line = `    - ${row.title} [${row.status}] → ${row.assigned_agent_key || '—'}`
        const list = subtasksByMission.get(mid) || []
        list.push(line)
        subtasksByMission.set(mid, list)
      }
    }

    const promptBody = eligibleCampaigns
      .map((campaign) => {
        const context = (campaign.context || {}) as Record<string, unknown>
        const workers = byCampaign.get(String(campaign.id)) || []
        const missionsForCampaign = missionSummaryByCampaign.get(String(campaign.id)) || []
        const missionLines =
          missionsForCampaign.length > 0
            ? missionsForCampaign
                .slice(0, 8)
                .map((m) => `  - [${m.status}] ${m.title} (${m.updated_at})`)
                .join('\n')
            : '  - none'

        const doneForCamp = (recentDone || []).filter(
          (m: { campaign_id: string | null }) => String(m.campaign_id) === String(campaign.id),
        )
        const deliverableLines =
          doneForCamp.length > 0
            ? doneForCamp
                .map((m: { id: string; title: string; updated_at: string }) => {
                  const dels = deliverablesByMission.get(String(m.id)) || []
                  const dtxt =
                    dels.length > 0
                      ? dels.map((d) => `${d.type}:${d.title}`).join('; ')
                      : '(no deliverable rows)'
                  return `  - "${m.title}" completed ${m.updated_at}: ${dtxt}`
                })
                .join('\n')
            : '  - none'

        const runForCamp = (activeMiss || []).filter(
          (m: { campaign_id: string | null }) => String(m.campaign_id) === String(campaign.id),
        )
        const runningLines =
          runForCamp.length > 0
            ? runForCamp
                .map((m: { id: string; title: string; status: string }) => {
                  const subLines = subtasksByMission.get(String(m.id)) || []
                  const subBlock =
                    subLines.length > 0 ? `\n${subLines.join('\n')}` : '\n    - (no subtasks)'
                  return `  - [${m.status}] ${m.title} (mission_id=${m.id})${subBlock}`
                })
                .join('\n')
            : '  - none'

        return [
          `Campaign ${campaign.id} (${campaign.name})`,
          `- Campaign active work: ${campaign.has_active_work ? 'yes (missions in flight)' : 'no'}`,
          `- Result: ${String(context.result || '')}`,
          `- Purpose: ${String(context.purpose || '')}`,
          `- Strategy: ${String(context.strategy || '')}`,
          `- Off-limits: ${Array.isArray(context.off_limits) ? (context.off_limits as string[]).join(', ') : ''}`,
          `- Workers: ${workers.join(', ')}`,
          '- Recent mission activity:',
          missionLines,
          '- Completed last 7d + deliverable summaries:',
          deliverableLines,
          '- Running / non-done missions + subtasks:',
          runningLines,
        ].join('\n')
      })
      .join('\n\n')

    const systemPrompt = [
      'OPERATIONS_MODE: true',
      `You are ${ceo.name || ceo.agent_key}, the CEO operational planner.`,
      'Goal: keep strategy moving: assign new missions when appropriate, or amend running missions (subtasks, scope) when work is already in flight.',
      'Return JSON only.',
      '{ "action":"assign|amend|nothing_to_assign", "reason":"...",',
      '  "missions":[{"title":"...","brief":"...","campaign_id":"...","assignTo":"..."}],',
      '  "amendments":[{"type":"append_subtasks|cancel_subtask|edit_subtask|retry_subtask|replan_mission|pause_mission|amend_mission|manager_comment|set_progress_notes|reassign_mission|request_subtask_execute|retry_mission", "...fields"}]',
      '}',
      'Use action=assign with missions when new work is needed.',
      'Use action=amend with amendments when existing missions should change (use mission_id and subtask_id from the context above).',
      'IMPORTANT: Missions with status "pending_approval" are waiting for the USER to approve the plan. Do NOT amend, replan, nudge, or take any actions on pending_approval missions.',
      'If nothing to do, return action="nothing_to_assign".',
    ].join('\n')

    const missionProxy = {
      id: randomUUID(),
      user_id: userId,
      org_id: orgId ?? null,
      correlation_id: randomUUID(),
      parent_mission_id: null,
    }
    const raw = await this.openclawGateway.callOpenClawRaw(
      missionProxy,
      String(ceo.agent_key),
      promptBody,
      systemPrompt,
      undefined,
      'mission_execute',
      { identitySuffix: '-CEO' },
    )
    const parsed = this.jsonService.tryParseJsonStrict(String(raw.content || '')) || {}
    const action = typeof parsed.action === 'string' ? parsed.action : ''
    const missions = this.normalizeMissionDrafts(parsed.missions)
    const amendments = Array.isArray(parsed.amendments) ? parsed.amendments : []

    let normalizedAction: 'assign' | 'amend' | 'nothing_to_assign'
    if (action === 'assign' || action === 'amend' || action === 'nothing_to_assign') {
      normalizedAction = action
    } else if (amendments.length > 0) {
      normalizedAction = 'amend'
    } else if (missions.length > 0) {
      normalizedAction = 'assign'
    } else {
      normalizedAction = 'nothing_to_assign'
    }

    if (normalizedAction === 'nothing_to_assign') {
      await supabase
        .from('profiles')
        .update({
          last_ceo_eval_at: new Date().toISOString(),
          ops_backoff_until: new Date(now + CeoOperationalLoopService.BACKOFF_MS).toISOString(),
        })
        .eq('id', userId)
      this.logger.log(
        `[ceo_ops_automation_cap] user_id=${userId} reason=nothing_to_assign_backoff_ms=${CeoOperationalLoopService.BACKOFF_MS}`,
      )
      return { acted: false, userId }
    }

    if (normalizedAction === 'amend' && amendments.length > 0) {
      await this.awarenessActionDispatcher.dispatchCeoOpsAmendments(
        userId,
        `ceo-ops-${randomUUID()}`,
        amendments,
        orgId,
      )
      await supabase
        .from('profiles')
        .update({
          last_ceo_eval_at: new Date().toISOString(),
          ops_backoff_until: null,
        })
        .eq('id', userId)
      return { acted: true, userId }
    }

    if (normalizedAction === 'assign' && missions.length === 0) {
      await supabase
        .from('profiles')
        .update({
          last_ceo_eval_at: new Date().toISOString(),
          ops_backoff_until: new Date(now + CeoOperationalLoopService.BACKOFF_MS).toISOString(),
        })
        .eq('id', userId)
      this.logger.log(
        `[ceo_ops_automation_cap] user_id=${userId} reason=assign_action_empty_missions_backoff`,
      )
      return { acted: false, userId }
    }

    const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
    const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
    const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
    const created = await this.createOperationalMissions(
      baseUrl,
      internalToken,
      userId,
      missions,
      orgId,
    )

    if (created === 0) {
      throw new Error('Operational loop produced assignments but mission creation failed')
    }

    if (amendments.length > 0) {
      const ceoOpsAmendmentSessionId = `ceo-ops-amend-${randomUUID()}`
      this.logger.log(
        `CEO ops amendments user=${userId.slice(0, 8)}… session=${ceoOpsAmendmentSessionId} count=${amendments.length}`,
      )
      await this.awarenessActionDispatcher.dispatchCeoOpsAmendments(
        userId,
        ceoOpsAmendmentSessionId,
        amendments,
        orgId,
      )
    }

    await supabase
      .from('profiles')
      .update({
        last_ceo_eval_at: new Date().toISOString(),
        ops_backoff_until: null,
      })
      .eq('id', userId)

    return { acted: true, userId }
  }

  private normalizeMissionDrafts(rawMissions: unknown): OpsMissionDraft[] {
    if (!Array.isArray(rawMissions)) return []
    return rawMissions
      .map((row) => {
        const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
        const title = String(item.title || '').trim()
        const brief = String(item.brief || '').trim()
        const campaignId = String(item.campaign_id || '').trim()
        const assignTo = String(item.assignTo || '').trim()
        if (!title || !brief || !campaignId) return null
        return {
          title,
          brief,
          campaign_id: campaignId,
          ...(assignTo ? { assignTo } : {}),
        }
      })
      .filter((row): row is OpsMissionDraft => row !== null)
  }

  private async createOperationalMissions(
    baseUrl: string,
    internalToken: string,
    userId: string,
    missions: OpsMissionDraft[],
    orgId?: string | null,
  ): Promise<number> {
    let created = 0
    for (const [index, mission] of missions.entries()) {
      const payload: Record<string, unknown> = {
        title: mission.title,
        brief: mission.brief,
        campaign_id: mission.campaign_id,
        org_id: orgId ?? null,
        idempotency_key: `ops-${randomUUID()}-${index}`,
        input: { source: 'autonomous_ceo_ops' },
      }
      if (mission.assignTo) payload.assigned_agent_key = mission.assignTo

      const response = await fetch(`${baseUrl}/api/internal/missions/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${internalToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, user_id: userId }),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        this.logger.error(
          `Failed operational mission create (${response.status}) campaign=${mission.campaign_id}: ${text.slice(0, 300)}`,
        )
        continue
      }
      created += 1
    }
    return created
  }
}
