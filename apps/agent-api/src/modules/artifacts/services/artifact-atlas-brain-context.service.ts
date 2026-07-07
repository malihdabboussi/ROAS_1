import { Injectable } from '@nestjs/common'
import { temporalInsertFields } from '@vibey/api-shared'
import { parseConversationIdFromSessionKey } from './artifact-action.registry'
import { validateActionPreflight } from './artifact-action-preflight'

type AgentBrainResolver = (
  target: Record<string, any>,
  input: Record<string, unknown>,
  sessionKey?: string,
) => Promise<Record<string, any>>

@Injectable()
export class ArtifactAtlasBrainContextService {
  async saveBrainContext(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveAgentBrain: AgentBrainResolver,
  ) {
    const targetBrain = String(input.target_brain ?? input.targetBrain ?? '')
      .trim()
      .toLowerCase()
    const content = String(input.content ?? '').trim()
    if (!targetBrain) return { success: false, error: 'target_brain is required' }
    if (!content) return { success: false, error: 'content is required' }

    const title = this.brainSaveTitle(input, content)
    const sourceTitle = String(input.source_title ?? title).trim()
    const sourceUrl = String(input.source_url ?? '').trim()
    const sourceId = String(input.source_id ?? input.sourceId ?? sourceUrl).trim()
    const commonSource = {
      source_type: String(input.source_type ?? input.sourceType ?? (sourceUrl ? 'url' : 'mcp')),
      source_id: sourceId || undefined,
      source_title: sourceTitle || undefined,
    }
    const temporal = temporalInsertFields(input)

    if (targetBrain === 'user') {
      return this.callRoutedAction(
        target,
        'save_user_memory',
        {
          content,
          memory_type: this.memoryTypeForIntent(input.intent),
          ...commonSource,
          ...temporal,
        },
        sessionKey,
      )
    }

    if (targetBrain === 'customer') {
      const preflightError = await validateActionPreflight('atlas_save_brain_context', input, {
        sessionKey,
      })
      if (preflightError) {
        return {
          ...preflightError,
          success: false,
          needs_context: true,
          missing: ['contact_id_or_source_identity'],
        }
      }
      const contactId = String(input.contact_id ?? input.contactId ?? '').trim()
      const conversationId = String(
        input.conversation_id ??
          input.conversationId ??
          parseConversationIdFromSessionKey(sessionKey) ??
          '',
      ).trim()
      return this.callRoutedAction(
        target,
        'save_customer_memory',
        {
          content,
          ...(contactId ? { contact_id: contactId } : {}),
          brain_id: input.brain_id ?? input.brainId,
          memory_type: this.memoryTypeForIntent(input.intent),
          ...commonSource,
          ...(input.customer_source_identity_id || input.customerSourceIdentityId
            ? {
                customer_source_identity_id:
                  input.customer_source_identity_id ?? input.customerSourceIdentityId,
              }
            : {}),
          ...(input.source_identity || input.sourceIdentity
            ? { source_identity: input.source_identity ?? input.sourceIdentity }
            : {}),
          ...(conversationId ? { conversation_id: conversationId } : {}),
          ...(input.visitor_id || input.visitorId
            ? { visitor_id: input.visitor_id ?? input.visitorId }
            : {}),
          ...(input.telegram_chat_id || input.telegramChatId
            ? { telegram_chat_id: input.telegram_chat_id ?? input.telegramChatId }
            : {}),
          ...(input.meeting_id || input.meetingId
            ? { meeting_id: input.meeting_id ?? input.meetingId }
            : {}),
          ...(input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
            ? { metadata: input.metadata }
            : {}),
          ...temporal,
        },
        sessionKey,
      )
    }

    if (targetBrain === 'company') {
      return this.callRoutedAction(
        target,
        'propose_company_brain_signal',
        {
          brain_id: input.brain_id ?? input.brainId,
          signal_type: this.companySignalTypeForIntent(input),
          truth: content,
          confidence: input.confidence,
          reason: input.reason ?? input.intent,
          context_form: input.context_form,
          confidence_basis:
            input.confidence_basis && typeof input.confidence_basis === 'object'
              ? input.confidence_basis
              : {
                  proposal: {
                    source: 'atlas_save_brain_context',
                    target_brain: 'company',
                  },
                },
          ...temporal,
          ...commonSource,
        },
        sessionKey,
      )
    }

    if (targetBrain === 'agent') {
      const brainId = String(input.brain_id ?? input.brainId ?? '').trim()
      let resolvedBrainId = brainId
      if (!resolvedBrainId) {
        const agentKey = String(input.agent_key ?? input.agent_id ?? '').trim()
        if (!agentKey) {
          return {
            success: false,
            needs_context: true,
            missing: ['brain_id', 'agent_key'],
            error: 'brain_id or agent_key is required to save agent brain context',
          }
        }
        const resolved = await resolveAgentBrain(target, { agent_key: agentKey }, sessionKey)
        if (!resolved.success || typeof resolved.brain_id !== 'string') {
          return {
            success: false,
            needs_context: true,
            missing: ['brain_id'],
            error: String(resolved.error ?? 'Agent Brain is not provisioned'),
            resolution: resolved,
          }
        }
        resolvedBrainId = resolved.brain_id
      }
      return this.callRoutedAction(
        target,
        'ingest_agent_brain_text',
        {
          brain_id: resolvedBrainId,
          text: content,
          content,
          title,
          sourceType: 'mcp',
          source_type: 'mcp',
          ...temporal,
        },
        sessionKey,
      )
    }

    if (targetBrain === 'campaign') {
      const campaignId = String(input.campaign_id ?? '').trim()
      if (!campaignId) {
        return {
          success: false,
          needs_context: true,
          missing: ['campaign_id'],
          error: 'campaign_id is required to save campaign context',
        }
      }
      return this.callRoutedAction(
        target,
        'save_document',
        { campaign_id: campaignId, title, content, document_type: 'brain_context' },
        sessionKey,
      )
    }

    if (targetBrain === 'space') {
      const spaceId = String(input.space_id ?? '').trim()
      if (!spaceId) {
        return {
          success: false,
          needs_context: true,
          missing: ['space_id'],
          error: 'space_id is required to save space context',
        }
      }
      return this.callRoutedAction(
        target,
        'save_document',
        { space_id: spaceId, title, content, document_type: 'brain_context' },
        sessionKey,
      )
    }

    return {
      success: false,
      error: 'target_brain must be user, customer, company, agent, campaign, or space',
    }
  }

