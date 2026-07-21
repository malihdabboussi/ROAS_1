import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import { SlackApiIntegration } from '../../slack/integrations/slack-api.integration'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackTeamLoopRepository } from '../repositories/slack-team-loop.repository'

export type SlackTeamLoopKind =
  | 'brain_compounding'
  | 'workflow_discovery'
  | 'unanswered_questions'
  | 'client_risk'
  | 'all'

type QuietHours = { start: string; end: string; timezone: string }

type SlackTeamSignal = {
  kind: 'brain_memory' | 'workflow_discovery' | 'unanswered_question' | 'client_risk'
  target_slack_user_id: string | null
  target_channel_id: string
  source_message_ts: string
  proposed_content: string
  rationale: string
  brain_memory: string | null
  confidence: number
}

type SlackTeamAnalysis = { signals: SlackTeamSignal[] }

type SlackPerson = {
  id: string
  platform_id: string
  display_name: string
  relationship_kind: string
  delivery_mode: string
  person_brain_id: string | null
}

export function isWithinSlackTeamLoopQuietHours(now: Date, quietHours?: QuietHours): boolean {
  if (!quietHours) return false
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: quietHours.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  const current = hour * 60 + minute
  const parse = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number)
    return hours * 60 + minutes
  }
  const start = parse(quietHours.start)
  const end = parse(quietHours.end)
  if (start === end) return true
  return start < end ? current >= start && current < end : current >= start || current < end
}

@Injectable()
export class SlackTeamLoopService {
  constructor(
    private readonly peopleRepo: SlackPeopleRepository,
    private readonly loopRepo: SlackTeamLoopRepository,
    private readonly slackApi: SlackApiIntegration,
    private readonly slackTools: SlackAgentToolsService,
    private readonly openRouter: OpenRouterBillingClientService,
  ) {}

