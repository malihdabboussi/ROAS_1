import { Injectable } from '@nestjs/common'
import { SupabaseClientFactory } from '@vibey/api-shared'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import { RequestContextService } from '../../shared/services/request-context.service'
import type { VibeyMcpTokenClaims } from '../types/vibey-mcp.types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function humanizeToolName(toolName: string): string {
  return toolName
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ')
}

@Injectable()
export class VibeyMcpSessionService {
  constructor(
    private readonly clientFactory: SupabaseClientFactory,
    private readonly conversations: ConversationsRepository,
    private readonly requestContext: RequestContextService,
  ) {}

  async buildSessionKey(
    claims: VibeyMcpTokenClaims,
    args: Record<string, unknown>,
    toolName: string,
  ): Promise<string> {
    const supabase = this.clientFactory.createUserClient(claims.supabase_access_token)
    const requestedConversationId = this.optionalUuid(args.conversation_id)
    const campaignId = this.optionalUuid(args.campaign_id)
    const spaceId = this.optionalUuid(args.space_id)
    const conversationId = requestedConversationId
      ? await this.assertConversation(
          supabase,
          requestedConversationId,
          claims.user_id,
          claims.org_id,
        )
      : await this.createConversation(supabase, claims, campaignId, toolName)

    this.requestContext.set(
      conversationId,
      claims.user_id,
      campaignId,
      claims.supabase_access_token,
      claims.supabase_refresh_token,
      null,
      claims.org_id,
      'studio',
      null,
      spaceId,
      spaceId ? 'shared_space' : campaignId ? 'campaign' : 'personal',
    )

    const base = claims.org_id
      ? `agent:org-${claims.org_id}-vibey:org-${claims.org_id}-vibey-${claims.user_id}-${conversationId}::org:${claims.org_id}`
      : `agent:vibey:vibey-${claims.user_id}-${conversationId}`
    return `${base}::mcp:${encodeURIComponent(claims.client_id)}${campaignId ? `::campaign:${campaignId}` : ''}${spaceId ? `::space:${spaceId}` : ''}`
  }

  private optionalUuid(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) return null
    const trimmed = value.trim()
    if (!UUID_RE.test(trimmed)) throw new Error('MCP context ids must be valid UUIDs')
    return trimmed
  }

  private async assertConversation(
    supabase: ReturnType<SupabaseClientFactory['createUserClient']>,
    conversationId: string,
    userId: string,
    orgId: string | null,
  ): Promise<string> {
    const row = await this.conversations.findByIdScoped(supabase, conversationId, userId, orgId)
    if (!row) throw new Error('conversation_id is not accessible')
    return conversationId
  }

  private async createConversation(
    supabase: ReturnType<SupabaseClientFactory['createUserClient']>,
    claims: VibeyMcpTokenClaims,
    campaignId: string | null,
    toolName: string,
  ): Promise<string> {
    const clientName = claims.client_name?.trim() || 'MCP'
    const readableToolName = humanizeToolName(toolName) || 'Conversation'
    const row = await this.conversations.create(supabase, {
      user_id: claims.user_id,
      title: `${clientName} · ${readableToolName}`.slice(0, 200),
      campaign_id: campaignId,
      agent_id: 'vibey',
      org_id: claims.org_id,
      metadata: {
        source: 'mcp',
        mcp_client_id: claims.client_id,
        mcp_client_name: claims.client_name,
        mcp_client_logo_uri: claims.client_logo_uri,
        mcp_tool_name: toolName,
      },
    })
    return String(row.id)
  }
}
