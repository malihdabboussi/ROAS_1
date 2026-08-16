import type { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SlackRuntimeRepository } from '../repositories/slack-runtime.repository'

export async function retitleSlackConversationIfNeeded(input: {
  supabase: SupabaseClient
  conversationId: string
  userId: string
  firstMessage: string
  currentTitle: string | null
  slackRuntimeRepo: SlackRuntimeRepository
  moduleRef: ModuleRef | null
}): Promise<void> {
  const { needsGeneratedConversationTitle, resolveGeneratedConversationTitle } =
    await import('../../conversations/utils/conversation-title.util')
  if (!needsGeneratedConversationTitle(input.currentTitle, input.firstMessage)) return

  let suggested = ''
  if (input.moduleRef) {
    try {
      const { ConversationTitleSuggestionService } =
        await import('../../conversations/services/conversation-title-suggestion.service')
      const titleService = input.moduleRef.get(ConversationTitleSuggestionService, {
        strict: false,
      })
      if (titleService) {
        const result = await titleService.suggestConversationTitle(input.firstMessage, input.userId)
        suggested = result.title
      }
    } catch {
      suggested = ''
    }
  }

  const title = resolveGeneratedConversationTitle(suggested, 60)
  if (!title || title === input.currentTitle) return
  await input.slackRuntimeRepo.updateConversationTitle(input.supabase, input.conversationId, title)
}
