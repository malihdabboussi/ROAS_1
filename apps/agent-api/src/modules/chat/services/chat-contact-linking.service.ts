import { Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import { ChatContextRepository } from '../repositories/chat-context.repository'

const EXTRACT_EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

@Injectable()
export class ChatContactLinkingService {
  constructor(
    private readonly conversations: ConversationsRepository,
    private readonly chatContextRepository: ChatContextRepository,
  ) {}

  extractEmailCandidate(text: string): string | null {
    if (!text || !text.includes('@')) return null
    const match = text.match(EXTRACT_EMAIL_RE)
    if (!match?.[0]) return null
    return match[0].trim().toLowerCase()
  }

  async tryExtractAndLinkContact(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    messageContent: string,
    orgId: string | null | undefined,
    logger: Pick<Logger, 'log'>,
  ): Promise<void> {
    const extractedEmail = this.extractEmailCandidate(messageContent)
    if (!extractedEmail) return

    const conversation = orgId
      ? await this.conversations.findByIdOrgScoped(supabase, conversationId, orgId)
      : await this.conversations.findByIdScoped(supabase, conversationId, userId, orgId)
    if (!conversation) return
    if ((conversation.contact_id as string | null) != null) return

    const { data: contact, error: contactErr } =
      await this.chatContextRepository.findContactByEmail(supabase, {
        userId,
        email: extractedEmail,
        orgId,
      })
    if (contactErr) throw new Error(`Contact lookup failed: ${contactErr.message}`)

    const metadata =
      conversation.metadata && typeof conversation.metadata === 'object'
        ? { ...(conversation.metadata as Record<string, unknown>) }
        : {}
    metadata.extracted_email = extractedEmail
    metadata.extracted_email_at = new Date().toISOString()

    await this.conversations.update(supabase, conversationId, {
      metadata,
      ...((contact as { id?: string } | null)?.id
        ? { contact_id: (contact as { id: string }).id }
        : {}),
    })

    if ((contact as { id?: string } | null)?.id) {
      logger.log(
        `[ContactLinking] linked conversation=${conversationId} contact=${(contact as { id: string }).id} via extracted_email`,
      )
    }
  }
}
