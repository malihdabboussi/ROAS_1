import { Injectable, Logger } from '@nestjs/common'
import { resolveContactViaInternalApi } from '../contact-resolution.util'
import {
  PublicAgentRepository,
  type PublicAgentOwnerToken,
} from '../repositories/public-agent.repository'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type CachedOwnerToken = PublicAgentOwnerToken

export interface PublicAgentScope {
  userId: string | null
  orgId: string | null
}

interface PublicAgentConversationScope extends PublicAgentScope {
  agentKey: string
  widgetCampaignId?: string | null
}

interface CreatePublicConversationInput {
  visitor_id: string
  agent_key?: string
  email?: string
  first_name?: string
  last_name?: string
  name?: string
}

interface RenamePublicConversationInput {
  visitor_id: string
  title: string
}

function splitName(full: string): { first: string | null; last: string | null } {
  const trimmed = full.trim()
  if (!trimmed) return { first: null, last: null }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { first: parts[0]!, last: null }
  return { first: parts[0]!, last: parts.slice(1).join(' ') }
}

@Injectable()
export class PublicAgentService {
  private readonly logger = new Logger(PublicAgentService.name)
  private readonly cache = new Map<string, CachedOwnerToken>()
  private readonly mintInFlight = new Map<string, Promise<CachedOwnerToken>>()

  constructor(private readonly repository: PublicAgentRepository) {}

  /**
   * For org-scoped public agents the "acting user" is the org owner. For
   * personal agents the acting user is just the agent owner.
   */
  async resolveActingUserId(scope: PublicAgentScope): Promise<string> {
    if (scope.userId) return scope.userId
    if (!scope.orgId) {
      throw new Error('Public agent has no user or org scope')
    }
    const ownerId = await this.repository.findOrgOwnerId(scope.orgId)
    if (!ownerId) {
      throw new Error(`Public agent: org ${scope.orgId} owner unresolved (no owner_id)`)
    }
    return ownerId
  }

  async resolveOwnerContext(scope: PublicAgentScope): Promise<{
    accessToken: string
    refreshToken: string
    orgId: string | null
    actingUserId: string
  }> {
    const actingUserId = await this.resolveActingUserId(scope)
    const cacheKey = `${actingUserId}:${scope.orgId ?? 'personal'}`
    const cached = this.cache.get(cacheKey)
    const now = Math.floor(Date.now() / 1000)

    if (cached && cached.expiresAt > now + 120) {
      return cached
    }

    if (cached?.refreshToken) {
      const refreshed = await this.tryRefresh(cached.refreshToken)
      if (refreshed) {
        const withOrg: CachedOwnerToken = {
          ...refreshed,
          orgId: scope.orgId,
          actingUserId,
        }
        this.cache.set(cacheKey, withOrg)
        return withOrg
      }
    }

    const existing = this.mintInFlight.get(cacheKey)
    if (existing) {
      return existing
    }

    const promise = this.mintOwnerToken(actingUserId, scope.orgId)
    this.mintInFlight.set(cacheKey, promise)
    try {
      const token = await promise
      this.cache.set(cacheKey, token)
      return token
    } finally {
      this.mintInFlight.delete(cacheKey)
    }
  }

  async resolveAgentInfo(publicAgentToken: string): Promise<{
    userId: string | null
    agentKey: string
    orgId: string | null
  } | null> {
    const data = await this.repository.findAgentInfo(publicAgentToken)
    if (!data) return null
    return {
      userId: (data.user_id as string | null) ?? null,
      agentKey: data.agent_key,
      orgId: (data.org_id as string | null) ?? null,
    }
  }

