import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '../../../lib/services/database.service'
import { MissionOpenclawGateway } from './gateways/mission-openclaw.gateway'

@Injectable()
export class DailyDigestService {
  private lastDigestSlot = ''

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly openclawGateway: MissionOpenclawGateway,
    private readonly configService: ConfigService,
  ) {}

  async maybeRunDigests(): Promise<void> {
    const now = new Date()
    const minutes = now.getUTCMinutes()
    const slot = minutes < 30 ? '00' : '30'
    const currentSlot = `${String(now.getUTCHours()).padStart(2, '0')}:${slot}`
    if (currentSlot === this.lastDigestSlot) return
    this.lastDigestSlot = currentSlot

    const supabase = this.databaseService.getClient()
    const { data: users } = await supabase
      .from('profiles')
      .select('id, daily_digest_time, preferred_channel')
      .eq('daily_digest_enabled', true)
      .eq('daily_digest_time', currentSlot)

    for (const user of users || []) {
      const userId = String((user as any).id)
      const { data: personalAgent } = await supabase
        .from('agents_registry')
        .select('agent_key, org_id')
        .eq('user_id', userId)
        .is('org_id', null)
        .eq('level', 'c_level')
        .limit(1)
        .maybeSingle()
      let agent = personalAgent as { agent_key: string; org_id: string | null } | null
      if (!agent) {
        const { data: memberships } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .limit(1)
        const firstOrg = memberships?.[0]
        if (firstOrg) {
          const { data: orgAgent } = await supabase
            .from('agents_registry')
            .select('agent_key, org_id')
            .eq('org_id', String(firstOrg.org_id))
            .is('user_id', null)
            .eq('level', 'c_level')
            .limit(1)
            .maybeSingle()
          agent = orgAgent as { agent_key: string; org_id: string | null } | null
        }
      }
      if (!agent?.agent_key) continue

      const { data: points } = await supabase
        .from('agent_awareness_points')
        .select('content, created_at, campaign_id, point_type')
        .eq('user_id', (user as any).id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
      if (!points || points.length === 0) continue

      const campaignIds = [
        ...new Set((points as any[]).map((p) => p.campaign_id).filter(Boolean) as string[]),
      ]
      let campaignNames: Record<string, string> = {}
      if (campaignIds.length > 0) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, name')
          .in('id', campaignIds)
        if (campaigns) {
          campaignNames = Object.fromEntries((campaigns as any[]).map((c) => [c.id, c.name]))
        }
      }

      const grouped: Record<string, string[]> = {}
      for (const p of points as any[]) {
        const key = p.campaign_id ? campaignNames[p.campaign_id] || p.campaign_id : 'General'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(`[${p.point_type || 'observation'}] ${p.content}`)
      }
      const signalBlock = Object.entries(grouped)
        .map(([name, items]) => `### ${name}\n${items.map((i) => `- ${i}`).join('\n')}`)
        .join('\n\n')

      const prompt = [
        'Summarize these awareness signals into a daily digest the user reads in the Awareness panel.',
        '',
        'Format rules (the panel renders plain text with whitespace-pre-wrap, not markdown):',
        '- Group by campaign. Use the campaign name as a bold header line (e.g. **Campaign Name**).',
        '- Under each campaign, write 1-3 short insight lines. Each line starts with a dash and a space.',
        '- Keep each line to one clear thought — what happened, what it means, or what needs attention.',
        '- End with a one-line takeaway if there is an actionable recommendation across campaigns.',
        '- Scale length with signal count: few signals = short digest, many signals = longer digest.',
        '- Write in your voice as the CEO/COO — direct, opinionated, no filler.',
        '',
        'Example output:',
        '**InbarMD**',
        '- Avatar research is deep but needs a Marketing Strategist to turn buyer psychology into copy that converts',
        '- Instagram strategy has solid competitive intel — missing someone who owns growth mechanics',
        '',
        '**Emma Weil**',
        '- Two missions reviewed and rejected — needs a replan decision from you',
        '',
        'Recommendation: Approve both InbarMD hires before going deeper to avoid a costly rewrite.',
        '',
        '---',
        '',
        'Signals from the last 24 hours:',
        '',
        signalBlock,
      ].join('\n')
      const result = await this.openclawGateway.callOpenClawRaw(
        {
          id: `digest-${Date.now()}`,
          user_id: (user as any).id,
          org_id: agent.org_id ?? null,
          correlation_id: `digest-${Date.now()}`,
        },
        agent.agent_key,
        '',
        `DAILY_DIGEST_MODE: true\n\n${prompt}`,
      )
      const digest = String(result.content || '').trim()
      if (!digest) continue

      if ((user as any).preferred_channel === 'telegram') {
        const callbackUrl = this.configService.get<string>('missionApi.callbackUrl') || ''
        const internalToken = this.configService.get<string>('missionApi.internalToken') || ''
        const baseUrl = callbackUrl.replace('/api/internal/missions/callback', '')
        await fetch(`${baseUrl}/api/internal/missions/awareness/telegram-push`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${internalToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: (user as any).id,
            agent_key: agent.agent_key,
            content: digest,
          }),
        }).catch(() => {})
      } else {
        await supabase.from('agent_awareness_points').insert({
          user_id: (user as any).id,
          agent_key: agent.agent_key,
          content: digest,
          point_type: 'daily_digest',
        })
      }
    }
  }
}