  private brainSaveTitle(input: Record<string, unknown>, content: string): string {
    const explicit = String(input.title ?? input.source_title ?? '').trim()
    if (explicit) return explicit.slice(0, 160)
    const normalized = content.replace(/\s+/g, ' ').trim()
    return (normalized.slice(0, 80) || 'MCP Brain Context').trim()
  }

  private memoryTypeForIntent(intent: unknown): string {
    const normalized = String(intent ?? '')
      .trim()
      .toLowerCase()
    if (['decision', 'preference', 'fact', 'story', 'framework', 'event'].includes(normalized)) {
      return normalized
    }
    if (normalized === 'standard' || normalized === 'protocol') return 'framework'
    return 'insight'
  }

  private companySignalTypeForIntent(input: Record<string, unknown>): string {
    const explicit = String(input.signal_type ?? input.object_type ?? '')
      .trim()
      .toLowerCase()
    const allowed = new Set([
      'belief',
      'standard',
      'move',
      'anti_pattern',
      'protocol',
      'decision',
      'tension_candidate',
      'retrieval_rule',
    ])
    if (allowed.has(explicit)) return explicit
    if (explicit === 'tension') return 'tension_candidate'
    const intent = String(input.intent ?? '')
      .trim()
      .toLowerCase()
    if (intent === 'decision' || intent === 'standard' || intent === 'protocol') return intent
    return 'belief'
  }

  private async callRoutedAction(
    target: Record<string, any>,
    action: string,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    if (typeof target.executeAction !== 'function') {
      return { success: false, error: 'Artifact action router is unavailable' }
    }
    const result = await target.executeAction(action, data, sessionKey)
    const record: Record<string, unknown> =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : { result }
    if (record.success === false) {
      return { ...record, target_action: action }
    }
    return { success: true, target_action: action, result: record }
  }
}
