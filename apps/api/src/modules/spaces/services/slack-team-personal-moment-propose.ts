import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSlackIdentityText, slackTeamEvidenceMetadata } from './slack-team-loop-evidence'
import {
  composePersonalMomentMessage,
  filterBrainDetailsFromSlackCopy,
  personalMomentDateKey,
  pickPersonalMomentHistoricalConnection,
  scorePersonalMomentHistoryCandidate,
  type PersonalMomentEventType,
  type PersonalMomentEvidenceMessage,
} from './slack-team-personal-moment'
import { slackSignalLifecycleMetadata } from './slack-team-signal-delivery.service'

type ObservedMessage = PersonalMomentEvidenceMessage & {
  channel_name: string
  thread_ts: string | null
}

export async function proposePersonalMomentAction(input: {
  supabase: SupabaseClient
  userId: string
  orgId: string
  workflowKey: string
  loopKind: string
  deliveryMode: 'shadow' | 'active'
  slackTeamId: string
  evidenceFingerprint: string
  preview?: boolean
  signal: {
    proposed_content: string
    rationale: string
    target_channel_id: string
    source_message_ts: string
  }
  source: ObservedMessage
  internalRecipient: {
    id: string
    display_name: string
    relationship_kind: string
    person_brain_id: string | null
  }
  validated: {
    ok: true
    eventType: PersonalMomentEventType
    evidence: PersonalMomentEvidenceMessage[]
    confidence: number
  }
  observed: ObservedMessage[]
  peopleBySlackId: Map<string, { display_name: string }>
  searchMessages: (
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    params: { query: string; count: number },
  ) => Promise<unknown>
  createShadowAction: (
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ) => Promise<unknown>
  now?: Date
  timezone?: string
  composePersonalMoment?: (input: {
    finding: string
    evidence: PersonalMomentEvidenceMessage[]
    eventType: PersonalMomentEventType
    belated: boolean
  }) => Promise<{ text: string; usage: Record<string, number> }>
}): Promise<boolean> {
  const subjectNames = [
    input.internalRecipient.display_name,
    input.internalRecipient.display_name.split(/\s+/)[0] || '',
  ].filter(Boolean)
  const evidenceTexts = input.validated.evidence.map((message) => message.text)
  const historyCandidates = input.observed
    .filter(
      (message) =>
        message.user !== 'PIXEL_BOT' &&
        !input.validated.evidence.some((evidence) => evidence.ts === message.ts),
    )
    .map((message) => ({
      text: message.text,
      score: scorePersonalMomentHistoryCandidate({
        text: message.text,
        subjectNames,
        eventType: input.validated.eventType,
        excludeTexts: evidenceTexts,
      }),
      channelName: message.channel_name,
      source: 'recent_slack' as const,
    }))
  let archiveCandidates: Array<{
    text: string
    score: number
    channelName?: string
    source: 'archive'
  }> = []
  try {
    const archive = await input.searchMessages(input.supabase, input.userId, input.orgId, {
      query: `${subjectNames[0] ?? ''} ${input.validated.eventType.replaceAll('_', ' ')}`,
      count: 5,
    })
    const rawMatches = Array.isArray((archive as { matches?: unknown }).matches)
      ? ((archive as { matches: Array<{ text?: string; channel?: { name?: string } }> }).matches ??
        [])
      : Array.isArray((archive as { messages?: { matches?: unknown } }).messages?.matches)
        ? ((
            archive as {
              messages: { matches: Array<{ text?: string; channel?: { name?: string } }> }
            }
          ).messages.matches ?? [])
        : []
    archiveCandidates = rawMatches.map((match) => ({
      text: String(match.text ?? ''),
      score: scorePersonalMomentHistoryCandidate({
        text: String(match.text ?? ''),
        subjectNames,
        eventType: input.validated.eventType,
        excludeTexts: evidenceTexts,
      }),
      channelName: match.channel?.name,
      source: 'archive' as const,
    }))
  } catch {
    archiveCandidates = []
  }
  let brainContextInternal: string[] = []
  if (input.internalRecipient.person_brain_id) {
    try {
      const { data } = await input.supabase
        .from('ns_memories')
        .select('content')
        .eq('brain_id', input.internalRecipient.person_brain_id)
        .order('created_at', { ascending: false })
        .limit(5)
      brainContextInternal = (data ?? [])
        .map((row) => String((row as { content?: string }).content ?? '').trim())
        .filter(Boolean)
        .slice(0, 3)
    } catch {
      brainContextInternal = []
    }
  }
  const historical = pickPersonalMomentHistoricalConnection([
    ...historyCandidates,
    ...archiveCandidates,
  ])
  const historicalLine = historical
    ? /ad|creative|campaign|webinar/i.test(historical.text)
      ? 'The older ad everyone resurfaced still holds up, too.'
      : 'That older thread people brought back still holds up, too.'
    : null
  const finding = resolveSlackIdentityText(input.signal.proposed_content, input.peopleBySlackId)
  const fallback = filterBrainDetailsFromSlackCopy(
    composePersonalMomentMessage({
      recipientName: input.internalRecipient.display_name,
      eventType: input.validated.eventType,
      channelName: input.source.channel_name,
      finding,
      historicalConnection: historicalLine,
    }),
  )
  const now = input.now ?? new Date()
  const sourceMillis = Number(input.source.ts.split('.')[0]) * 1000
  const belated =
    Number.isFinite(sourceMillis) && now.getTime() - sourceMillis > 20 * 60 * 60 * 1000
  let composed = fallback
  let compositionMetadata: Record<string, unknown> = { composition_fallback: true }
  if (input.composePersonalMoment) {
    try {
      const result = await input.composePersonalMoment({
        finding,
        evidence: input.validated.evidence,
        eventType: input.validated.eventType,
        belated,
      })
      composed = filterBrainDetailsFromSlackCopy(result.text)
      compositionMetadata = { composition_usage: result.usage, personal_moment_belated: belated }
    } catch {
      compositionMetadata = { composition_fallback: true, personal_moment_belated: belated }
    }
  }
  await input.createShadowAction(input.supabase, {
    orgId: input.orgId,
    userId: input.userId,
    agentKey: 'pixel',
    targetMemberId: input.internalRecipient.id,
    actionKind: 'message',
    proposedContent: composed,
    rationale: resolveSlackIdentityText(input.signal.rationale, input.peopleBySlackId),
    sourceChannelId: input.signal.target_channel_id,
    sourceMessageTs: input.signal.source_message_ts,
    workflowKey: input.workflowKey,
    metadata: {
      loop_kind: input.loopKind,
      signal_kind: 'personal_moment',
      moment_event_type: input.validated.eventType,
      moment_date_key: personalMomentDateKey(now, input.timezone),
      signal_finding: finding,
      confidence: input.validated.confidence,
      evidence_fingerprint: input.evidenceFingerprint,
      delivery_mode: input.deliveryMode,
      ...(input.preview ? { preview: true, preview_badge: 'Preview' } : {}),
      personal_moment_evidence: input.validated.evidence.map((message) => ({
        channel_id: message.channel_id,
        channel_name: message.channel_name,
        ts: message.ts,
        user: message.user,
        text: resolveSlackIdentityText(message.text, input.peopleBySlackId),
      })),
      personal_moment_historical_connection: historicalLine,
      personal_moment_historical_source_text: historical?.text ?? null,
      personal_moment_brain_context_internal: brainContextInternal,
      ...compositionMetadata,
      ...slackSignalLifecycleMetadata('personal_moment'),
      ...slackTeamEvidenceMetadata({
        source: input.source,
        slackTeamId: input.slackTeamId,
        peopleBySlackId: input.peopleBySlackId,
      }),
      subject_member_id: input.internalRecipient.id,
      subject_display_name: input.internalRecipient.display_name,
      subject_relationship_kind: input.internalRecipient.relationship_kind,
    },
  })
  return true
}
