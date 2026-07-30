import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactAgentDelegationRepository } from '../repositories/artifact-agent-delegation.repository'
import type {
  DelegationSourceContext,
  TargetResolution,
  TeamMember,
  TemplateOption,
} from './artifact-agent-delegation.types'

export class ArtifactAgentDelegationContextService {
  static readonly MAX_DELEGATION_DEPTH = 3
  private static readonly SOURCE_MESSAGE_LIMIT = 16
  private static readonly SOURCE_CONTEXT_CHARACTER_LIMIT = 20_000

  constructor(private readonly repository: ArtifactAgentDelegationRepository) {}

  async resolveTargetAgent(
    supabase: SupabaseClient,
    targetKey: string,
    campaignId: string | null,
    userId: string,
    orgId: string | null,
  ): Promise<TargetResolution> {
    const { data: registryAgent } = await this.repository.findScopedAgent(supabase, {
      agentKey: targetKey,
      userId,
      orgId,
    })

    if (!registryAgent) {
      const { data: templates } = await this.repository.listMatchingTemplates(supabase, targetKey)

      if (templates && templates.length > 0) {
        return {
          status: 'needs_hire',
          suggestions: templates.map((t) => ({
            role_key: t.role_key,
            default_name: t.default_name,
            role_title: t.role,
          })),
        }
      }

      const { current_team, available_templates } = await this.loadRosterAndTemplates(
        supabase,
        userId,
        orgId,
      )
      return {
        status: 'not_found',
        message: `No agent or role matching "${targetKey}" found.`,
        current_team,
        available_templates,
      }
    }

    if (!campaignId || registryAgent.agent_key === 'vibey') {
      return {
        status: 'available',
        agentKey: registryAgent.agent_key,
        name: registryAgent.name ?? targetKey,
        role: registryAgent.role ?? '',
        imageUrl: registryAgent.image_url ?? undefined,
      }
    }

    const { data: campaignMember } = await this.repository.findCampaignAgent(supabase, {
      campaignId,
      agentKey: targetKey,
    })

    if (campaignMember) {
      return {
        status: 'available',
        agentKey: registryAgent.agent_key,
        name: registryAgent.name ?? targetKey,
        role: registryAgent.role ?? '',
        imageUrl: registryAgent.image_url ?? undefined,
      }
    }

    return {
      status: 'needs_assign',
      agentKey: registryAgent.agent_key,
      name: registryAgent.name ?? targetKey,
      role: registryAgent.role ?? '',
      imageUrl: registryAgent.image_url ?? undefined,
    }
  }

  async loadRosterAndTemplates(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
  ): Promise<{ current_team: TeamMember[]; available_templates: TemplateOption[] }> {
    const [rosterResult, templatesResult] = await Promise.all([
      this.repository.listRoster(supabase, { userId, orgId }),
      this.repository.listTemplates(supabase),
    ])
    const current_team: TeamMember[] = (
      (rosterResult.data ?? []) as Array<{
        agent_key: string
        name: string | null
        role: string | null
      }>
    ).map((r) => ({
      agent_key: r.agent_key,
      name: r.name ?? r.agent_key,
      role: r.role ?? '',
    }))
    const available_templates: TemplateOption[] = (
      (templatesResult.data ?? []) as Array<{
        role_key: string
        default_name: string
        role: string
      }>
    ).map((t) => ({
      role_key: t.role_key,
      default_name: t.default_name,
      role_title: t.role,
    }))
    return { current_team, available_templates }
  }

  getDelegationDepth(sessionKey?: string): number {
    if (!sessionKey) return 0
    if (!sessionKey.includes(':delegation:')) return 0
    const depthMatch = sessionKey.match(/::depth:(\d+)/)
    if (depthMatch) return parseInt(depthMatch[1]!, 10)
    return 1
  }

  extractDelegationChain(sessionKey?: string): string[] {
    if (!sessionKey) return []
    const chainMatch = sessionKey.match(/::chain:([^:]+)/)
    if (chainMatch && chainMatch[1]) return chainMatch[1].split(',').filter(Boolean)
    if (!sessionKey.includes(':delegation:')) return []
    const parts = sessionKey.split(':delegation:')
    if (parts.length < 2) return []
    const callerPart = parts[1]!.split(':')[0]
    return callerPart ? [callerPart] : []
  }

  checkDelegationAllowed(
    sessionKey: string | undefined,
    targetAgentKey: string,
  ): { allowed: boolean; error?: string; depth: number; chain: string[] } {
    const depth = this.getDelegationDepth(sessionKey)
    const chain = this.extractDelegationChain(sessionKey)
    if (depth >= ArtifactAgentDelegationContextService.MAX_DELEGATION_DEPTH) {
      return {
        allowed: false,
        error: `Delegation depth limit reached (max ${ArtifactAgentDelegationContextService.MAX_DELEGATION_DEPTH}).`,
        depth,
        chain,
      }
    }
    if (chain.includes(targetAgentKey)) {
      return {
        allowed: false,
        error: `Circular delegation detected: ${targetAgentKey} is already in the delegation chain [${chain.join(' → ')}].`,
        depth,
        chain,
      }
    }
    return { allowed: true, depth, chain }
  }

