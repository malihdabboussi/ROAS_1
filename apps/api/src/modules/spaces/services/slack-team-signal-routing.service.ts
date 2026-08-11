import { createHash } from 'node:crypto'
import { Injectable, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { SlackAgentToolsService } from '../../slack/services/slack-agent-tools.service'
import { SlackTeamLoopRepository } from '../repositories/slack-team-loop.repository'
import type { SlackTeamPerson, SlackTeamSignal } from './slack-team-loop-analysis'
import {
  resolveSlackIdentityText,
  slackSignalMatchesLoop,
  slackTeamEvidenceMetadata,
} from './slack-team-loop-evidence'
import type { SlackTeamLoopKind } from './slack-team-loop.service'
import {
  personalMomentDateKey,
  personalMomentDedupeKey,
  validatePersonalMomentEvidence,
} from './slack-team-personal-moment'
import { proposePersonalMomentAction } from './slack-team-personal-moment-propose'
import { slackSignalLifecycleMetadata } from './slack-team-signal-delivery.service'
import { composeInternalEscalation } from './slack-team-signal-message'
import { SlackTeamMessageComposerService } from './slack-team-message-composer.service'

const OWNER_BRIEFING_SIGNAL_KINDS = new Set<SlackTeamSignal['kind']>([
  'team_win',
  'important_update',
  'decision',
  'strategic_opportunity',
])

type ObservedMessage = {
  channel_id: string
  channel_name: string
  ts: string
  thread_ts: string | null
  user: string
  text: string
}

type ValidatedPersonalMoment = {
  signal: SlackTeamSignal
  validated: Extract<ReturnType<typeof validatePersonalMomentEvidence>, { ok: true }>
}

@Injectable()
export class SlackTeamSignalRoutingService {
  constructor(
    private readonly people: SlackPeopleRepository,
    private readonly loops: SlackTeamLoopRepository,
    private readonly slackTools: SlackAgentToolsService,
    @Optional() private readonly composer?: SlackTeamMessageComposerService,
  ) {}

  async route(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string
    loopKind: SlackTeamLoopKind
    deliveryMode: 'shadow' | 'active'
    slackTeamId: string
    preview?: boolean
    now: Date
    timezone?: string
    remaining: number
    signals: SlackTeamSignal[]
    validatedPersonalMoments: ValidatedPersonalMoment[]
    evidenceBySource: Map<string, ObservedMessage>
    observed: ObservedMessage[]
    peopleBySlackId: Map<string, SlackTeamPerson>
    workspaceOwner?: SlackTeamPerson
  }): Promise<{ proposed: number; memoriesCompounded: number }> {
    const workflowKey = `slack_team:${input.loopKind}`
    let proposed = 0
    let memoriesCompounded = 0

    for (const signal of input.signals.slice(0, input.remaining)) {
      if (!slackSignalMatchesLoop(signal.kind, input.loopKind)) continue
      const source = input.evidenceBySource.get(
        `${signal.target_channel_id}:${signal.source_message_ts}`,
      )
      if (!source) continue
      const target = signal.target_slack_user_id
        ? input.peopleBySlackId.get(signal.target_slack_user_id)
        : undefined
      const internalRecipient = target?.relationship_kind === 'internal' ? target : undefined
      const personalValidated =
        signal.kind === 'personal_moment'
          ? input.validatedPersonalMoments.find(
              (entry) =>
                entry.signal.target_channel_id === signal.target_channel_id &&
                entry.signal.source_message_ts === signal.source_message_ts &&
                entry.signal.target_slack_user_id === signal.target_slack_user_id,
            )?.validated
          : undefined
      const evidenceFingerprint = this.evidenceFingerprint({
        orgId: input.orgId,
        loopKind: input.loopKind,
        signal,
        personalValidated,
        now: input.now,
      })
      const actionEvidenceFingerprint = input.preview
        ? `${evidenceFingerprint}:preview`
        : evidenceFingerprint

      if (signal.kind === 'brain_memory' && target?.person_brain_id && signal.brain_memory) {
        if (input.preview) continue
        const result = await this.loops.insertPersonMemory(input.supabase, {
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
        await this.loops.hasEvidenceFingerprint(input.supabase, {
          orgId: input.orgId,
          evidenceFingerprint: actionEvidenceFingerprint,
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
          slackTeamId: input.slackTeamId,
          evidenceFingerprint: actionEvidenceFingerprint,
          preview: input.preview,
          signal,
          source,
          internalRecipient,
          validated: personalValidated,
          observed: input.observed,
          peopleBySlackId: input.peopleBySlackId,
          searchMessages: (supabase, userId, orgId, params) =>
            this.slackTools.searchMessages(supabase, userId, orgId, params),
          createShadowAction: (supabase, payload) =>
            this.people.createShadowAction(supabase, payload as never),
          now: input.now,
          timezone: input.timezone,
          ...(this.composer
            ? {
                composePersonalMoment: async ({ finding, evidence, eventType, belated }) => {
                  const composition = await this.composer!.compose({
                    userId: input.userId,
                    orgId: input.orgId,
                    recipient: {
                      name: internalRecipient.display_name,
                      relationship: internalRecipient.relationship_kind,
                    },
                    signals: evidence.slice(0, 2).map((message) => ({
                      kind: 'personal_moment',
                      finding,
                      quote: message.text,
                      senderName:
                        input.peopleBySlackId.get(message.user)?.display_name ?? message.user,
                      channelName: message.channel_name,
                      timestamp: message.ts,
                    })),
                    continuity: [],
                    context: {
                      now: input.now,
                      timezone: input.timezone ?? 'America/Los_Angeles',
                      threadFollowUp: false,
                      personalMoment: { eventType, belated },
                    },
                  })
                  return { text: composition.text, usage: composition.usage }
                },
              }
            : {}),
        })
        proposed += 1
        continue
      }

      const actionKind =
        internalRecipient &&
        (signal.kind === 'unanswered_question' || OWNER_BRIEFING_SIGNAL_KINDS.has(signal.kind))
          ? 'message'
          : 'workflow'
      const fallbackContent = resolveSlackIdentityText(
        signal.proposed_content,
        input.peopleBySlackId,
      )
      let proposedContent = fallbackContent
      let compositionMetadata: Record<string, unknown> = {}
      if (actionKind === 'message' && internalRecipient && this.composer) {
        try {
          const composition = await this.composer.compose({
            userId: input.userId,
            orgId: input.orgId,
            recipient: {
              name: internalRecipient.display_name,
              relationship: internalRecipient.relationship_kind,
            },
            signals: [
              {
                kind: signal.kind,
                finding: fallbackContent,
                quote: source.text,
                senderName: input.peopleBySlackId.get(source.user)?.display_name ?? source.user,
                channelName: source.channel_name,
                timestamp: source.ts,
              },
            ],
            continuity: [],
            context: {
              now: input.now,
              timezone: input.timezone ?? 'America/Los_Angeles',
              threadFollowUp: false,
            },
          })
          proposedContent = composition.text
          compositionMetadata = {
            composition_offers: composition.offers,
            composition_usage: composition.usage,
          }
        } catch {
          compositionMetadata = { composition_fallback: true }
        }
      }
      const action = await this.people.createShadowAction(input.supabase, {
        orgId: input.orgId,
        userId: input.userId,
        agentKey: 'pixel',
        targetMemberId: internalRecipient?.id ?? null,
        actionKind,
        proposedContent,
        rationale: resolveSlackIdentityText(signal.rationale, input.peopleBySlackId),
        sourceChannelId: signal.target_channel_id,
        sourceMessageTs: signal.source_message_ts,
        workflowKey,
        metadata: {
          loop_kind: input.loopKind,
          signal_kind: signal.kind,
          signal_finding: resolveSlackIdentityText(signal.proposed_content, input.peopleBySlackId),
          confidence: signal.confidence,
          evidence_fingerprint: actionEvidenceFingerprint,
          delivery_mode: input.deliveryMode,
          ...(input.preview ? { preview: true, preview_badge: 'Preview' } : {}),
          ...slackSignalLifecycleMetadata(signal.kind),
          ...slackTeamEvidenceMetadata({
            source,
            slackTeamId: input.slackTeamId,
            peopleBySlackId: input.peopleBySlackId,
          }),
          ...compositionMetadata,
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

      if (target && !internalRecipient && input.workspaceOwner && proposed < input.remaining) {
        await this.createInternalEscalation({
          ...input,
          workflowKey,
          evidenceFingerprint,
          signal,
          source,
          target,
          actionId: action.id,
        })
        proposed += 1
      }
    }

    return { proposed, memoriesCompounded }
  }

  private evidenceFingerprint(input: {
    orgId: string
    loopKind: SlackTeamLoopKind
    signal: SlackTeamSignal
    personalValidated?: Extract<ReturnType<typeof validatePersonalMomentEvidence>, { ok: true }>
    now: Date
  }): string {
    if (input.signal.kind === 'personal_moment' && input.personalValidated?.ok) {
      return personalMomentDedupeKey({
        orgId: input.orgId,
        subjectSlackUserId: input.personalValidated.subjectSlackUserId,
        eventType: input.personalValidated.eventType,
        dateKey: personalMomentDateKey(input.now),
      })
    }
    return createHash('sha256')
      .update(
        [
          input.orgId,
          input.loopKind,
          input.signal.kind,
          input.signal.target_channel_id,
          input.signal.source_message_ts,
        ].join(':'),
      )
      .digest('hex')
  }

  private async createInternalEscalation(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string
    loopKind: SlackTeamLoopKind
    deliveryMode: 'shadow' | 'active'
    slackTeamId: string
    preview?: boolean
    workflowKey: string
    evidenceFingerprint: string
    signal: SlackTeamSignal
    source: ObservedMessage
    target: SlackTeamPerson
    workspaceOwner?: SlackTeamPerson
    peopleBySlackId: Map<string, SlackTeamPerson>
    actionId: string
  }): Promise<void> {
    if (!input.workspaceOwner) return
    const content = composeInternalEscalation(
      {
        subjectName: input.target.display_name,
        channelName: input.source.channel_name,
        kind: input.signal.kind,
        finding: input.signal.proposed_content.trim(),
      },
      { recipientName: input.workspaceOwner.display_name },
    )
    await this.people.createShadowAction(input.supabase, {
      orgId: input.orgId,
      userId: input.userId,
      agentKey: 'pixel',
      targetMemberId: input.workspaceOwner.id,
      actionKind: 'message',
      proposedContent: resolveSlackIdentityText(content, input.peopleBySlackId),
      rationale: `Internal follow-up for a ${input.target.relationship_kind} Slack signal. Pixel will not message ${input.target.display_name}.`,
      sourceChannelId: input.signal.target_channel_id,
      sourceMessageTs: input.signal.source_message_ts,
      workflowKey: input.workflowKey,
      metadata: {
        loop_kind: input.loopKind,
        signal_kind: input.signal.kind,
        signal_finding: resolveSlackIdentityText(
          input.signal.proposed_content,
          input.peopleBySlackId,
        ),
        confidence: input.signal.confidence,
        evidence_fingerprint: `${input.evidenceFingerprint}:internal${input.preview ? ':preview' : ''}`,
        delivery_mode: input.deliveryMode,
        ...(input.preview ? { preview: true, preview_badge: 'Preview' } : {}),
        ...slackSignalLifecycleMetadata(input.signal.kind),
        internal_only: true,
        parent_signal_id: input.actionId,
        subject_member_id: input.target.id,
        subject_display_name: input.target.display_name,
        subject_relationship_kind: input.target.relationship_kind,
        ...slackTeamEvidenceMetadata({
          source: input.source,
          slackTeamId: input.slackTeamId,
          peopleBySlackId: input.peopleBySlackId,
        }),
      },
    })
  }
}