  async resolveWidgetConfig(
    scope: PublicAgentScope,
    agentKey: string,
  ): Promise<{
    name: string
    role: string
    imageUrl: string | null
    widgetEnabled: boolean
    widgetTitle: string | null
    widgetSubtitle: string | null
    widgetShowSubtitle: boolean
    widgetGreeting: string | null
    widgetAccentColor: string | null
    widgetLauncherIconUrl: string | null
    widgetPosition: 'bottom-right' | 'bottom-left'
    widgetAllowedOrigins: string[]
    widgetHomeConfig: Record<string, unknown>
    widgetHelpArticles: unknown[]
    widgetHelpCollections: unknown[]
    widgetNewsItems: unknown[]
    widgetCampaignId: string | null
    userSlug: string | null
  } | null> {
    const data = await this.repository.findWidgetConfig(scope, agentKey)
    if (!data) return null

    let userSlug: string | null = null
    if (scope.userId) {
      userSlug = await this.repository.findProfileSlug(scope.userId)
    } else if (scope.orgId) {
      userSlug = await this.repository.findOrgSlug(scope.orgId)
    }

    const override =
      typeof data.widget_header_image_url === 'string' && data.widget_header_image_url.trim() !== ''
        ? data.widget_header_image_url.trim()
        : null

    return {
      name: data.name,
      role: data.role ?? '',
      imageUrl: override ?? data.image_url ?? null,
      widgetEnabled: !!data.widget_enabled,
      widgetTitle: data.widget_title ?? null,
      widgetSubtitle: data.widget_subtitle ?? null,
      widgetShowSubtitle: data.widget_show_subtitle !== false,
      widgetGreeting: data.widget_greeting ?? null,
      widgetAccentColor: data.widget_accent_color ?? null,
      widgetLauncherIconUrl: data.widget_launcher_icon_url ?? null,
      widgetPosition: data.widget_position === 'bottom-left' ? 'bottom-left' : 'bottom-right',
      widgetAllowedOrigins: (data.widget_allowed_origins as string[]) ?? [],
      widgetHomeConfig: (data.widget_home_config as Record<string, unknown>) ?? {},
      widgetHelpArticles: (data.widget_help_articles as unknown[]) ?? [],
      widgetHelpCollections: (data.widget_help_collections as unknown[]) ?? [],
      widgetNewsItems: (data.widget_news_items as unknown[]) ?? [],
      widgetCampaignId: (data.widget_campaign_id as string | null) ?? null,
      userSlug,
    }
  }

  async createPublicConversation(
    scope: PublicAgentConversationScope,
    input: CreatePublicConversationInput,
  ) {
    const { visitor_id } = input
    if (!visitor_id) {
      return { error: 'Missing visitor_id' }
    }

    const visitorEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
    if (visitorEmail && !EMAIL_RE.test(visitorEmail)) {
      return { error: 'Invalid email format' }
    }

    const explicitFirst =
      typeof input.first_name === 'string' && input.first_name.trim()
        ? input.first_name.trim()
        : null
    const explicitLast =
      typeof input.last_name === 'string' && input.last_name.trim() ? input.last_name.trim() : null
    const fallbackSplit =
      !explicitFirst && typeof input.name === 'string' ? splitName(input.name) : null
    const firstName = explicitFirst ?? fallbackSplit?.first ?? null
    const lastName = explicitLast ?? fallbackSplit?.last ?? null
    const visitorName = [firstName, lastName].filter(Boolean).join(' ') || null

    const owner = await this.resolveOwnerContext(scope)
    const supabase = this.repository.createOwnerClient(owner.accessToken)

    let contactId: string | null = null
    if (visitorEmail) {
      contactId = await resolveContactViaInternalApi({
        userId: owner.actingUserId,
        orgId: owner.orgId ?? null,
        email: visitorEmail,
        firstName,
        lastName,
        campaignId: scope.widgetCampaignId ?? null,
        agentKey: scope.agentKey,
      })
    }

    const { data, error } = await this.repository.insertConversation(supabase, {
      user_id: owner.actingUserId,
      agent_id: scope.agentKey,
      title: `Public chat`,
      status: 'active',
      metadata: {
        public: true,
        visitor_id,
        ...(visitorEmail ? { visitor_email: visitorEmail } : {}),
        ...(visitorName ? { visitor_name: visitorName } : {}),
      },
      ...(contactId ? { contact_id: contactId } : {}),
      ...(scope.widgetCampaignId ? { campaign_id: scope.widgetCampaignId } : {}),
      ...(owner.orgId ? { org_id: owner.orgId } : {}),
    })

    if (error) {
      this.logger.error(`Failed to create public conversation: ${error.message}`)
      return { error: 'Failed to create conversation' }
    }

    return { conversation: data, ...(contactId ? { contact_id: contactId } : {}) }
  }

