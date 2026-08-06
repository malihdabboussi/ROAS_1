import { createHash } from 'node:crypto'
import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { EmbeddingService } from '../../brain/services/embedding.service'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackSignalTrainingRepository } from '../../slack/repositories/slack-signal-training.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackObservationService } from '../../slack/services/slack-observation.service'
import { SlackSenderResolverService } from '../../slack/services/slack-sender-resolver.service'
import { SlackTeamLoopRepository } from '../repositories/slack-team-loop.repository'
import {
  analyzeSlackTeamMessages,
  selectSlackTeamBriefingSignals,
  type SlackTeamPerson,
  type SlackTeamSignal,
} from './slack-team-loop-analysis'
import {
  resolveSlackIdentityText,
  slackSignalHasLaterHumanReply,
  slackSignalMatchesLoop,
  slackTeamEvidenceMetadata,
} from './slack-team-loop-evidence'
import {
  personalMomentDateKey,
  personalMomentDedupeKey,
  validatePersonalMomentEvidence,
} from './slack-team-personal-moment'
import { proposePersonalMomentAction } from './slack-team-personal-moment-propose'
import {
  slackSignalLifecycleMetadata,
  SlackTeamSignalDeliveryService,
} from './slack-team-signal-delivery.service'
import { composeInternalEscalation } from './slack-team-signal-message'

export type SlackTeamLoopKind =
  | 'brain_compounding'
  | 'workflow_discovery'
  | 'unanswered_questions'
  | 'client_risk'
  | 'all'

type QuietHours = { start: string; end: string; timezone: string }

const OWNER_BRIEFING_SIGNAL_KINDS = new Set<SlackTeamSignal['kind']>([
  'team_win',
  'important_update',
  'decision',
  'strategic_opportunity',
])