  async run(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string
    loopKind: SlackTeamLoopKind
    deliveryMode: 'shadow' | 'active'
    channelIds: string[]
    personIds: string[]
    lookbackMinutes: number
    dailyLimit: number
    quietHours?: QuietHours
    instructions?: string
  }): Promise<Record<string, unknown>> {
    if (isWithinSlackTeamLoopQuietHours(new Date(), input.quietHours)) {
      return { skipped: true, skipped_reason: 'quiet_hours' }
    }

    const integration = await this.peopleRepo.findOrgSlackIntegration(input.supabase, input.orgId)
    if (!integration) return { skipped: true, skipped_reason: 'slack_not_connected' }

    const people = (await this.peopleRepo.listPeople(input.supabase, input.orgId)) as SlackPerson[]
    const selectedPeople = input.personIds.length
      ? people.filter((person) => input.personIds.includes(person.id))
      : people.filter((person) => person.relationship_kind !== 'ignored')
    const peopleBySlackId = new Map(selectedPeople.map((person) => [person.platform_id, person]))

    const availableChannels = await this.slackApi.listConversations(integration.access_token)
    const channels = availableChannels.filter(
      (channel) =>
        channel.is_member !== false &&
        (input.channelIds.length === 0 || input.channelIds.includes(channel.id)),
    )
    const oldestTs = String((Date.now() - input.lookbackMinutes * 60_000) / 1000)
    const observed: Array<{
      channel_id: string
      channel_name: string
      ts: string
      user: string
      text: string
    }> = []

    for (const channel of channels) {
      const messages = await this.slackApi.getChannelHistorySince(
        integration.access_token,
        channel.id,
        oldestTs,
      )
      for (const message of messages) {
        const user = typeof message.user === 'string' ? message.user : ''
        const text = typeof message.text === 'string' ? message.text.trim() : ''
        const ts = typeof message.ts === 'string' ? message.ts : ''
        if (!user || !text || !ts || message.bot_id) continue
        if (input.personIds.length > 0 && !peopleBySlackId.has(user)) continue
        observed.push({ channel_id: channel.id, channel_name: channel.name, ts, user, text })
      }
    }

    if (observed.length === 0) {
      return { channels_observed: channels.length, messages_observed: 0, proposed: 0 }
    }

    const workflowKey = `slack_team:${input.loopKind}`
    const dayStart = new Date()
    dayStart.setUTCHours(0, 0, 0, 0)
    const usedToday = await this.loopRepo.countActionsSince(input.supabase, {
      orgId: input.orgId,
      workflowKey,
      since: dayStart.toISOString(),
    })
    const remaining = Math.max(0, input.dailyLimit - usedToday)
    if (remaining === 0) {
      return {
        channels_observed: channels.length,
        messages_observed: observed.length,
        skipped: true,
        skipped_reason: 'daily_limit',
      }
    }

    const analysis = await this.analyze({
      userId: input.userId,
      orgId: input.orgId,
      loopKind: input.loopKind,
      instructions: input.instructions,
      messages: observed,
      people: selectedPeople,
      maxSignals: remaining,
    })

    let proposed = 0
    let sent = 0
    let memoriesCompounded = 0
    for (const signal of analysis.signals.slice(0, remaining)) {
      if (!this.signalMatchesLoop(signal.kind, input.loopKind)) continue
      const target = signal.target_slack_user_id
        ? peopleBySlackId.get(signal.target_slack_user_id)
        : undefined
      const evidenceFingerprint = createHash('sha256')
        .update(
          [
            input.orgId,
            input.loopKind,
            signal.kind,
            signal.target_channel_id,
            signal.source_message_ts,
          ].join(':'),
        )
        .digest('hex')
      if (
        await this.loopRepo.hasEvidenceFingerprint(input.supabase, {
          orgId: input.orgId,
          evidenceFingerprint,
        })
      ) {
        continue
      }

      if (
        signal.kind === 'brain_memory' &&
        input.deliveryMode === 'active' &&
        target?.person_brain_id &&
        signal.brain_memory
      ) {
        const result = await this.loopRepo.insertPersonMemory(input.supabase, {
          brainId: target.person_brain_id,
          content: signal.brain_memory,
          speaker: target.display_name,
          sourceChannelId: signal.target_channel_id,
          sourceMessageTs: signal.source_message_ts,
          confidence: signal.confidence,
          metadata: {
            source: 'slack_team_loop',
            evidence_fingerprint: evidenceFingerprint,
            rationale: signal.rationale,
          },
        })
        if (result.created) memoriesCompounded += 1
        continue
      }

      const action = await this.peopleRepo.createShadowAction(input.supabase, {
        orgId: input.orgId,
        userId: input.userId,
        agentKey: 'pixel',
        targetMemberId: target?.id ?? null,
        actionKind: signal.kind === 'unanswered_question' ? 'message' : 'workflow',
        proposedContent: signal.proposed_content,
        rationale: signal.rationale,
        sourceChannelId: signal.target_channel_id,
        sourceMessageTs: signal.source_message_ts,
        workflowKey,
        metadata: {
          loop_kind: input.loopKind,
          signal_kind: signal.kind,
          confidence: signal.confidence,
          evidence_fingerprint: evidenceFingerprint,
          delivery_mode: input.deliveryMode,
        },
      })
      proposed += 1

      if (
        input.deliveryMode === 'active' &&
        signal.kind === 'unanswered_question' &&
        target?.delivery_mode === 'active'
      ) {
        const approved = await this.peopleRepo.reviewShadowAction(input.supabase, {
          actionId: action.id,
          orgId: input.orgId,
          reviewedBy: input.userId,
          status: 'approved',
        })
        if (!approved) throw new Error('Active Slack loop proposal could not be approved')
        const claimed = await this.peopleRepo.claimShadowActionForSend(
          input.supabase,
          input.orgId,
          action.id,
        )
        if (!claimed) throw new Error('Active Slack loop proposal could not be claimed')
        try {
          const dm = await this.slackTools.openDm(input.supabase, input.userId, input.orgId, {
            slack_user_id: target.platform_id,
          })
          const delivery = await this.slackTools.sendMessage(
            input.supabase,
            input.userId,
            input.orgId,
            {
              channel_id: String(dm.channel_id),
              text: signal.proposed_content,
            },
          )
          await this.peopleRepo.markShadowActionSent(input.supabase, {
            actionId: action.id,
            orgId: input.orgId,
            sentBy: input.userId,
            slackTs: typeof delivery.ts === 'string' ? delivery.ts : null,
            metadata: action.metadata,
          })
        } catch (cause) {
          await this.peopleRepo.markShadowActionFailed(input.supabase, input.orgId, action.id)
          throw cause
        }
        sent += 1
      }
    }

    return {
      channels_observed: channels.length,
      messages_observed: observed.length,
      signals_detected: analysis.signals.length,
      proposed,
      sent,
      memories_compounded: memoriesCompounded,
      daily_limit: input.dailyLimit,
    }
  }

  private signalMatchesLoop(kind: SlackTeamSignal['kind'], loopKind: SlackTeamLoopKind): boolean {
    if (loopKind === 'all') return true
    if (loopKind === 'brain_compounding') return kind === 'brain_memory'
    if (loopKind === 'unanswered_questions') return kind === 'unanswered_question'
    return kind === loopKind
  }

  private async analyze(input: {
    userId: string
    orgId: string
    loopKind: SlackTeamLoopKind
    instructions?: string
    messages: Array<{
      channel_id: string
      channel_name: string
      ts: string
      user: string
      text: string
    }>
    people: SlackPerson[]
    maxSignals: number
  }): Promise<SlackTeamAnalysis> {
    const people = new Map(input.people.map((person) => [person.platform_id, person.display_name]))
    const transcript = input.messages
      .slice(0, 300)
      .map(
        (message) =>
          `[${message.channel_id}|#${message.channel_name}|${message.ts}] ${people.get(message.user) ?? message.user}: ${message.text.slice(0, 1200)}`,
      )
      .join('\n')
    const completion = await this.openRouter.createChatCompletion({
      owner: { userId: input.userId, orgId: input.orgId },
      feature: 'slack_team_loops',
      action: input.loopKind,
      sourcePath: 'spaces/slack-team-loop',
      model: 'anthropic/claude-sonnet-4.6',
      body: {
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: [
              'Analyze recent Slack messages for a proactive team agent.',
              `Requested loop: ${input.loopKind}. Return at most ${input.maxSignals} high-confidence signals.`,
              'Only use explicit evidence in the messages. Do not infer private facts or invent commitments.',
              'brain_memory: a durable fact about the named speaker that belongs in their Person Brain.',
              'workflow_discovery: a repeated manual process with a concrete automation proposal.',
              'unanswered_question: a direct question that appears unanswered in the supplied window.',
              'client_risk: an explicit blocker, missed commitment, dissatisfaction, or delivery risk.',
              'For every signal, copy the exact channel id and source timestamp from its bracket.',
              input.instructions ? `Additional admin instructions: ${input.instructions}` : '',
              '',
              transcript,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'slack_team_observation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                signals: {
                  type: 'array',
                  maxItems: input.maxSignals,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      kind: {
                        type: 'string',
                        enum: [
                          'brain_memory',
                          'workflow_discovery',
                          'unanswered_question',
                          'client_risk',
                        ],
                      },
                      target_slack_user_id: { type: ['string', 'null'] },
                      target_channel_id: { type: 'string' },
                      source_message_ts: { type: 'string' },
                      proposed_content: { type: 'string' },
                      rationale: { type: 'string' },
                      brain_memory: { type: ['string', 'null'] },
                      confidence: { type: 'number' },
                    },
                    required: [
                      'kind',
                      'target_slack_user_id',
                      'target_channel_id',
                      'source_message_ts',
                      'proposed_content',
                      'rationale',
                      'brain_memory',
                      'confidence',
                    ],
                  },
                },
              },
              required: ['signals'],
            },
          },
        },
      },
      metadata: { messages_observed: input.messages.length },
    })
    const content = completion.data.choices?.[0]?.message?.content
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as SlackTeamAnalysis).signals)
    ) {
      throw new Error('Slack team observation returned invalid analysis')
    }
    return parsed as SlackTeamAnalysis
  }
}