  parseCampaignIdFromSessionKey(sessionKey?: string): string | null {
    if (!sessionKey?.includes('::campaign:')) return null
    const after = sessionKey.split('::campaign:')[1]?.trim()
    return after?.split('::')[0]?.trim() || null
  }

  async resolveCallerInfo(
    supabase: SupabaseClient,
    callerAgentKey: string,
    userId: string,
    orgId: string | null,
  ): Promise<{ image?: string; role?: string; name?: string }> {
    const { data } = await this.repository.findCallerInfo(supabase, {
      callerAgentKey,
      userId,
      orgId,
    })
    return {
      image: data?.image_url ?? undefined,
      role: data?.role ?? undefined,
      name: data?.name ?? undefined,
    }
  }

  async buildDelegationHistoryContext(
    serviceClient: SupabaseClient,
    targetAgentKey: string,
    conversationId: string,
    currentDelegationId: string,
  ): Promise<string> {
    if (!conversationId) return ''
    const { data: pastDelegations } = await this.repository.listCompletedDelegationHistory(
      serviceClient,
      {
        targetAgentKey,
        conversationId,
        currentDelegationId,
      },
    )

    if (!pastDelegations || pastDelegations.length === 0) return ''

    const entries = pastDelegations.map((d, i) => {
      const responsePreview = (d.response ?? '').slice(0, 500)
      return `${i + 1}. ${d.type === 'delegation' ? 'Task' : 'Question'}: ${d.prompt}\n   Your response: ${responsePreview}${(d.response?.length ?? 0) > 500 ? '...' : ''}`
    })

    return [
      '[DELEGATION HISTORY — Your past work in this conversation]',
      ...entries,
      '',
      'Use this context to understand what you have already done. Reference your past work when relevant.',
    ].join('\n')
  }

  async buildDelegationSourceContext(
    serviceClient: SupabaseClient,
    input: { conversationId: string; userId: string },
  ): Promise<DelegationSourceContext | null> {
    if (!input.conversationId) return null

    const { data: conversation } = await this.repository.findDelegationSourceConversation(
      serviceClient,
      input,
    )
    if (!conversation) return null

    const { data } = await this.repository.listDelegationSourceMessages(serviceClient, {
      conversationId: input.conversationId,
      limit: ArtifactAgentDelegationContextService.SOURCE_MESSAGE_LIMIT,
    })
    const messages = [...(data ?? [])].reverse()
    const metadata = conversation.metadata ?? {}
    const spaceId = this.readMetadataId(metadata, ['space_id', 'spaceId'])
    const campaignId = this.readMetadataId(metadata, ['campaign_id', 'campaignId'])
    const scope = [
      `Conversation: ${conversation.title || conversation.id}`,
      `Conversation ID: ${conversation.id}`,
      spaceId ? `Space ID: ${spaceId}` : '',
      campaignId ? `Campaign ID: ${campaignId}` : '',
    ].filter(Boolean)
    const transcript = messages
      .map((message) => {
        const role = message.role === 'assistant' ? 'Originating agent' : 'User'
        return `${role}: ${String(message.content ?? '').trim()}`
      })
      .filter((message) => !message.endsWith(': '))
      .join('\n\n')
    const header = [
      '[ORIGINATING CHAT EVIDENCE — authoritative context for this delegation]',
      ...scope,
      '',
    ]
      .filter((part, index, parts) => part || (index > 0 && parts[index - 1]))
      .join('\n')
    const footer =
      'Use this evidence before searching elsewhere. Preserve referenced task, meeting, Space, campaign, transcript, recording, and document IDs. Do not ask the user for information already present here.'
    const transcriptLimit = Math.max(
      0,
      ArtifactAgentDelegationContextService.SOURCE_CONTEXT_CHARACTER_LIMIT -
        header.length -
        footer.length -
        4,
    )
    const boundedTranscript = transcript.slice(-transcriptLimit)
    const content = [header, boundedTranscript, footer].filter(Boolean).join('\n\n')

    return {
      content,
      conversationId: conversation.id,
      ...(spaceId ? { spaceId } : {}),
      ...(campaignId ? { campaignId } : {}),
    }
  }

  private readMetadataId(metadata: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = metadata[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
    return undefined
  }

  async ensureDelegationRuntimeReady(params: {
    target: Record<string, any>
    userId: string
    orgId: string | null
    agentKey: string
    gatewayAgentId: string
  }): Promise<void> {
    const readiness = params.target.runtimeReadiness ?? params.target.runtimeReadinessService
    if (!readiness || typeof readiness.ensureRuntimeReady !== 'function') return
    await readiness.ensureRuntimeReady({
      userId: params.userId,
      orgId: params.orgId,
      agentKey: params.agentKey,
      gatewayAgentId: params.gatewayAgentId,
    })
  }
}
