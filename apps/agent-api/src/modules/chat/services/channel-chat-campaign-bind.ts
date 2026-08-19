/**
 * Bind a channel (Slack) conversation's CONNECTIONS to the client campaign the
 * channel/ask resolved to — at turn start, before the agent runs (plan §11.2a).
 * The Slack side already knows the client (channel stamp, quoted channel, or a
 * client named in a DM); this makes that knowledge the conversation's campaign
 * so `search_campaign_brain` / preload land on the right Brain without a
 * model tool choice.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { isGeneralCampaignRow } from '../../brain/services/campaign-brain-preload'

export type ChannelCampaignBindResult =
  | { status: 'bound'; campaignId: string }
  | { status: 'unchanged'; campaignId: string }
  | { status: 'rejected'; reason: 'campaign_not_found' | 'wrong_org' | 'general_campaign' }

export async function bindChannelConversationCampaign(
  supabase: SupabaseClient,
  input: { conversationId: string; userId: string; orgId?: string | null; campaignId: string },
): Promise<ChannelCampaignBindResult> {
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, name, config, org_id')
    .eq('id', input.campaignId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!campaign) return { status: 'rejected', reason: 'campaign_not_found' }
  if (input.orgId && campaign.org_id && String(campaign.org_id) !== input.orgId) {
    return { status: 'rejected', reason: 'wrong_org' }
  }
  if (isGeneralCampaignRow(campaign)) return { status: 'rejected', reason: 'general_campaign' }

  const { data: conversation } = await supabase
    .from('conversations')
    .select('campaign_id')
    .eq('id', input.conversationId)
    .eq('user_id', input.userId)
    .maybeSingle()
  if (conversation?.campaign_id === input.campaignId) {
    return { status: 'unchanged', campaignId: input.campaignId }
  }
  const { error } = await supabase
    .from('conversations')
    .update({ campaign_id: input.campaignId })
    .eq('id', input.conversationId)
    .eq('user_id', input.userId)
  if (error) throw new Error(`Failed to bind channel conversation campaign: ${error.message}`)
  return { status: 'bound', campaignId: input.campaignId }
}
