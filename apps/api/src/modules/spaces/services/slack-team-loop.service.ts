import { createHash } from 'node:crypto'
import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackObservationService } from '../../slack/services/slack-observation.service'
import { SlackSenderResolverService } from '../../slack/services/slack-sender-resolver.service'
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

type SlackTeamAnalysis = {
  signals: SlackTeamSignal[]
  modelCalls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  providerCostUsd: number
}

type SlackPerson = {
  id: string
  platform_id: string
  display_name: string
  relationship_kind: string
  delivery_mode: string
  person_brain_id: string | null
}

const SLACK_TEAM_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    signals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['brain_memory', 'workflow_discovery', 'unanswered_question', 'client_risk'],
          },
          target_slack_user_id: { type: 'string', nullable: true },
          target_channel_id: { type: 'string' },
          source_message_ts: { type: 'string' },
          proposed_content: { type: 'string' },
          rationale: { type: 'string' },
          brain_memory: { type: 'string', nullable: true },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
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
    private readonly observation: SlackObservationService,
    private readonly slackTools: SlackAgentToolsService,
    private readonly gemini: EmbeddingService,
    @Optional() private readonly senderResolver?: SlackSenderResolverService,
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
    const quietHoursActive = isWithinSlackTeamLoopQuietHours(new Date(), input.quietHours)
    if (input.deliveryMode === 'active' && quietHoursActive) {
      return { skipped: true, skipped_reason: 'quiet_hours' }
    }
    if (
      input.deliveryMode === 'active' &&
      (input.channelIds.length === 0 || input.personIds.length === 0)
    ) {
      return { skipped: true, skipped_reason: 'active_allowlist_required' }
    }

    const integration = await this.peopleRepo.findOrgSlackIntegration(input.supabase, input.orgId)
    if (!integration) return { skipped: true, skipped_reason: 'slack_not_connected' }
    const slackTeamId =
      typeof integration.metadata.team_id === 'string' ? integration.metadata.team_id : ''
    if (!slackTeamId) return { skipped: true, skipped_reason: 'slack_team_id_missing' }

    let people = (await this.peopleRepo.listPeople(input.supabase, input.orgId)) as SlackPerson[]
    let selectedPeople = input.personIds.length
      ? people.filter((person) => input.personIds.includes(person.id))
      : people.filter((person) => person.relationship_kind !== 'ignored')
    let peopleBySlackId = new Map(selectedPeople.map((person) => [person.platform_id, person]))

    const reconciliation = await this.observation.reconcile({
      supabase: input.supabase,
      orgId: input.orgId,
      slackTeamId,
      botToken: integration.access_token,
      channelIds: input.channelIds,
      initialLookbackMinutes: input.lookbackMinutes,
    })
    const scopeFingerprint = createHash('sha256')
      .update(
        JSON.stringify({
          channels: [...input.channelIds].sort(),
          people: [...input.personIds].sort(),
        }),
      )
      .digest('hex')
      .slice(0, 16)
    const consumerKey = `slack_team:${scopeFingerprint}`
    const pending = await this.observation.loadPendingEvents({
      supabase: input.supabase,
      orgId: input.orgId,
      slackTeamId,
      consumerKey,
      initialLookbackMinutes: input.lookbackMinutes,
      channelIds: input.channelIds,
      senderSlackUserIds: input.personIds.length > 0 ? [...peopleBySlackId.keys()] : [],
      limit: 250,
    })
    const unknownSenderIds = [
      ...new Set(
        pending.events
          .filter(
            (message) =>
              !message.is_bot &&
              Boolean(message.sender_slack_user_id) &&
              !peopleBySlackId.has(String(message.sender_slack_user_id)),
          )
          .map((message) => String(message.sender_slack_user_id)),
      ),
    ]
    if (unknownSenderIds.length > 0 && this.senderResolver && input.personIds.length === 0) {
      await this.senderResolver.resolveSlackSenders(input.supabase, {
        botToken: integration.access_token,
        userId: input.userId,
        orgId: input.orgId,
        slackUserIds: unknownSenderIds,
      })
      people = (await this.peopleRepo.listPeople(input.supabase, input.orgId)) as SlackPerson[]
      selectedPeople = people.filter((person) => person.relationship_kind !== 'ignored')
      peopleBySlackId = new Map(selectedPeople.map((person) => [person.platform_id, person]))
    }
    const observed = pending.events
      .filter(
        (message) =>
          Boolean(message.text.trim()) &&
          (message.is_bot ||
            input.personIds.length === 0 ||
            peopleBySlackId.has(String(message.sender_slack_user_id))),
      )
      .map((message) => ({
        channel_id: message.channel_id,
        channel_name: message.channel_name,
        ts: message.message_ts,
        thread_ts: message.thread_ts,
        user: message.is_bot
          ? 'PIXEL_BOT'
          : String(message.sender_slack_user_id ?? 'UNKNOWN_SENDER'),
        text: message.text.trim(),
      }))
    const pendingLastMessageTs = pending.events.reduce(
      (latest, message) =>
        Number(message.message_ts) > Number(latest) ? message.message_ts : latest,
      '',
    )

    if (observed.length === 0) {
      if (pendingLastMessageTs) {
        await this.observation.advanceConsumer({
          supabase: input.supabase,
          orgId: input.orgId,
          slackTeamId,
          consumerKey,
          lastMessageTs: pendingLastMessageTs,
        })
      }
      return {
        channels_observed: reconciliation.channelsReconciled,
        messages_observed: 0,
        proposed: 0,
        quiet_hours_active: quietHoursActive,
        slack_requests: reconciliation.historyRequests + reconciliation.threadRequests + 1,
        events_stored: reconciliation.eventsStored,
        duplicates_skipped: reconciliation.duplicatesSkipped,
      }
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
        channels_observed: reconciliation.channelsReconciled,
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

    const evidenceBySource = new Map(
      observed.map((message) => [`${message.channel_id}:${message.ts}`, message]),
    )
    const verifiedSignals = analysis.signals.flatMap((signal) => {
      const source = evidenceBySource.get(`${signal.target_channel_id}:${signal.source_message_ts}`)
      if (!source || source.user === 'PIXEL_BOT') return []
      return [{ ...signal, target_slack_user_id: source.user }]
    })
    const rejectedWithoutEvidence = analysis.signals.length - verifiedSignals.length
    const actionableSignals = verifiedSignals.filter(
      (signal) =>
        signal.kind !== 'unanswered_question' || !this.hasLaterHumanReply(signal, observed),
    )
    const suppressedByThread = verifiedSignals.length - actionableSignals.length
    let proposed = 0
    let sent = 0
    let memoriesCompounded = 0
    for (const signal of actionableSignals.slice(0, remaining)) {
      if (!this.signalMatchesLoop(signal.kind, input.loopKind)) continue
      const target = signal.target_slack_user_id
        ? peopleBySlackId.get(signal.target_slack_user_id)
        : undefined
      const internalRecipient = target?.relationship_kind === 'internal' ? target : undefined
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
      if (signal.kind === 'brain_memory' && target?.person_brain_id && signal.brain_memory) {
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

      if (
        await this.loopRepo.hasEvidenceFingerprint(input.supabase, {
          orgId: input.orgId,
          evidenceFingerprint,
        })
      ) {
        continue
      }

      const action = await this.peopleRepo.createShadowAction(input.supabase, {
        orgId: input.orgId,
        userId: input.userId,
        agentKey: 'pixel',
        targetMemberId: internalRecipient?.id ?? null,
        actionKind:
          signal.kind === 'unanswered_question' && internalRecipient ? 'message' : 'workflow',
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
          ...(target && !internalRecipient
            ? {
                internal_only: true,
                subject_member_id: target.id,
                subject_display_name: target.display_name,
                subject_relationship_kind: target.relationship_kind,
              }
            : {}),
        },
      })
      proposed += 1

      if (
        input.deliveryMode === 'active' &&
        signal.kind === 'unanswered_question' &&
        internalRecipient?.delivery_mode === 'active'
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
            slack_user_id: internalRecipient.platform_id,
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

    if (pendingLastMessageTs) {
      await this.observation.advanceConsumer({
        supabase: input.supabase,
        orgId: input.orgId,
        slackTeamId,
        consumerKey,
        lastMessageTs: pendingLastMessageTs,
      })
    }

    return {
      channels_observed: reconciliation.channelsReconciled,
      messages_observed: observed.length,
      messages_analyzed: observed.length,
      people_discovered: unknownSenderIds.length,
      signals_detected: analysis.signals.length,
      signals_rejected_missing_evidence: rejectedWithoutEvidence,
      signals_suppressed_by_thread: suppressedByThread,
      model_calls: analysis.modelCalls,
      model_input_tokens: analysis.inputTokens,
      model_output_tokens: analysis.outputTokens,
      model_total_tokens: analysis.totalTokens,
      provider_cost_usd: analysis.providerCostUsd,
      proposed,
      sent,
      memories_compounded: memoriesCompounded,
      daily_limit: input.dailyLimit,
      slack_requests: reconciliation.historyRequests + reconciliation.threadRequests + 1,
      events_stored: reconciliation.eventsStored,
      duplicates_skipped: reconciliation.duplicatesSkipped,
      quiet_hours_active: quietHoursActive,
    }
  }

  private hasLaterHumanReply(
    signal: SlackTeamSignal,
    messages: Array<{
      channel_id: string
      ts: string
      thread_ts: string | null
      user: string
    }>,
  ): boolean {
    const source = messages.find(
      (message) =>
        message.channel_id === signal.target_channel_id && message.ts === signal.source_message_ts,
    )
    if (!source) return false
    const threadTs = source.thread_ts || source.ts
    return messages.some(
      (message) =>
        message.channel_id === source.channel_id &&
        message.thread_ts === threadTs &&
        Number(message.ts) > Number(source.ts) &&
        message.user !== 'PIXEL_BOT',
    )
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
      thread_ts: string | null
      user: string
      text: string
    }>
    people: SlackPerson[]
    maxSignals: number
  }): Promise<SlackTeamAnalysis> {
    const signals: SlackTeamSignal[] = []
    let modelCalls = 0
    let inputTokens = 0
    let outputTokens = 0
    let totalTokens = 0
    let providerCostUsd = 0
    for (let offset = 0; offset < input.messages.length; offset += 250) {
      const remaining = input.maxSignals - signals.length
      if (remaining <= 0) break
      const batch = await this.analyzeBatch({
        ...input,
        messages: input.messages.slice(offset, offset + 250),
        maxSignals: remaining,
      })
      signals.push(...batch.signals)
      modelCalls += 1
      inputTokens += batch.inputTokens
      outputTokens += batch.outputTokens
      totalTokens += batch.totalTokens
      providerCostUsd += batch.providerCostUsd
    }
    return { signals, modelCalls, inputTokens, outputTokens, totalTokens, providerCostUsd }
  }

  private async analyzeBatch(input: {
    userId: string
    orgId: string
    loopKind: SlackTeamLoopKind
    instructions?: string
    messages: Array<{
      channel_id: string
      channel_name: string
      ts: string
      thread_ts: string | null
      user: string
      text: string
    }>
    people: SlackPerson[]
    maxSignals: number
  }): Promise<{
    signals: SlackTeamSignal[]
    inputTokens: number
    outputTokens: number
    totalTokens: number
    providerCostUsd: number
  }> {
    const people = new Map(input.people.map((person) => [person.platform_id, person]))
    const transcript = input.messages
      .map(
        (message) =>
          `[${message.channel_id}|#${message.channel_name}|${message.ts}|thread=${message.thread_ts || message.ts}] ${message.user === 'PIXEL_BOT' ? 'Pixel (bot)' : people.has(message.user) ? `${people.get(message.user)?.display_name} (${people.get(message.user)?.relationship_kind})` : message.user}: ${message.text.slice(0, 1200)}`,
      )
      .join('\n')
    const prompt = [
      'Analyze recent Slack messages for a proactive team agent.',
      `Requested loop: ${input.loopKind}. Return at most ${input.maxSignals} high-confidence signals.`,
      'Only use explicit evidence in the messages. Do not infer private facts or invent commitments.',
      'Pixel (bot) messages are reply context only. Never create a Person Brain fact about Pixel or target PIXEL_BOT.',
      'brain_memory: a durable fact about the named speaker that belongs in their Person Brain.',
      'workflow_discovery: a repeated manual process with a concrete automation proposal.',
      'unanswered_question: a direct question that appears unanswered in the supplied window.',
      'Messages with the same thread value are one Slack thread. A question is answered when a later human reply in that thread addresses it; never flag that as unanswered.',
      'client_risk: an explicit blocker, missed commitment, dissatisfaction, or delivery risk.',
      'Never propose messaging an external or ignored person. For a signal about them, write an internal finding for the team to review.',
      'For every signal, copy the exact channel id and source timestamp from its bracket.',
      'Return only JSON: {"signals":[{"kind":"brain_memory|workflow_discovery|unanswered_question|client_risk","target_slack_user_id":"string or null","target_channel_id":"string","source_message_ts":"string","proposed_content":"string","rationale":"string","brain_memory":"string or null","confidence":0.0}]}',
      input.instructions ? `Additional admin instructions: ${input.instructions}` : '',
      '',
      transcript,
    ]
      .filter(Boolean)
      .join('\n')
    const completion = await this.gemini.callGeminiWithUsage(
      prompt,
      undefined,
      {
        userId: input.userId,
        orgId: input.orgId,
      },
      {
        maxOutputTokens: 8192,
        responseSchema: SLACK_TEAM_ANALYSIS_SCHEMA,
        thinkingLevel: 'low',
      },
    )
    const parsed = JSON.parse(completion.text)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as SlackTeamAnalysis).signals)
    ) {
      throw new Error('Slack team observation returned invalid analysis')
    }
    return {
      signals: (parsed as { signals: SlackTeamSignal[] }).signals,
      inputTokens: completion.usage.inputTokens,
      outputTokens: completion.usage.outputTokens,
      totalTokens: completion.usage.totalTokens,
      providerCostUsd: completion.providerCostUsd,
    }
  }
}
