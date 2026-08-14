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
import type { SlackCadenceConfig } from './slack-team-cadence'
import {
  analyzeSlackTeamMessages,
  selectSlackTeamBriefingSignals,
  type SlackTeamPerson,
  type SlackTeamSignal,
} from './slack-team-loop-analysis'
import { formatSlackObservationText } from './slack-team-loop-context'
import { slackSignalHasLaterHumanReply } from './slack-team-loop-evidence'
import { slackTeamLimitDayStartIso } from './slack-team-loop-time'
import { validatePersonalMomentEvidence } from './slack-team-personal-moment'
import { SlackTeamSignalDeliveryService } from './slack-team-signal-delivery.service'
import { SlackTeamSignalRoutingService } from './slack-team-signal-routing.service'

export type SlackTeamLoopKind =
  | 'brain_compounding'
  | 'workflow_discovery'
  | 'unanswered_questions'
  | 'client_risk'
  | 'all'

type QuietHours = { start: string; end: string; timezone: string }

export const OWNER_BRIEFING_SIGNAL_KINDS = new Set<SlackTeamSignal['kind']>([
  'team_win',
  'important_update',
  'decision',
  'strategic_opportunity',
])

const MAX_DETECTED_SIGNALS_PER_RUN = 40

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
    @Optional() private readonly signalRouting?: SlackTeamSignalRoutingService,
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
    automationTimezone?: string
    preview?: boolean
    quietHours?: QuietHours
    instructions?: string
    cadence?: SlackCadenceConfig
  }): Promise<Record<string, unknown>> {
    const now = new Date()
    const quietHoursActive = isWithinSlackTeamLoopQuietHours(now, input.quietHours)
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
    const lifecycle = input.preview
      ? { rechecked: 0, resolved: 0, sent: 0 }
      : ((await this.signalDelivery?.processCoolingActions({
          supabase: input.supabase,
          userId: input.userId,
          orgId: input.orgId,
          workflowKey,
          deliveryMode: input.deliveryMode,
          personIds: input.personIds,
          quietHoursActive,
          people,
          timezone: input.automationTimezone ?? input.quietHours?.timezone,
          cadence: input.cadence,
        })) ?? { rechecked: 0, resolved: 0, sent: 0 })

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
    const consumerKey = `slack_team:${scopeFingerprint}${input.preview ? ':preview' : ''}`
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
        text: formatSlackObservationText(message),
        metadata: message.metadata ?? {},
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

    const usedToday = input.preview
      ? 0
      : await this.loopRepo.countActionsSince(input.supabase, {
          orgId: input.orgId,
          workflowKey,
          since: slackTeamLimitDayStartIso(
            now,
            input.automationTimezone ?? input.quietHours?.timezone ?? 'America/Los_Angeles',
          ),
        })
    const remaining = Math.max(0, input.dailyLimit - usedToday)
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
      maxSignals: MAX_DETECTED_SIGNALS_PER_RUN,
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
    const routing =
      this.signalRouting ??
      new SlackTeamSignalRoutingService(this.peopleRepo, this.loopRepo, this.slackTools)
    const { proposed, memoriesCompounded } = await routing.route({
      supabase: input.supabase,
      userId: input.userId,
      orgId: input.orgId,
      loopKind: input.loopKind,
      deliveryMode: input.deliveryMode,
      slackTeamId,
      preview: input.preview,
      now,
      timezone: input.automationTimezone ?? input.quietHours?.timezone,
      cadence: input.cadence,
      remaining,
      signals: actionableSignals,
      caseSignals: threadCheckedSignals,
      validatedPersonalMoments,
      evidenceBySource,
      observed,
      peopleBySlackId,
      workspaceOwner,
    })
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
      delivery_limit_reached: remaining === 0,
      slack_requests: reconciliation.historyRequests + reconciliation.threadRequests + 1,
      events_stored: reconciliation.eventsStored,
      duplicates_skipped: reconciliation.duplicatesSkipped,
      quiet_hours_active: quietHoursActive,
    }
  }
}
