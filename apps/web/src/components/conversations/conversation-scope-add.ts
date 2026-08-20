import { toast } from 'sonner'
import type { Campaign } from '@/lib/campaigns'
import {
  addConversationConnection,
  assignConversationScope,
  CONVERSATION_ACTIONS_TOAST_ERRORS,
  type Conversation,
} from '@/lib/conversations'
import type { Program } from '@/lib/programs'
import type { ConversationScopeSpace } from './conversation-scope-picker-layout'
import { buildConversationScopeChange } from './conversation-scope-select'

export async function addConversationScopeConnection(input: {
  conversationId: string
  campaignId: string | null
  spaceId: string | null
}): Promise<{ promoted_primary: boolean; conversation?: Conversation }> {
  let promotedPrimary = false
  let conversation: Conversation | undefined

  if (input.campaignId) {
    const added = await addConversationConnection(input.conversationId, {
      entity_type: 'campaign',
      entity_id: input.campaignId,
    })
    promotedPrimary = added.promoted_primary
    conversation = added.conversation
  }

  if (input.spaceId) {
    const added = await addConversationConnection(input.conversationId, {
      entity_type: 'space',
      entity_id: input.spaceId,
    })
    conversation = added.conversation
  }

  return { promoted_primary: promotedPrimary, conversation }
}

export async function applyConversationScopePickerSelection(input: {
  selectionMode: 'replace' | 'add'
  conversation: Conversation | null
  nextCampaignId: string | null
  nextSpaceId: string | null
  resolveGeneralSpaceId: (campaignId: string) => Promise<string | null>
  campaigns: Campaign[]
  programs: Program[]
  spacesByCampaign: Record<string, ConversationScopeSpace[]>
  fallbackSpace: ConversationScopeSpace | null | undefined
  onConversationUpdated?: (conversation: Conversation) => void
  onScopeChanged?: (scope: ReturnType<typeof buildConversationScopeChange>) => void
}): Promise<void> {
  try {
    if (input.selectionMode === 'add' && input.conversation) {
      const added = await addConversationScopeConnection({
        conversationId: input.conversation.id,
        campaignId: input.nextCampaignId,
        spaceId: input.nextSpaceId,
      })
      if (added.conversation) input.onConversationUpdated?.(added.conversation)
      if (added.promoted_primary) {
        input.onScopeChanged?.(
          buildConversationScopeChange({
            campaignId: input.nextCampaignId,
            spaceId: input.nextSpaceId,
            campaigns: input.campaigns,
            programs: input.programs,
            spacesByCampaign: input.spacesByCampaign,
            fallbackSpace: input.fallbackSpace ?? null,
          }),
        )
      }
      return
    }

    let resolvedSpaceId = input.nextSpaceId
    if (input.nextCampaignId && resolvedSpaceId == null) {
      resolvedSpaceId = await input.resolveGeneralSpaceId(input.nextCampaignId)
    }
    if (input.conversation) {
      const updated = await assignConversationScope(
        input.conversation.id,
        input.nextCampaignId,
        resolvedSpaceId,
      )
      input.onConversationUpdated?.(updated)
    }
    input.onScopeChanged?.(
      buildConversationScopeChange({
        campaignId: input.nextCampaignId,
        spaceId: resolvedSpaceId,
        campaigns: input.campaigns,
        programs: input.programs,
        spacesByCampaign: input.spacesByCampaign,
        fallbackSpace: input.fallbackSpace ?? null,
      }),
    )
  } catch (error) {
    console.error('Move conversation scope failed:', error)
    toast.error(
      (input.selectionMode === 'add'
        ? CONVERSATION_ACTIONS_TOAST_ERRORS.ADD_CONNECTION_FAILED
        : CONVERSATION_ACTIONS_TOAST_ERRORS.MOVE_CONVERSATION_FAILED
      ).userMessage,
    )
    throw error
  }
}
