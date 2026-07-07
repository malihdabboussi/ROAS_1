import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveContactViaInternalApi } from '../contact-resolution.util'
import { PublicAgentRepository } from '../repositories/public-agent.repository'
import { PublicAgentScope, PublicAgentService } from './public-agent.service'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface PublicAgentChatScope extends PublicAgentScope {
  agentKey: string
  widgetCampaignId?: string | null
}

interface IdentifyVisitorInput {
  visitor_id: string
  conversation_id: string
  email: string
  name?: string
  first_name?: string
  last_name?: string
}

function splitName(full: string): { first: string | null; last: string | null } {
  const trimmed = full.trim()
  if (!trimmed) return { first: null, last: null }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { first: parts[0]!, last: null }
  return { first: parts[0]!, last: parts.slice(1).join(' ') }
}

@Injectable()
export class PublicAgentChatService {
  private readonly logger = new Logger(PublicAgentChatService.name)

  constructor(
    private readonly publicAgentService: PublicAgentService,
    private readonly repository: PublicAgentRepository,
  ) {}

  async resolveChatRuntime(scope: PublicAgentChatScope): Promise<{
    owner: {
      accessToken: string
      refreshToken: string
      orgId: string | null
      actingUserId: string
    }
    supabase: SupabaseClient
  }> {
    const owner = await this.publicAgentService.resolveOwnerContext(scope)
    return {
      owner,
      supabase: this.repository.createOwnerClient(owner.accessToken),
    }
  }

  async identifyVisitor(scope: PublicAgentChatScope, input: IdentifyVisitorInput) {
    const visitorId = typeof input.visitor_id === 'string' ? input.visitor_id.trim() : ''
    const conversationId =
      typeof input.conversation_id === 'string' ? input.conversation_id.trim() : ''
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''

    if (!visitorId || !conversationId || !email) {
      return { error: 'Missing visitor_id, conversation_id, or email' }
    }
    if (!EMAIL_RE.test(email)) {
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

    const owner = await this.publicAgentService.resolveOwnerContext(scope)
    const supabase = this.repository.createOwnerClient(owner.accessToken)

    const { data: conversation, error: conversationErr } =
      await this.repository.findConversationForIdentify(supabase, owner, conversationId)
    if (conversationErr || !conversation) {
      this.logger.warn(`Identify failed: conversation not found ${conversationId}`)
      return { error: 'Conversation not found' }
    }

    const metadata =
      conversation.metadata && typeof conversation.metadata === 'object'
        ? { ...(conversation.metadata as Record<string, unknown>) }
        : {}
    metadata.public = true
    metadata.visitor_id = visitorId
    metadata.visitor_email = email
    if (visitorName) metadata.visitor_name = visitorName

    const contactId = await resolveContactViaInternalApi({
      userId: owner.actingUserId,
      orgId: owner.orgId ?? null,
      email,
      firstName,
      lastName,
      campaignId: scope.widgetCampaignId ?? null,
      agentKey: scope.agentKey,
    })

    const { error: updateErr } = await this.repository.updateConversationIdentity(
      supabase,
      owner,
      conversationId,
      {
        metadata,
        ...(contactId ? { contact_id: contactId } : {}),
        ...(scope.widgetCampaignId ? { campaign_id: scope.widgetCampaignId } : {}),
        updated_at: new Date().toISOString(),
      },
    )
    if (updateErr) {
      this.logger.error(`Identify update failed: ${updateErr.message}`)
      return { error: 'Failed to save visitor identity' }
    }

    return {
      linked: !!contactId,
      ...(contactId ? { contact_id: contactId } : {}),
    }
  }
}