function internalEscalationMessage(input: {
  subject: SlackTeamPerson
  channelName: string
  signal: SlackTeamSignal
  recipientName?: string
}): string {
  return composeInternalEscalation(
    {
      subjectName: input.subject.display_name,
      channelName: input.channelName,
      kind: input.signal.kind,
      finding: input.signal.proposed_content.trim(),
    },
    { recipientName: input.recipientName },
  )
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
    private readonly senderResolver: SlackSenderResolverService,
    @Optional() private readonly trainingRules?: SlackSignalTrainingRepository,
    @Optional() private readonly signalDelivery?: SlackTeamSignalDeliveryService,
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
    const workflowKey = `slack_team:${input.loopKind}`

    let people = (await this.peopleRepo.listPeople(
      input.supabase,
      input.orgId,
    )) as SlackTeamPerson[]
    let selectedPeople = input.personIds.length
      ? people.filter((person) => input.personIds.includes(person.id))
      : people.filter((person) => person.relationship_kind !== 'ignored')
    let peopleBySlackId = new Map(selectedPeople.map((person) => [person.platform_id, person]))
    const lifecycle = (await this.signalDelivery?.processCoolingActions({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      workflowKey,
      deliveryMode: input.deliveryMode,
      personIds: input.personIds,
      quietHoursActive,
      people,
    })) ?? { rechecked: 0, resolved: 0, sent: 0 }

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
    if (unknownSenderIds.length > 0 && input.personIds.length === 0) {
      await this.senderResolver.resolveSlackSenders(input.supabase, {
        botToken: integration.access_token,
        userId: input.userId,
        orgId: input.orgId,
        slackUserIds: unknownSenderIds,
      })
      people = (await this.peopleRepo.listPeople(input.supabase, input.orgId)) as SlackTeamPerson[]
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
        signals_rechecked: lifecycle.rechecked,
        signals_resolved_before_delivery: lifecycle.resolved,
        sent: lifecycle.sent,
        quiet_hours_active: quietHoursActive,
        slack_requests: reconciliation.historyRequests + reconciliation.threadRequests + 1,
        events_stored: reconciliation.eventsStored,
        duplicates_skipped: reconciliation.duplicatesSkipped,
      }
    }

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

    const savedRules = this.trainingRules
      ? await this.trainingRules.listEnabledRules(input.supabase, input.orgId)
      : []
    const workspaceOwner = people.find(
      (person) => person.vibey_user_id === input.userId && person.relationship_kind === 'internal',
    )
    const analysis = await analyzeSlackTeamMessages({
      gemini: this.gemini,
      userId: input.userId,
      orgId: input.orgId,
      loopKind: input.loopKind,
      instructions: [
        input.instructions,
        savedRules.length
          ? `Learned admin playbook:\n${savedRules.map((rule) => `- ${rule.instruction}`).join('\n')}`
          : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
      messages: observed,
      people: selectedPeople,
      maxSignals: remaining,
      ...(workspaceOwner
        ? {
            briefingRecipient: {
              displayName: workspaceOwner.display_name,
              role: 'workspace owner',
            },
          }
        : {}),
    })

    const evidenceBySource = new Map(
      observed.map((message) => [`${message.channel_id}:${message.ts}`, message]),
    )
    const verifiedSignals = analysis.signals.flatMap((signal) => {
      const source = evidenceBySource.get(`${signal.target_channel_id}:${signal.source_message_ts}`)
      if (!source || source.user === 'PIXEL_BOT') return []
      const personalSubject =
        signal.kind === 'personal_moment' && signal.target_slack_user_id?.trim()
          ? signal.target_slack_user_id.trim()
          : null
      return [
        {
          ...signal,
          target_slack_user_id:
            OWNER_BRIEFING_SIGNAL_KINDS.has(signal.kind) && workspaceOwner
              ? workspaceOwner.platform_id
              : (personalSubject ?? source.user),
        },
      ]
    })
    const rejectedWithoutEvidence = analysis.signals.length - verifiedSignals.length
    const confidentSignals = verifiedSignals.filter((signal) => signal.confidence >= 0.8)
    const rejectedLowConfidence = verifiedSignals.length - confidentSignals.length
    const threadCheckedSignals = confidentSignals.filter(
      (signal) =>
        signal.kind !== 'unanswered_question' || !slackSignalHasLaterHumanReply(signal, observed),
    )
    const suppressedByThread = confidentSignals.length - threadCheckedSignals.length
    const memories = threadCheckedSignals.filter((signal) => signal.kind === 'brain_memory')
    const personalMomentCandidates = threadCheckedSignals.filter(
      (signal) => signal.kind === 'personal_moment',
    )
    const briefingCandidates = threadCheckedSignals.filter(
      (signal) => signal.kind !== 'brain_memory' && signal.kind !== 'personal_moment',
    )
    const selectedBriefing = selectSlackTeamBriefingSignals(briefingCandidates)
    const validatedPersonalMoments = personalMomentCandidates.flatMap((signal) => {
      const subject = signal.target_slack_user_id
        ? peopleBySlackId.get(signal.target_slack_user_id)
        : undefined
      const subjectNames = subject
        ? [subject.display_name, subject.display_name.split(/\s+/)[0] || ''].filter(Boolean)
        : []
      const validated = validatePersonalMomentEvidence({
        signal,
        messages: observed,
        subjectNames,
        peopleBySlackId,
      })
      if (!validated.ok) return []
      return [{ signal: { ...signal, confidence: validated.confidence }, validated }]
    })
    const suppressedPersonalMoments =
      personalMomentCandidates.length - validatedPersonalMoments.length
    const actionableSignals = [
      ...memories,
      ...selectedBriefing,
      ...validatedPersonalMoments.map((entry) => entry.signal),
    ]
    const suppressedByBriefing = briefingCandidates.length - selectedBriefing.length
    let proposed = 0
    let memoriesCompounded = 0
    for (const signal of actionableSignals.slice(0, remaining)) {
      if (!slackSignalMatchesLoop(signal.kind, input.loopKind)) continue
      const source = evidenceBySource.get(`${signal.target_channel_id}:${signal.source_message_ts}`)
      if (!source) continue
      const target = signal.target_slack_user_id
        ? peopleBySlackId.get(signal.target_slack_user_id)
        : undefined
      const internalRecipient = target?.relationship_kind === 'internal' ? target : undefined
      const personalValidated =
        signal.kind === 'personal_moment'
          ? validatedPersonalMoments.find(
              (entry) =>
                entry.signal.target_channel_id === signal.target_channel_id &&
                entry.signal.source_message_ts === signal.source_message_ts &&
                entry.signal.target_slack_user_id === signal.target_slack_user_id,
            )?.validated
          : undefined
      const evidenceFingerprint =
        signal.kind === 'personal_moment' && personalValidated && personalValidated.ok
          ? personalMomentDedupeKey({
              orgId: input.orgId,
              subjectSlackUserId: personalValidated.subjectSlackUserId,
              eventType: personalValidated.eventType,
              dateKey: personalMomentDateKey(new Date()),
            })
          : createHash('sha256')
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

      if (signal.kind === 'personal_moment') {
        if (!personalValidated?.ok || !internalRecipient) continue
        await proposePersonalMomentAction({
          supabase: input.supabase,
          userId: input.userId,
          orgId: input.orgId,
          workflowKey,
          loopKind: input.loopKind,
          deliveryMode: input.deliveryMode,
          slackTeamId,
          evidenceFingerprint,
          signal,
          source,
          internalRecipient,
          validated: personalValidated,
          observed,
          peopleBySlackId,
          searchMessages: (supabase, userId, orgId, params) =>
            this.slackTools.searchMessages(supabase, userId, orgId, params),
          createShadowAction: (supabase, payload) =>
            this.peopleRepo.createShadowAction(supabase, payload as never),
        })
        proposed += 1
        continue
      }

      const action = await this.peopleRepo.createShadowAction(input.supabase, {
        orgId: input.orgId,
        userId: input.userId,
        agentKey: 'pixel',
        targetMemberId: internalRecipient?.id ?? null,
        actionKind:
          internalRecipient &&
          (signal.kind === 'unanswered_question' || OWNER_BRIEFING_SIGNAL_KINDS.has(signal.kind))
            ? 'message'
            : 'workflow',
        proposedContent: resolveSlackIdentityText(signal.proposed_content, peopleBySlackId),
        rationale: resolveSlackIdentityText(signal.rationale, peopleBySlackId),
        sourceChannelId: signal.target_channel_id,
        sourceMessageTs: signal.source_message_ts,
        workflowKey,
        metadata: {
          loop_kind: input.loopKind,
          signal_kind: signal.kind,
          signal_finding: resolveSlackIdentityText(signal.proposed_content, peopleBySlackId),
          confidence: signal.confidence,
          evidence_fingerprint: evidenceFingerprint,
          delivery_mode: input.deliveryMode,
          ...slackSignalLifecycleMetadata(signal.kind),
          ...slackTeamEvidenceMetadata({ source, slackTeamId, peopleBySlackId }),
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
        signal.kind !== 'brain_memory' &&
        target &&
        !internalRecipient &&
        workspaceOwner &&
        proposed < remaining
      ) {
        const internalContent = internalEscalationMessage({
          subject: target,
          channelName: source.channel_name,
          signal,
          recipientName: workspaceOwner.display_name,
        })
        await this.peopleRepo.createShadowAction(input.supabase, {
          orgId: input.orgId,
          userId: input.userId,
          agentKey: 'pixel',
          targetMemberId: workspaceOwner.id,
          actionKind: 'message',
          proposedContent: resolveSlackIdentityText(internalContent, peopleBySlackId),
          rationale: `Internal follow-up for a ${target.relationship_kind} Slack signal. Pixel will not message ${target.display_name}.`,
          sourceChannelId: signal.target_channel_id,
          sourceMessageTs: signal.source_message_ts,
          workflowKey,
          metadata: {
            loop_kind: input.loopKind,
            signal_kind: signal.kind,
            signal_finding: resolveSlackIdentityText(signal.proposed_content, peopleBySlackId),
            confidence: signal.confidence,
            evidence_fingerprint: `${evidenceFingerprint}:internal`,
            delivery_mode: input.deliveryMode,
            ...slackSignalLifecycleMetadata(signal.kind),
            internal_only: true,
            parent_signal_id: action.id,
            subject_member_id: target.id,
            subject_display_name: target.display_name,
            subject_relationship_kind: target.relationship_kind,
            ...slackTeamEvidenceMetadata({ source, slackTeamId, peopleBySlackId }),
          },
        })
        proposed += 1
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
      signals_rejected_low_confidence: rejectedLowConfidence,
      signals_suppressed_by_thread: suppressedByThread,
      signals_suppressed_by_briefing: suppressedByBriefing,
      personal_moments_detected: personalMomentCandidates.length,
      personal_moments_validated: validatedPersonalMoments.length,
      personal_moments_suppressed: suppressedPersonalMoments,
      model_calls: analysis.modelCalls,
      model_input_tokens: analysis.inputTokens,
      model_output_tokens: analysis.outputTokens,
      model_total_tokens: analysis.totalTokens,
      provider_cost_usd: analysis.providerCostUsd,
      proposed,
      signals_rechecked: lifecycle.rechecked,
      signals_resolved_before_delivery: lifecycle.resolved,
      sent: lifecycle.sent,
      memories_compounded: memoriesCompounded,
      daily_limit: input.dailyLimit,
      slack_requests: reconciliation.historyRequests + reconciliation.threadRequests + 1,
      events_stored: reconciliation.eventsStored,
      duplicates_skipped: reconciliation.duplicatesSkipped,
      quiet_hours_active: quietHoursActive,
    }
  }
}
