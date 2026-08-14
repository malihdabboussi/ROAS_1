import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackPendingOffersRepository } from '../repositories/slack-pending-offers.repository'
import { SlackOpenItemsService } from './slack-open-items.service'
import type { SlackTeamComposerOffer } from './slack-team-message-composer.service'

@Injectable()
export class SlackPendingOffersService {
  constructor(
    private readonly offers: SlackPendingOffersRepository,
    @Optional() private readonly cases?: SlackOpenItemsService,
  ) {}

  async record(
    supabase: SupabaseClient,
    input: {
      orgId: string
      recipientPersonId: string
      shadowActionId: string
      channelId: string
      threadTs: string | null
      offer: SlackTeamComposerOffer
      now?: Date
    },
  ): Promise<void> {
    const now = input.now ?? new Date()
    const explicitPromise = Date.parse(input.offer.ready_by)
    const promisedBy = Number.isFinite(explicitPromise)
      ? new Date(explicitPromise)
      : new Date(now.getTime() + 24 * 60 * 60_000)
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
      promised_by: promisedBy.toISOString(),
    })
    await this.cases?.recordExternal(supabase, {
      orgId: input.orgId,
      caseType: 'offer',
      sourceType: 'slack_offer',
      sourceKey: input.shadowActionId,
      summary: input.offer.deliverable,
      severity: 'normal',
      dueAt: promisedBy.toISOString(),
      sourceChannelId: input.channelId,
      sourceMessageTs: input.threadTs,
      metadata: {
        recipient_person_id: input.recipientPersonId,
        shadow_action_id: input.shadowActionId,
        thread_channel_id: input.channelId,
        thread_ts: input.threadTs,
        deliverable_kind: input.offer.kind,
      },
      now,
    })
    await this.offers.expire(
      supabase,
      input.orgId,
      new Date(now.getTime() - 72 * 60 * 60_000).toISOString(),
    )
  }
}