  async listPublicConversations(
    scope: PublicAgentConversationScope,
    visitorId: string,
    emailQuery: string | undefined,
  ) {
    const visitor = typeof visitorId === 'string' ? visitorId.trim() : ''
    if (!visitor) {
      return { error: 'Missing visitor_id' }
    }
    const email = typeof emailQuery === 'string' ? emailQuery.trim().toLowerCase() : ''

    const owner = await this.resolveOwnerContext(scope)
    const supabase = this.repository.createOwnerClient(owner.accessToken)

    const { data: conversations, error: convErr } = await this.repository.listConversations(
      supabase,
      owner,
      scope.agentKey,
      visitor,
      email,
    )
    if (convErr) {
      this.logger.error(`Failed to list public conversations: ${convErr.message}`)
      return { error: 'Failed to list conversations' }
    }

    const ids = (conversations ?? []).map((c) => c.id as string)
    const previewByConv = new Map<string, { content: string; created_at: string }>()
    if (ids.length > 0) {
      const { data: previews, error: prevErr } = await this.repository.listMessagePreviews(
        supabase,
        ids,
      )
      if (prevErr) {
        this.logger.warn(`Public preview fetch failed: ${prevErr.message}`)
      } else {
        for (const row of previews ?? []) {
          const cid = row.conversation_id as string
          if (previewByConv.has(cid)) continue
          previewByConv.set(cid, {
            content: typeof row.content === 'string' ? row.content : '',
            created_at: row.created_at as string,
          })
        }
      }
    }

    return {
      conversations: (conversations ?? []).map((c) => {
        const cid = c.id as string
        const prev = previewByConv.get(cid)
        return {
          id: cid,
          title: (c.title as string) ?? 'Conversation',
          created_at: c.created_at as string,
          updated_at: c.updated_at as string,
          last_preview: prev?.content ?? '',
          last_activity_at: prev?.created_at ?? (c.updated_at as string),
          contact_id: (c.contact_id as string | null) ?? null,
        }
      }),
    }
  }

  async renamePublicConversation(
    scope: PublicAgentConversationScope,
    conversationId: string,
    input: RenamePublicConversationInput,
  ) {
    const visitor = typeof input.visitor_id === 'string' ? input.visitor_id.trim() : ''
    const title = typeof input.title === 'string' ? input.title.trim() : ''
    if (!visitor || !title) {
      return { error: 'Missing visitor_id or title' }
    }
    if (title.length > 120) {
      return { error: 'Title too long' }
    }

    const owner = await this.resolveOwnerContext(scope)
    const supabase = this.repository.createOwnerClient(owner.accessToken)

    const { data: existing, error: lookupErr } = await this.repository.findConversationForRename(
      supabase,
      owner,
      scope.agentKey,
      conversationId,
    )
    if (lookupErr || !existing) {
      this.logger.warn(`Rename failed: conversation not found ${conversationId}`)
      return { error: 'Conversation not found' }
    }
    const meta = (existing.metadata ?? {}) as Record<string, unknown>
    if (meta.visitor_id !== visitor) {
      return { error: 'Not allowed' }
    }

    const { error: updateErr } = await this.repository.updateConversationTitle(
      supabase,
      owner,
      conversationId,
      title,
    )
    if (updateErr) {
      this.logger.error(`Rename update failed: ${updateErr.message}`)
      return { error: 'Failed to rename conversation' }
    }
    return { ok: true, title }
  }

  async listPublicConversationMessages(scope: PublicAgentScope, conversationId: string) {
    const owner = await this.resolveOwnerContext(scope)
    const supabase = this.repository.createOwnerClient(owner.accessToken)

    const { data, error } = await this.repository.listConversationMessages(
      supabase,
      conversationId,
    )

    if (error) {
      this.logger.error(`Failed to fetch messages: ${error.message}`)
      return { error: 'Failed to fetch messages' }
    }

    return { messages: data ?? [] }
  }

  private async tryRefresh(
    refreshToken: string,
  ): Promise<Omit<CachedOwnerToken, 'orgId' | 'actingUserId'> | null> {
    return this.repository.refreshOwnerSession(refreshToken)
  }

  private async mintOwnerToken(
    actingUserId: string,
    orgId: string | null,
  ): Promise<CachedOwnerToken> {
    const token = await this.repository.mintOwnerToken(actingUserId, orgId)

    this.logger.log(
      `Minted owner token for public agent, actingUser ${actingUserId} org ${orgId ?? '-'}`,
    )

    return token
  }
}
