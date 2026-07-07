import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseService } from '../../../lib/services/database.service'
import { AgentSignalService } from './agent-signal.service'
import { AwarenessActionDispatcher } from './awareness-action-dispatcher.service'
import { MissionOpenclawGateway } from './gateways/mission-openclaw.gateway'
import { MissionJsonService } from './utils/mission-json.service'

const MISSION_STATUS_RANK: Record<string, number> = {
  failed: 0,
  error: 1,
  blocked: 2,
  review: 3,
  in_progress: 4,
  todo: 5,
  planning: 6,
  inbox: 7,
  pending_approval: 8,
}

@Injectable()
export class CeoAwarenessRunner {
  private readonly logger = new Logger(CeoAwarenessRunner.name)

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly agentSignalService: AgentSignalService,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly dispatcher: AwarenessActionDispatcher,
    private readonly jsonService: MissionJsonService,
  ) {}

  async run(userId: string, orgId?: string | null): Promise<void> {
    return this.runInner(userId, orgId)
  }

  private async buildMissionsSnapshotForAwareness(
    supabase: SupabaseClient,
    userId: string,
    activeCampaignIds: string[],
    orgId?: string | null,
  ): Promise<string> {
    let missQ = supabase
      .from('missions')
      .select(
        'id, title, status, priority, error, progress_notes, assigned_agent_key, updated_at, campaign_id',
      )
      .eq('user_id', userId)
      .neq('status', 'done')
    if (orgId !== undefined) missQ = orgId ? missQ.eq('org_id', orgId) : missQ.is('org_id', null)
    const { data: rows, error } = await missQ.order('updated_at', { ascending: false }).limit(60)
    if (error) {
      this.logger.warn(`awareness missions snapshot: ${error.message}`)
      return '- (could not load missions)'
    }

    const filtered = (rows || []).filter(
      (m: { campaign_id: string | null }) =>
        !m.campaign_id || activeCampaignIds.includes(String(m.campaign_id)),
    )

    filtered.sort(
      (a: { status: string; updated_at: string }, b: { status: string; updated_at: string }) => {
        const ra = MISSION_STATUS_RANK[a.status] ?? 99
        const rb = MISSION_STATUS_RANK[b.status] ?? 99
        if (ra !== rb) return ra - rb
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      },
    )

    const top = filtered.slice(0, 45)
    const ids = top.map((m: { id: string }) => m.id)
    const rollup = new Map<string, string>()

    if (ids.length > 0) {
      const { data: subs } = await supabase
        .from('mission_subtasks')
        .select('mission_id, title, status, assigned_agent_key, sort_order')
        .in('mission_id', ids)
        .order('sort_order', { ascending: true })
      const linesByMission = new Map<string, string[]>()
      for (const row of subs || []) {
        const r = row as {
          mission_id: string
          title: string
          status: string
          assigned_agent_key: string | null
        }
        const mid = String(r.mission_id)
        const list = linesByMission.get(mid) || []
        list.push(`      ${r.title} [${r.status}] → ${r.assigned_agent_key || '—'}`)
        linesByMission.set(mid, list)
      }
      for (const mid of ids) {
        const lines = linesByMission.get(mid) || []
        rollup.set(mid, lines.length > 0 ? lines.join('\n') : '      (no subtasks)')
      }
    }

    if (top.length === 0) return '- none'

    return top
      .map((m: Record<string, unknown>) => {
        const id = String(m.id)
        const err = m.error ? String(m.error).slice(0, 160).replace(/\s+/g, ' ') : ''
        const title = String(m.title || '').slice(0, 100)
        const assign = m.assigned_agent_key ? String(m.assigned_agent_key) : '—'
        const subBlock = rollup.get(id) || '—'
        const priority = String(m.priority || 'medium')
        return `- ${id} | ${m.status} | priority=${priority} | ${title} | err=${err || '—'} | assign=${assign}\n    subtasks:\n${subBlock}`
      })
      .join('\n')
  }

  private async buildRecentDeliverablesLines(
    supabase: SupabaseClient,
    userId: string,
    activeCampaignIds: string[],
    orgId?: string | null,
  ): Promise<string> {
    if (activeCampaignIds.length === 0) return '- none'
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    let delQ = supabase
      .from('mission_deliverables')
      .select('title, type, created_at, mission_id')
      .eq('user_id', userId)
      .gte('created_at', since)
    if (orgId !== undefined) delQ = orgId ? delQ.eq('org_id', orgId) : delQ.is('org_id', null)
    const { data: rows, error } = await delQ.order('created_at', { ascending: false }).limit(80)
    if (error || !rows?.length) return '- none'
    const mids = [...new Set(rows.map((r) => String((r as { mission_id: string }).mission_id)))]
    const { data: missions } = await supabase
      .from('missions')
      .select('id, title, status, campaign_id')
      .in('id', mids)
    const byMid = new Map(
      (missions || []).map((row) => {
        const r = row as {
          id: string
          title: string
          status: string
          campaign_id: string | null
        }
        return [String(r.id), r] as const
      }),
    )
    const lines: string[] = []
    for (const raw of rows) {
      const r = raw as { title: string; type: string; created_at: string; mission_id: string }
      const miss = byMid.get(String(r.mission_id))
      const camp = miss?.campaign_id ? String(miss.campaign_id) : ''
      if (camp && !activeCampaignIds.includes(camp)) continue
      lines.push(
        `- ${r.type} "${r.title}" | mission="${miss?.title || '?'}" (${miss?.status || '?'}) | ${r.created_at}`,
      )
      if (lines.length >= 28) break
    }
    return lines.length > 0 ? lines.join('\n') : '- none'
  }

  private async runInner(userId: string, orgId?: string | null): Promise<void> {
    const supabase = this.databaseService.getClient()
    let agentQuery = supabase
      .from('agents_registry')
      .select('agent_key, name, config, org_id')
      .eq('user_id', userId)
      .eq('level', 'c_level')
      .limit(1)
    if (orgId !== undefined)
      agentQuery = orgId ? agentQuery.eq('org_id', orgId) : agentQuery.is('org_id', null)
    const { data: agent } = await agentQuery.maybeSingle()
    if (!agent?.agent_key) return

    const cfg = (agent.config || {}) as Record<string, unknown>
    const archetype = String(cfg.archetype || 'ceo')
    const awarenessMd = String(cfg.awareness || '(empty - first awareness session)')
    const signals = await this.agentSignalService.getUnconsumedSignals(userId, orgId)
    if (signals.length === 0) return

    const triggerSignalIds = signals.map((s) => s.id)
    const groupedSignals = signals
      .map((s) => `- [${s.signal_type}] w=${s.weight} campaign=${s.campaign_id ?? 'none'}`)
      .join('\n')

    let campaignsQuery = supabase
      .from('campaigns')
      .select('id, name, context')
      .eq('user_id', userId)
      .not('status', 'in', '("archived","completed")')
    if (orgId !== undefined)
      campaignsQuery = orgId
        ? campaignsQuery.eq('org_id', orgId)
        : campaignsQuery.is('org_id', null)
    const { data: campaigns } = await campaignsQuery
    const activeCampaignIds = (campaigns || []).map((c: { id: string }) => c.id)
    const campaignLines = (campaigns || [])
      .map((c: { name: string; context: unknown }) => {
        const context = (c.context || {}) as Record<string, unknown>
        return `- ${c.name}: result=${context.result ? 'Y' : 'N'}, purpose=${context.purpose ? 'Y' : 'N'}, strategy=${context.strategy ? 'Y' : 'N'}`
      })
      .join('\n')

    const missionsBlock = await this.buildMissionsSnapshotForAwareness(
      supabase,
      userId,
      activeCampaignIds,
      orgId,
    )
    const deliverablesBlock = await this.buildRecentDeliverablesLines(
      supabase,
      userId,
      activeCampaignIds,
      orgId,
    )

    const { data: insertedSession, error: sessionError } = await supabase
      .from('agent_awareness_sessions')
      .insert({
        user_id: userId,
        agent_key: agent.agent_key,
        status: 'in_progress',
        trigger_signals: triggerSignalIds,
        org_id: orgId ?? null,
      })
      .select('id')
      .single()
    if (sessionError || !insertedSession?.id) {
      throw new Error(`Failed to create awareness session: ${sessionError?.message || 'unknown'}`)
    }
    const sessionId = insertedSession.id as string

    const jsonContract = [
      'Return JSON only (no markdown):',
      '{',
      '  "decision":"notify|act|wait",',
      '  "content":"...",',
      '  "point_type":"observation|strategy|milestone|action_taken",',
      '  "missions":[{"title":"...","brief":"...","campaign_id":"..."}],',
      '  "awareness_update":"...",',
      '  "actions":[',
      '    {"type":"retry_mission","mission_id":"<uuid>"},',
      '    {"type":"manager_comment","mission_id":"<uuid>","message":"..."},',
      '    {"type":"set_progress_notes","mission_id":"<uuid>","note":"..."},',
      '    {"type":"reassign_mission","mission_id":"<uuid>","assigned_agent_key":"..."},',
      '    {"type":"request_subtask_execute","mission_id":"<uuid>","subtask_id":"<uuid>"},',
      '    {"type":"append_subtasks","mission_id":"<uuid>","subtasks":[{"id":"st-1","title":"...","assignTo":"...","dependsOn":[],"intent":{...}}]},',
      '    {"type":"cancel_subtask","mission_id":"<uuid>","subtask_id":"<uuid>"},',
      '    {"type":"edit_subtask","mission_id":"<uuid>","subtask_id":"<uuid>","title":"...","assigned_agent_key":"...","intent":{...}},',
      '    {"type":"retry_subtask","mission_id":"<uuid>","subtask_id":"<uuid>"},',
      '    {"type":"replan_mission","mission_id":"<uuid>","reason":"..."},',
      '    {"type":"pause_mission","mission_id":"<uuid>"},',
      '    {"type":"amend_mission","mission_id":"<uuid>","title":"...","brief":"...","priority":"low|medium|high|urgent"}',
      '  ]',
      '}',
      'Use mission_id and subtask_id values only from the Missions list. retry_mission only for status error or failed.',
      'IMPORTANT: Missions with status "pending_approval" are waiting for the USER to approve the plan. Do NOT take any actions (replan, nudge, retry, append subtasks, etc.) on pending_approval missions — they are a human gate.',
      'PRIORITY AWARENESS: Flag any urgent or high priority missions that appear stuck (same status for extended time). Urgent missions stuck > 2 minutes and high priority > 5 minutes warrant immediate action (retry, nudge, or escalation).',
    ].join('\n')

    const awarenessTaskUserMessage = [
      '[MISSION_INSTRUCTIONS]',
      'AWARENESS_MODE: true',
      `You are ${agent.name || agent.agent_key}, archetype=${archetype}.`,
      '',
      'Read skills/awareness-evaluator/SKILL.md',
      '',
      '[AWARENESS_CYCLE]',
      `Agent archetype: ${archetype}`,
      '',
      'Your AWARENESS.md (rolling memory):',
      awarenessMd,
      '',
      'Signals:',
      groupedSignals,
      '',
      'Campaign states:',
      campaignLines || '- none',
      '',
      'Missions (non-done, active campaigns; use ids below for actions only):',
      missionsBlock,
      '',
      'Recent deliverables (cross-mission):',
      deliverablesBlock,
      '',
      jsonContract,
    ].join('\n')

    try {
      const missionProxy = {
        id: sessionId,
        user_id: userId,
        org_id: (agent as { org_id?: string | null })?.org_id ?? null,
        correlation_id: sessionId,
        parent_mission_id: null,
        campaign_id: null,
      }
      const result = await this.openclawGateway.callOpenClawRaw(
        missionProxy,
        agent.agent_key,
        '',
        awarenessTaskUserMessage,
        this.configService.get<string>('missions.awarenessModelOverride') || '',
        'mission_awareness',
        { identitySuffix: '-CEO' },
      )
      const parsed = this.jsonService.tryParseJsonStrict(String(result.content || '')) || {
        decision: 'wait',
      }
      const awarenessUpdate = String(parsed.awareness_update || awarenessMd)

      let updateQuery = supabase
        .from('agents_registry')
        .update({ config: { ...cfg, awareness: awarenessUpdate } })
        .eq('user_id', userId)
        .eq('agent_key', agent.agent_key)
      if (agent.org_id) updateQuery = updateQuery.eq('org_id', agent.org_id)
      else updateQuery = updateQuery.is('org_id', null)
      await updateQuery

      const decision = String(parsed.decision || 'wait') as 'notify' | 'act' | 'wait'
      await supabase
        .from('agent_awareness_sessions')
        .update({
          status: 'completed',
          decision,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      await this.dispatcher.dispatch(
        userId,
        sessionId,
        triggerSignalIds,
        {
          decision,
          content: typeof parsed.content === 'string' ? parsed.content : undefined,
          point_type: typeof parsed.point_type === 'string' ? parsed.point_type : undefined,
          missions: Array.isArray(parsed.missions)
            ? (parsed.missions as Array<{ title: string; brief: string; campaign_id: string }>)
            : [],
          actions: parsed.actions,
          agentKey: agent.agent_key,
          archetype,
        },
        orgId,
      )
    } catch (error) {
      this.logger.error(`Awareness run failed for user ${userId}: ${(error as Error).message}`)
      await supabase
        .from('agent_awareness_sessions')
        .update({ status: 'completed', decision: 'wait', completed_at: new Date().toISOString() })
        .eq('id', sessionId)
      throw error
    }
  }
}
