import type {
  TranscriptSourceAction,
  TranscriptSourceEvent,
  TranscriptTurn,
} from '../../meetings/providers/transcript-source.types'
import type { BrainImportJobRecord } from './brain-import-jobs.types'

/** The normalized meeting as stored in a `brain_import_jobs.payload.source` (raw provider body dropped). */
export type MeetingJobSource = Omit<TranscriptSourceEvent, 'raw'>

export type MeetingTranscriptJobPayload = {
  provider: string
  externalId: string
  source: MeetingJobSource
  brainId?: string
  targetBrainOverride?: string
  contactId?: string
  campaignId?: string
  domain?: string
}

const TARGET_BRAINS = ['user', 'campaign', 'agent', 'customer'] as const
type TargetBrain = (typeof TARGET_BRAINS)[number]

export function compactMeetingSource(source: TranscriptSourceEvent): MeetingJobSource {
  const { raw: _raw, ...compact } = source
  return compact
}

/**
 * One Atlas input for every note taker. The transcript is stored in the job
 * payload at enqueue time, so execution never needs a provider client.
 * `transcript` keeps the `{ speaker: { display_name }, text }` shape that
 * `extractContentText` already understands.
 */
export function buildMeetingMissionInput(
  job: BrainImportJobRecord,
  payload: Record<string, unknown>,
): {
  targetBrain: TargetBrain
  contentType: string
  title: string
  campaignId?: string
  input: Record<string, unknown>
} {
  const typed = payload as Partial<MeetingTranscriptJobPayload>
  const source = typed.source
  if (!source || typeof source !== 'object') {
    throw new Error('Meeting import job payload is missing its normalized source')
  }

  const isCampaign = job.job_type === 'campaign_meeting_import'
  const campaignId = isCampaign ? String(typed.campaignId ?? '').trim() : ''
  if (isCampaign && !campaignId) {
    throw new Error('Campaign meeting import job payload is missing campaignId')
  }
  const override = typed.targetBrainOverride
  const targetBrain: TargetBrain = isCampaign
    ? 'campaign'
    : override && (TARGET_BRAINS as readonly string[]).includes(override)
      ? (override as TargetBrain)
      : 'user'
  if (targetBrain === 'customer' && !typed.contactId) {
    throw new Error('contact_id is required for customer brain meeting imports')
  }

  const provider = source.provider
  const externalId = source.externalRecordingId
  const title = source.title || 'Untitled meeting'
  const occurredAt = source.recordingStart ?? source.scheduledStart ?? null
  const occurredUntil = source.recordingEnd ?? source.scheduledEnd ?? null

  return {
    targetBrain,
    contentType: 'meeting_transcript',
    title: isCampaign ? `Analyze meeting for campaign: ${title}` : `Analyze meeting: ${title}`,
    ...(campaignId ? { campaignId } : {}),
    input: {
      target_brain: targetBrain,
      content_type: 'meeting_transcript',
      skill: 'knowledge-intake',
      provider,
      sessionKey: `${provider}:${externalId}`,
      sourceId: `${provider}:${externalId}`,
      meetingTitle: title,
      sourceTitle: title,
      transcript: source.transcript.map(toTranscriptEntry),
      summary: source.providerSummary ?? undefined,
      actionItems: source.actions.map(actionText).filter(Boolean),
      participants: source.participantEmails,
      host_email: source.hostEmail ?? undefined,
      recording_url: source.recordingUrl ?? undefined,
      source_url: source.sourceUrl ?? undefined,
      occurred_at: occurredAt ?? undefined,
      occurred_until: occurredUntil ?? undefined,
      asserted_at: new Date().toISOString(),
      temporal_source: `${provider}_payload`,
      temporal_confidence: occurredAt ? 1 : 0,
      ...(typeof typed.brainId === 'string' && typed.brainId ? { brainId: typed.brainId } : {}),
      ...(typeof typed.contactId === 'string' && typed.contactId
        ? { contact_id: typed.contactId }
        : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(typeof typed.domain === 'string' && typed.domain ? { domain: typed.domain } : {}),
    },
  }
}

function toTranscriptEntry(turn: TranscriptTurn): Record<string, unknown> {
  return {
    speaker: {
      display_name: turn.speakerName,
      ...(turn.speakerEmail ? { email: turn.speakerEmail } : {}),
    },
    text: turn.text,
    ...(turn.timestamp ? { timestamp: turn.timestamp } : {}),
  }
}

function actionText(action: TranscriptSourceAction): string {
  const owner = action.assigneeName?.trim()
  return owner ? `${owner}: ${action.sourceText}` : action.sourceText
}
