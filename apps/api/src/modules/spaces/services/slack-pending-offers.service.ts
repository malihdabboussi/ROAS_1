import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackPendingOffersRepository } from '../repositories/slack-pending-offers.repository'
import type { SlackTeamComposerOffer } from './slack-team-message-composer.service'

@Injectable()
export class SlackPendingOffersService {
  constructor(private readonly offers: SlackPendingOffersRepository) {}

  async record(
    supabase: SupabaseClient,
    input: {
      orgId: string
      recipientPersonId: string
      shadowActionId: string
      channelId: string
      threadTs: string | null
      offer: SlackTeamComposerOffer
    },
  ): Promise<void> {
    await this.offers.create(supabase, {
      org_id: input.orgId,
      recipient_person_id: input.recipientPersonId,
      shadow_action_id: input.shadowActionId,
      thread_channel_id: input.channelId,
      thread_ts: input.threadTs,
      deliverable_kind: input.offer.kind,
      spec: {
        deliverable: input.offer.deliverable,
        ready_by: input.offer.ready_by,
        promise_by: input.offer.ready_by,
      },
    })
    await this.offers.expire(
      supabase,
      input.orgId,
      new Date(Date.now() - 72 * 60 * 60_000).toISOString(),
    )
  }
}
