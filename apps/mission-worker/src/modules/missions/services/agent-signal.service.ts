import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'

type AgentSignalRow = {
  id: string
  user_id: string
  campaign_id: string | null
  signal_type: string
  signal_data: Record<string, unknown> | null
  weight: number
  consumed_at: string | null
  created_at: string
}

@Injectable()
export class AgentSignalService {
  private readonly logger = new Logger(AgentSignalService.name)
  static readonly SIGNAL_COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes
  private static readonly USER_UNRESPONSIVE_HOURS = 12
  private static readonly CAMPAIGN_STALLED_HOURS = 6

  constructor(private readonly databaseService: DatabaseService) {}

  async emitSignal(
    userId: string,
    signalType: string,
    weight: number,
    data?: Record<string, unknown>,
    campaignId?: string,
    orgId?: string | null,
  ): Promise<void> {
    const supabase = this.databaseService.getClient()
    await supabase.from('agent_signals').insert({
      user_id: userId,
      campaign_id: campaignId ?? null,
      signal_type: signalType,
      signal_data: data ?? {},
      weight,
      org_id: orgId ?? null,
    })
  }

  async getAccumulatedWeight(userId: string, orgId?: string | null): Promise<number> {
    if (this.databaseService.hasPgPool()) {
      const { rows } = await this.databaseService.pgQuery<{ weight: string }>(
        `SELECT COALESCE(SUM(weight), 0)::text AS weight
         FROM agent_signals
         WHERE user_id = $1::uuid
           AND consumed_at IS NULL
           AND org_id IS NOT DISTINCT FROM $2::uuid`,
        [userId, orgId ?? null],
      )
      return Number(rows[0]?.weight || 0)
    }
    const supabase = this.databaseService.getClient()
    let q = supabase
      .from('agent_signals')
      .select('weight')
      .eq('user_id', userId)
      .is('consumed_at', null)
    q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null)
    const { data } = await q
    return (data || []).reduce((sum, row) => sum + Number((row as any).weight || 0), 0)
  }

  async getUnconsumedSignals(userId: string, orgId?: string | null): Promise<AgentSignalRow[]> {
    const supabase = this.databaseService.getClient()
    let q = supabase
      .from('agent_signals')
      .select('*')
      .eq('user_id', userId)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
    q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null)
    const { data, error } = await q
    if (error) throw new Error(`Failed to fetch unconsumed signals: ${error.message}`)
    return (data || []) as AgentSignalRow[]
  }

  async consumeSignals(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const supabase = this.databaseService.getClient()
    await supabase
      .from('agent_signals')
      .update({ consumed_at: new Date().toISOString() })
      .in('id', ids)
  }

  async decaySignals(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    if (this.databaseService.hasPgPool()) {
      await this.databaseService.pgQuery(
        `UPDATE agent_signals
         SET weight = weight * 0.5
         WHERE id = ANY($1::uuid[])`,
        [ids],
      )
      return
    }
    const supabase = this.databaseService.getClient()
    const { data } = await supabase.from('agent_signals').select('id, weight').in('id', ids)
    for (const row of data || []) {
      await supabase
        .from('agent_signals')
        .update({ weight: Number((row as any).weight || 0) * 0.5 })
        .eq('id', (row as any).id)
    }
  }

  async checkSyntheticSignals(userId: string, orgId?: string | null): Promise<void> {
    const supabase = this.databaseService.getClient()

    let campaignsQ = supabase
      .from('campaigns')
      .select('id, context, status')
      .eq('user_id', userId)
      .eq('status', 'active')
    if (orgId !== undefined)
      campaignsQ = orgId ? campaignsQ.eq('org_id', orgId) : campaignsQ.is('org_id', null)
    const { data: campaigns } = await campaignsQ
    for (const campaign of campaigns || []) {
      const context = ((campaign as any).context || {}) as Record<string, unknown>
      if (!context.north_star_defined_at) {
        const { data: existing } = await supabase
          .from('agent_signals')
          .select('id')
          .eq('user_id', userId)
          .eq('campaign_id', (campaign as any).id)
          .eq('signal_type', 'strategy_undefined')
          .is('consumed_at', null)
          .limit(1)
        if (!existing || existing.length === 0) {
          await this.emitSignal(userId, 'strategy_undefined', 3.0, {}, (campaign as any).id, orgId)
        }
      }
    }

    const cooldownCutoff = new Date(
      Date.now() - AgentSignalService.SIGNAL_COOLDOWN_MS,
    ).toISOString()

    const { data: profile } = await supabase
      .from('profiles')
      .select('last_interaction_at')
      .eq('id', userId)
      .maybeSingle()
    if (profile?.last_interaction_at) {
      const nowMs = Date.now()
      const lastMs = new Date(profile.last_interaction_at).getTime()
      if (!Number.isNaN(lastMs)) {
        const currentGapHours = (nowMs - lastMs) / (1000 * 60 * 60)
        if (currentGapHours > 24) {
          const { data: recentDeviation } = await supabase
            .from('agent_signals')
            .select('id')
            .eq('user_id', userId)
            .eq('signal_type', 'user_deviation')
            .gte('created_at', cooldownCutoff)
            .limit(1)
          if (!recentDeviation || recentDeviation.length === 0) {
            await this.emitSignal(
              userId,
              'user_deviation',
              1.2,
              { gap_hours: currentGapHours },
              undefined,
              orgId,
            )
          }
        }
      }
    }

    await this.emitUserUnresponsiveSignal(userId, profile?.last_interaction_at || null, orgId)
    await this.emitCampaignStalledSignals(userId, cooldownCutoff, orgId)

    const { data: gapRows } = await supabase
      .from('missions_plans')
      .select('id, content, mission_id, created_at, missions!inner(user_id)')
      .eq('missions.user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10)
    const gapCount = (gapRows || []).filter(
      (row: any) => row?.content?.capability_gap?.exists === true,
    ).length
    if (gapCount >= 3) {
      const { data: existingGapSignal } = await supabase
        .from('agent_signals')
        .select('id')
        .eq('user_id', userId)
        .eq('signal_type', 'team_skill_gap_pattern')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
      if (!existingGapSignal || existingGapSignal.length === 0) {
        await this.emitSignal(
          userId,
          'team_skill_gap_pattern',
          2.5,
          { gap_count: gapCount },
          undefined,
          orgId,
        )
      }
    }
  }

  mapOutboxEventToSignal(eventType: string): { signalType: string; weight: number } | null {
    if (eventType === 'mission.execution.completed') {
      return { signalType: 'mission_completed', weight: 0.3 }
    }
    if (eventType === 'mission.planning.blocked') {
      return { signalType: 'mission_blocked', weight: 1.5 }
    }
    return null
  }

  private async emitUserUnresponsiveSignal(
    userId: string,
    lastInteractionAt: string | null,
    orgId?: string | null,
  ): Promise<void> {
    if (!lastInteractionAt) return
    const lastInteractionMs = new Date(lastInteractionAt).getTime()
    if (Number.isNaN(lastInteractionMs)) return

    const supabase = this.databaseService.getClient()
    const { data: lastOutreach } = await supabase
      .from('agent_awareness_points')
      .select('created_at, session_id')
      .eq('user_id', userId)
      .not('session_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!lastOutreach?.created_at) return

    const outreachMs = new Date(lastOutreach.created_at).getTime()
    if (Number.isNaN(outreachMs)) return
    if (outreachMs <= lastInteractionMs) return

    const gapHours = (Date.now() - outreachMs) / (1000 * 60 * 60)
    if (gapHours < AgentSignalService.USER_UNRESPONSIVE_HOURS) return

    const outreachPointAt = new Date(outreachMs).toISOString()
    const exists = await this.hasUserUnresponsiveForOutreach(userId, outreachPointAt)
    if (exists) return

    await this.emitSignal(
      userId,
      'user_unresponsive',
      2.0,
      {
        outreach_point_at: outreachPointAt,
        gap_hours_since_outreach: Number(gapHours.toFixed(2)),
      },
      undefined,
      orgId,
    )
  }

  private async hasUserUnresponsiveForOutreach(
    userId: string,
    outreachPointAt: string,
  ): Promise<boolean> {
    if (this.databaseService.hasPgPool()) {
      const { rows } = await this.databaseService.pgQuery<{ id: string }>(
        `
          SELECT id
          FROM agent_signals
          WHERE user_id = $1::uuid
            AND signal_type = 'user_unresponsive'
            AND signal_data->>'outreach_point_at' = $2::text
          LIMIT 1
        `,
        [userId, outreachPointAt],
      )
      return rows.length > 0
    }

    const supabase = this.databaseService.getClient()
    const { data } = await supabase
      .from('agent_signals')
      .select('signal_data')
      .eq('user_id', userId)
      .eq('signal_type', 'user_unresponsive')
      .limit(50)
    return (data || []).some(
      (row: any) => String(row?.signal_data?.outreach_point_at || '') === outreachPointAt,
    )
  }

  private async emitCampaignStalledSignals(
    userId: string,
    cooldownCutoff: string,
    orgId?: string | null,
  ): Promise<void> {
    const supabase = this.databaseService.getClient()
    let stalledCampaignsQ = supabase
      .from('campaigns')
      .select('id, context, has_active_work, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('has_active_work', false)
    if (orgId !== undefined)
      stalledCampaignsQ = orgId
        ? stalledCampaignsQ.eq('org_id', orgId)
        : stalledCampaignsQ.is('org_id', null)
    const { data: campaigns } = await stalledCampaignsQ

    const stalledCutoffMs = Date.now() - AgentSignalService.CAMPAIGN_STALLED_HOURS * 60 * 60 * 1000

    for (const campaign of campaigns || []) {
      const campaignId = String((campaign as any).id || '')
      if (!campaignId) continue

      const context = ((campaign as any).context || {}) as Record<string, unknown>
      if (!context.north_star_defined_at) continue

      const { data: recentSignal } = await supabase
        .from('agent_signals')
        .select('id')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .eq('signal_type', 'campaign_stalled')
        .gte('created_at', cooldownCutoff)
        .limit(1)
      if (recentSignal && recentSignal.length > 0) continue

      const { data: latestMission } = await supabase
        .from('missions')
        .select('updated_at')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!latestMission?.updated_at) continue

      const lastMissionMs = new Date(latestMission.updated_at).getTime()
      if (Number.isNaN(lastMissionMs)) continue
      if (lastMissionMs > stalledCutoffMs) continue

      const hoursSince = (Date.now() - lastMissionMs) / (1000 * 60 * 60)
      await this.emitSignal(
        userId,
        'campaign_stalled',
        1.8,
        { hours_since_last_activity: Number(hoursSince.toFixed(2)) },
        campaignId,
        orgId,
      )
    }
  }
}
