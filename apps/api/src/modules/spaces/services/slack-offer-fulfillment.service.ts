import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Queue } from 'bullmq'
import { AGENT_RUNTIME_AUTOMATION_QUEUE } from '../../agent-runtime/agent-runtime-queues'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import {
  SlackPendingOffersRepository,
  type SlackPendingOffer,
} from '../repositories/slack-pending-offers.repository'

const FULFILLMENT_KINDS = new Set(['recap_brief', 'case_study', 'spend_breakdown'])

@Injectable()
export class SlackOfferFulfillmentService {
  constructor(
    private readonly offers: SlackPendingOffersRepository,
    private readonly slack: SlackAgentToolsService,
    @Optional() @InjectQueue(AGENT_RUNTIME_AUTOMATION_QUEUE) private readonly queue?: Queue,
  ) {}

  async dispatch(supabase: SupabaseClient, offerId: string): Promise<void> {
    const offer = await this.offers.findById(supabase, offerId)
    if (offer) {
      const readyBy =
        typeof offer.spec.ready_by === 'string' ? offer.spec.ready_by : 'the promised time'
      await this.post(
        supabase,
        offer,
        `On it — I’ll post the *${offer.deliverable_kind.replaceAll('_', ' ')}* here by ${readyBy}.`,
      )
    }
    if (this.shouldQueue()) {
      await this.queue!.add(
        'slack-offer-fulfillment',
        { mode: 'offer_fulfillment', offerId },
        {
          jobId: `slack-offer-${offerId}`,
          removeOnComplete: true,
          removeOnFail: { age: 7 * 24 * 3600 },
          attempts: 1,
        },
      )
      return
    }
    await this.fulfill(supabase, offerId)
  }

  async fulfill(supabase: SupabaseClient, offerId: string): Promise<void> {
    const offer = await this.offers.claimAccepted(supabase, offerId)
    if (!offer) return
    if (!FULFILLMENT_KINDS.has(offer.deliverable_kind)) {
      await this.offers.markMissed(supabase, offer.id)
      await this.post(
        supabase,
        offer,
        'I accepted this, but its deliverable type is not enabled yet. I’m not going to pretend it shipped.',
      )
      return
    }
    const evidence = await this.offers.evidence(supabase, offer)
    if (!evidence.userId || !offer.thread_channel_id || !offer.thread_ts) {
      throw new Error('Accepted Slack offer is missing its delivery thread or owner')
    }
    const artifact = this.render(offer, evidence.lines)
    const sent = await this.slack.sendMessage(supabase, evidence.userId, offer.org_id, {
      channel_id: offer.thread_channel_id,
      thread_ts: offer.thread_ts,
      text: artifact,
    })
    await this.offers.markDelivered(supabase, offer.id, String(sent.ts ?? offer.thread_ts))
  }

  async checkMissed(supabase: SupabaseClient, now = new Date()): Promise<void> {
    for (const offer of await this.offers.listPastDue(supabase, now.toISOString())) {
      if (!(await this.offers.markMissed(supabase, offer.id))) continue
      await this.post(
        supabase,
        offer,
        `Still on the *${offer.deliverable_kind.replaceAll('_', ' ')}* — the evidence pull is slower than expected. I missed the original promise, and I’ll post the finished version here rather than go quiet.`,
      )
    }
  }

  private render(offer: SlackPendingOffer, evidence: string[]): string {
    const lines = evidence.slice(0, 10).map((line) => `• ${line}`)
    const title =
      offer.deliverable_kind === 'recap_brief'
        ? '*Recap brief — spend → registrations → shows → sales*'
        : offer.deliverable_kind === 'case_study'
          ? '*Case study — setup → spend → result → what changed*'
          : '*Spend breakdown — day-by-day spend vs sales*'
    return [
      title,
      ...lines,
      '',
      '_Built from the linked Slack evidence and open-item ledger._',
    ].join('\n')
  }

  private async post(
    supabase: SupabaseClient,
    offer: SlackPendingOffer,
    text: string,
  ): Promise<void> {
    const evidence = await this.offers.evidence(supabase, offer)
    if (!evidence.userId || !offer.thread_channel_id || !offer.thread_ts) return
    await this.slack.sendMessage(supabase, evidence.userId, offer.org_id, {
      channel_id: offer.thread_channel_id,
      thread_ts: offer.thread_ts,
      text,
    })
  }

  private shouldQueue(): boolean {
    return Boolean(
      this.queue &&
      process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_ENABLED === '1' &&
      process.env.AGENT_RUNTIME_AUTOMATION_QUEUE_DISABLED !== '1' &&
      process.env.VERCEL !== '1',
    )
  }
}
