import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { ChatContextRepository } from '../repositories/chat-context.repository'

interface RuntimeTextCacheEntry {
  resolvedAt: number
  text: string
}

const CHAT_RUNTIME_TEXT_CACHE_TTL_MS = 5 * 60_000

@Injectable()
export class ChatProfileContextService {
  private readonly runtimeTextCache = new Map<string, RuntimeTextCacheEntry>()

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly chatContextRepository: ChatContextRepository,
  ) {}

  async buildUserProfileSummary(userId: string, orgId?: string | null): Promise<string> {
    const cacheKey = ['user_profile', `user:${userId}`, `org:${orgId ?? ''}`].join('|')
    const cached = this.getRuntimeTextCache(cacheKey)
    if (cached !== null) return cached

    const lines: string[] = []

    if (orgId) {
      const org = await this.chatContextRepository.findOrganizationProfile(this.svc.client, orgId)
      if (org) {
        lines.push('ORG_PROFILE:')
        if (org.name) lines.push(`- Organization: ${org.name}`)
        if (org.slug) lines.push(`- Slug: ${org.slug}`)
        if (org.account_type) lines.push(`- Account Type: ${org.account_type}`)
      }
    }

    const { data, error } = await this.chatContextRepository.findUserProfile(
      this.svc.client,
      userId,
    )
    if (!error && data) {
      lines.push(orgId ? 'CURRENT_USER:' : 'USER_PROFILE:')
      if (data.full_name) lines.push(`- Name: ${data.full_name}`)
      if (data.email) lines.push(`- Email: ${data.email}`)
      if (!orgId) {
        if (data.company_name) lines.push(`- Company: ${data.company_name}`)
        if (data.industry) lines.push(`- Industry: ${data.industry}`)
        if (data.website) lines.push(`- Website: ${data.website}`)
        if (data.plan) lines.push(`- Plan: ${data.plan}`)

        const onboarding = data.onboarding_data as Record<string, unknown> | null
        if (onboarding && Object.keys(onboarding).length > 0) {
          lines.push('- Onboarding:')
          for (const [key, value] of Object.entries(onboarding)) {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            const display =
              typeof value === 'string'
                ? value
                : Array.isArray(value)
                  ? value.join(', ')
                  : JSON.stringify(value)
            lines.push(`  - ${label}: ${display}`)
          }
        }

        const prefs = data.preferences as Record<string, unknown> | null
        if (prefs && Object.keys(prefs).length > 0) {
          lines.push('- Preferences:')
          for (const [key, value] of Object.entries(prefs)) {
            // Skip UI blobs (e.g. home_layout) — only surface primitive preference values.
            if (value === null || value === undefined || typeof value === 'object') continue
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            lines.push(`  - ${label}: ${String(value)}`)
          }
          if (lines[lines.length - 1] === '- Preferences:') lines.pop()
        }
      }
    }

    return this.setRuntimeTextCache(cacheKey, lines.length > 0 ? lines.join('\n') : '')
  }

  async buildTeamRosterContext(
    userId: string,
    orgId?: string | null,
    callerAgentId?: string,
  ): Promise<string> {
    const cacheKey = [
      'team_roster',
      `user:${userId}`,
      `org:${orgId ?? ''}`,
      `agent:${callerAgentId ?? ''}`,
    ].join('|')
    const cached = this.getRuntimeTextCache(cacheKey)
    if (cached !== null) return cached

    const isHr = callerAgentId === 'hr'
    const { data: agents, error } = await this.chatContextRepository.listTeamRosterAgents(
      this.svc.client,
      { userId, orgId },
    )
    if (error || !agents || agents.length === 0) return this.setRuntimeTextCache(cacheKey, '')
    const lines = ['TEAM_ROSTER:']
    for (const agent of agents) {
      const domain = (agent.config as Record<string, unknown> | null)?.capability_domain as
        | string
        | null
      let entry = `- "${agent.agent_key}" (${agent.name} — ${agent.role})`
      if (domain) entry += ` [${domain}]`
      if (isHr) {
        const level = agent.level as string | null
        const specialty = agent.specialty as string | null
        if (level) entry += ` Level: ${level}`
        if (specialty) entry += ` | Specialty: ${specialty}`
      }
      lines.push(entry)
    }
    if (!isHr) {
      lines.push('Use resolve_agent_brain with the agent_key to target a specific agent brain.')
    }
    return this.setRuntimeTextCache(cacheKey, lines.join('\n'))
  }

  async buildCampaignTeamContext(campaignId?: string): Promise<string> {
    if (!campaignId) return ''
    const cacheKey = ['campaign_team', `campaign:${campaignId}`].join('|')
    const cached = this.getRuntimeTextCache(cacheKey)
    if (cached !== null) return cached

    const { data: members, error } = await this.chatContextRepository.listCampaignAgents(
      this.svc.client,
      campaignId,
    )
    if (error || !members || members.length === 0) return this.setRuntimeTextCache(cacheKey, '')

    const agentKeys = members.map((member) => String(member.agent_key))
    const registryAgents = await this.chatContextRepository.listAgentsByKeys(
      this.svc.client,
      agentKeys,
    )
    const registryMap = new Map(
      (registryAgents ?? []).map((agent) => [
        String(agent.agent_key),
        {
          role: agent.role as string | null,
          specialty: agent.specialty as string | null,
          domain: (agent.config as Record<string, unknown> | null)?.capability_domain as
            | string
            | null,
        },
      ]),
    )

    const lines = [
      'CAMPAIGN_TEAM:',
      'Your team for this campaign. Ways to collaborate:',
      '',
      '- ask_agent — ask one agent a question. They research and respond. Use for specialist opinions or knowledge checks.',
      '- delegate_to_agent — hand off a task to one agent. They use their full toolkit to produce deliverables. Use when a specialist would produce better output than you.',
      "- brainstorm_agents — multi-agent discussion. 2+ agents build on each other's ideas across rounds. Use when a topic benefits from diverse perspectives.",
      '- create_mission — create a tracked task in Mission Control. Use only when the user explicitly asks for it or when work is genuinely multi-day and needs persistent Kanban tracking. Chat delegation is the default for most work.',
      '',
      'If an action is denied because it is outside your domain, use ask_agent or delegate_to_agent to reach a teammate whose domain includes it. Check the domain tags below to find the right person.',
      '',
      'Team:',
    ]
    for (const member of members) {
      const reg = registryMap.get(String(member.agent_key))
      const role = reg?.role || (member.config as Record<string, unknown> | null)?.role || ''
      const specialty = reg?.specialty || ''
      const domain = reg?.domain || ''
      let entry = `- "${member.agent_key}" (${member.name})`
      if (role) entry += ` — ${role}`
      if (domain) entry += `. Domain: ${domain}`
      if (specialty) entry += `. Specialty: ${specialty}`
      lines.push(entry)
    }
    return this.setRuntimeTextCache(cacheKey, lines.join('\n'))
  }

  private getRuntimeTextCache(key: string): string | null {
    const cached = this.runtimeTextCache.get(key)
    if (!cached) return null
    if (Date.now() - cached.resolvedAt >= CHAT_RUNTIME_TEXT_CACHE_TTL_MS) {
      this.runtimeTextCache.delete(key)
      return null
    }
    return cached.text
  }

  private setRuntimeTextCache(key: string, text: string): string {
    this.runtimeTextCache.set(key, { resolvedAt: Date.now(), text })
    return text
  }
}
