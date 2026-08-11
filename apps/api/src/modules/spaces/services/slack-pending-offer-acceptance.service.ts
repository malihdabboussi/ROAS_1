import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackRepository } from '../../slack/repositories/slack.repository'
import { SlackPendingOffersRepository } from '../repositories/slack-pending-offers.repository'
import { SlackOfferFulfillmentService } from './slack-offer-fulfillment.service'

const ACCEPT_REACTIONS = new Set(['white_check_mark', 'heavy_check_mark', '+1', 'thumbsup'])
const AFFIRMATIVE = /^(yes|yep|yeah|please|do it|go for it|sounds good|on it|✅|👍)[.!\s]*$/i

@Injectable()
export class SlackPendingOfferAcceptanceService {
  constructor(
    private readonly slack: SlackRepository,
    private readonly offers: SlackPendingOffersRepository,
    private readonly fulfillment: SlackOfferFulfillmentService,
  ) {}

  async handleReactionAdded(input: {
    supabase: SupabaseClient
    teamId: string
    channelId: string
    messageTs: string
    reaction: string
  }): Promise<boolean> {
    if (!ACCEPT_REACTIONS.has(input.reaction)) return false
    return this.accept(input.supabase, input.teamId, input.channelId, input.messageTs, 'reaction')
  }

  async handleThreadReply(input: {
    supabase: SupabaseClient
    teamId: string
    channelId: string
    threadTs: string
    text: string
  }): Promise<boolean> {
    if (!AFFIRMATIVE.test(input.text.trim())) return false
    return this.accept(
      input.supabase,
      input.teamId,
      input.channelId,
      input.threadTs,
      'thread_reply',
    )
  }

  private async accept(
    client: SupabaseClient,
    teamId: string,
    channelId: string,
    threadTs: string,
    via: 'reaction' | 'thread_reply',
  ): Promise<boolean> {
    const channel = await this.slack.findFallbackChannelByTeam(client, teamId)
    if (!channel?.org_id) return false
    const offerId = await this.offers.acceptByThread(client, {
      orgId: channel.org_id,
      channelId,
      threadTs,
      via,
    })
    if (!offerId) return false
    await this.fulfillment.dispatch(client, offerId)
    return true
  }
}
