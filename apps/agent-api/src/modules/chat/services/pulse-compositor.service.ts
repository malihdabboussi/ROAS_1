import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ChatRuntimeRepository } from '../repositories/chat-runtime.repository'

@Injectable()
export class PulseCompositorService {
  constructor(private readonly repository: ChatRuntimeRepository = new ChatRuntimeRepository()) {}

  async buildPulse(
    supabase: SupabaseClient,
    params: {
      userId: string
      agentKey: string
      resolvedCampaignId?: string
      channel: 'studio' | 'slack' | 'telegram'
      orgId?: string | null
    },
  ): Promise<string> {
    const { userId, agentKey, resolvedCampaignId, channel, orgId } = params

    const [campaigns, missions, agent] = await Promise.all([
      this.repository.listPulseCampaigns(supabase, { userId, orgId }),
      this.repository.listPulseMissions(supabase, { userId, orgId }),
      this.repository.findPulseAgent(supabase, { userId, agentKey, orgId }),
    ])

    const missionRows = missions ?? []
    const activeMissionCount = missionRows.filter((m: any) =>
      ['planning', 'todo', 'in_progress'].includes(String(m.status)),
    ).length
    const reviewingMissionCount = missionRows.filter(
      (m: any) => String(m.status) === 'review',
    ).length

    const campaignRows = campaigns ?? []
    const activeCampaign =
      campaignRows.find((c: any) => resolvedCampaignId && c.id === resolvedCampaignId) ||
      campaignRows.find((c: any) => String(c.status) === 'active') ||
      campaignRows[0]

    const level = String(agent?.level || 'system')
    const config = (agent?.config || {}) as Record<string, unknown>
    const isPromoted = level === 'c_level' || config.archetype === 'ceo'

    let signalsLine = ''
    if (isPromoted) {
      const pendingSignals = await this.repository.listPulseSignals(supabase, { userId, orgId })
      if (pendingSignals.length > 0) {
        const uniqueTypes = [...new Set(pendingSignals.map((s: any) => String(s.signal_type)))]
        signalsLine = `Signals: ${pendingSignals.length} pending (${uniqueTypes.slice(0, 2).join(', ')})`
      }
    }

    const campaignLine =
      campaignRows.length <= 1
        ? `Campaign: ${activeCampaign?.name ?? 'none'}`
        : `Campaigns: ${campaignRows
            .slice(0, 3)
            .map((c: any) => `${c.name} (${c.status})`)
            .join(', ')}${campaignRows.length > 3 ? ` +${campaignRows.length - 3} more` : ''}`
    const activeLine = campaignRows.length > 1 ? `Active: ${activeCampaign?.name ?? 'unknown'}` : ''
    const resolverHint =
      campaignRows.length > 1
        ? 'If the request is ambiguous, ask which campaign before proceeding.'
        : ''

    return [
      'PULSE:',
      campaignLine,
      activeLine,
      `Missions: ${activeMissionCount} active | ${reviewingMissionCount} reviewing`,
      signalsLine,
      `Channel: ${channel}`,
      resolverHint,
    ]
      .filter(Boolean)
      .join('\n')
  }
}
