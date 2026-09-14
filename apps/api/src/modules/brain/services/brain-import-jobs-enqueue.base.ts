import { randomUUID } from 'node:crypto'
import type { AssetRef } from '@vibey/api-shared'
import { normalizeSlackTimestamp } from '../../slack/utils/normalize-slack-timestamp'
import type { MeetingJobSource } from './brain-import-jobs-meeting-input'
import { BrainImportJobsRuntimeBase } from './brain-import-jobs-runtime.base'
import type { SlackForkTarget } from './brain-import-jobs.types'

export abstract class BrainImportJobsEnqueueBase extends BrainImportJobsRuntimeBase {
  // ── Enqueue Methods ─────────────────────────────────────────────────────

  async enqueueDocumentRemember(
    userId: string,
    input: {
      content: string
      sourceType: 'document' | 'dropbox' | 'google_drive'
      sourceId?: string | null
      sourceTitle?: string | null
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string | null
      mediaMimeType?: string | null
      mediaBase64?: string | null
      mediaCaption?: string | null
      assetId?: string | null
      assetRef?: AssetRef | null
    },
    orgId?: string | null,
  ) {
    const payload = {
      content: input.content,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      sourceTitle: input.sourceTitle ?? null,
      mediaType: input.mediaType ?? 'text',
      mediaUrl: input.mediaUrl ?? null,
      mediaMimeType: input.mediaMimeType ?? null,
      mediaBase64: input.mediaBase64 ?? null,
      mediaCaption: input.mediaCaption ?? null,
      assetId: input.assetId ?? null,
      assetRef: input.assetRef ?? null,
    }
    const dedupeKey = `remember:${input.sourceType}:${this.hashKey(input.content)}`
    return this.enqueueJob(
      userId,
      'document_remember',
      input.sourceTitle ?? 'Document import',
      dedupeKey,
      payload,
      orgId,
    )
  }

  async enqueueUserLinkImport(
    userId: string,
    input: { url: string; title?: string | null },
    orgId?: string | null,
  ) {
    const normalizedUrl = input.url.trim()
    const payload = {
      url: normalizedUrl,
      title: input.title?.trim() || null,
    }
    const dedupeKey = `remember_link:${this.hashKey(normalizedUrl)}`
    return this.enqueueJob(
      userId,
      'user_link_import',
      input.title?.trim() || 'Link import',
      dedupeKey,
      payload,
      orgId,
    )
  }

  async enqueueFathomMeetingImport(
    userId: string,
    meeting: Record<string, unknown>,
    orgId?: string | null,
    brainId?: string,
    targetBrain?: string,
  ) {
    const externalId = String(
      meeting.id ||
        meeting.recording_id ||
        meeting.call_id ||
        meeting.url ||
        meeting.title ||
        randomUUID(),
    )
    const payload: Record<string, unknown> = { meeting }
    if (brainId) payload.brainId = brainId
    if (targetBrain) payload.targetBrainOverride = targetBrain
    return this.enqueueJob(
      userId,
      'fathom_meeting_import',
      String(meeting.title || meeting.meeting_title || 'Fathom meeting'),
      `fathom:${externalId}`,
      payload,
      orgId,
    )
  }

  async enqueueSkIngest(
    userId: string,
    input: {
      brainId: string
      text: string
      sourceType: string
      title: string
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string | null
      mediaMimeType?: string | null
      mediaBase64?: string | null
      mediaCaption?: string | null
      assetId?: string | null
      assetRef?: AssetRef | null
    },
    orgId?: string | null,
  ) {
    const dedupeKey = `sk:${input.brainId}:${input.sourceType}:${this.hashKey(input.text)}`
    return this.enqueueJob(
      userId,
      'sk_ingest',
      input.title || 'Knowledge import',
      dedupeKey,
      input as unknown as Record<string, unknown>,
      orgId,
    )
  }

  async enqueueSkLinkIngest(
    userId: string,
    input: {
      brainId: string
      url: string
      sourceType?: string
      title?: string
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
    },
    orgId?: string | null,
  ) {
    const dedupeKey = `sk-link:${input.brainId}:${this.hashKey(input.url)}`
    return this.enqueueJob(
      userId,
      'sk_link_ingest',
      input.title || `Link: ${input.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}`,
      dedupeKey,
      input as unknown as Record<string, unknown>,
      orgId,
    )
  }

  async enqueueFirefliesTranscriptImport(
    userId: string,
    transcriptId: string,
    orgId?: string | null,
    brainId?: string,
    targetBrain?: string,
  ) {
    const payload: Record<string, unknown> = { transcriptId }
    if (brainId) payload.brainId = brainId
    if (targetBrain) payload.targetBrainOverride = targetBrain
    return this.enqueueJob(
      userId,
      'fireflies_transcript_import',
      'Fireflies transcript',
      `fireflies:${transcriptId}`,
      payload,
      orgId,
    )
  }

  /** Provider-agnostic meeting import: the normalized transcript travels in the payload. */
  async enqueueMeetingTranscriptImport(
    userId: string,
    input: {
      source: MeetingJobSource
      brainId?: string
      targetBrain?: string
      contactId?: string
    },
    orgId?: string | null,
  ) {
    const payload: Record<string, unknown> = {
      provider: input.source.provider,
      externalId: input.source.externalRecordingId,
      source: input.source,
    }
    if (input.brainId) payload.brainId = input.brainId
    if (input.targetBrain) payload.targetBrainOverride = input.targetBrain
    if (input.contactId) payload.contactId = input.contactId
    return this.enqueueJob(
      userId,
      'meeting_transcript_import',
      input.source.title || 'Meeting transcript',
      `meeting:${input.source.provider}:${input.source.externalRecordingId}`,
      payload,
      orgId,
    )
  }

  async enqueueCampaignMeetingImport(
    userId: string,
    input: {
      campaignId: string
      source: MeetingJobSource
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
    },
    orgId?: string | null,
  ) {
    const payload: Record<string, unknown> = {
      campaignId: input.campaignId,
      provider: input.source.provider,
      externalId: input.source.externalRecordingId,
      source: input.source,
    }
    if (input.domain) payload.domain = input.domain
    return this.enqueueJob(
      userId,
      'campaign_meeting_import',
      input.source.title || 'Campaign meeting import',
      `campaign-meeting:${input.campaignId}:${input.source.provider}:${input.source.externalRecordingId}`,
      payload,
      orgId,
    )
  }

  async enqueueCampaignFileImport(
    userId: string,
    input: {
      campaignId: string
      title: string
      content: string
      sourceType: 'upload' | 'drive' | 'dropbox'
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string | null
      mediaMimeType?: string | null
      mediaBase64?: string | null
      mediaCaption?: string | null
      assetId?: string | null
      assetRef?: AssetRef | null
    },
    orgId?: string | null,
  ) {
    const dedupeKey = `campaign-file:${input.campaignId}:${input.sourceType}:${this.hashKey(input.content)}`
    return this.enqueueJob(
      userId,
      'campaign_file_import',
      input.title || 'Campaign file import',
      dedupeKey,
      input as unknown as Record<string, unknown>,
      orgId,
    )
  }

  async enqueueCampaignUrlImport(
    userId: string,
    input: {
      campaignId: string
      url: string
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
    },
    orgId?: string | null,
  ) {
    const dedupeKey = `campaign-url:${input.campaignId}:${this.hashKey(input.url)}`
    const shortUrl = input.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)
    return this.enqueueJob(
      userId,
      'campaign_url_import',
      `Link: ${shortUrl}`,
      dedupeKey,
      input as unknown as Record<string, unknown>,
      orgId,
    )
  }

  async enqueueCampaignFathomImport(
    userId: string,
    input: {
      campaignId: string
      meeting: Record<string, unknown>
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
    },
    orgId?: string | null,
  ) {
    const externalId = String(
      input.meeting.id ||
        input.meeting.recording_id ||
        input.meeting.call_id ||
        input.meeting.url ||
        input.meeting.title ||
        randomUUID(),
    )
    return this.enqueueJob(
      userId,
      'campaign_fathom_import',
      String(input.meeting.title || input.meeting.meeting_title || 'Campaign Fathom import'),
      `campaign-fathom:${input.campaignId}:${externalId}`,
      input as unknown as Record<string, unknown>,
      orgId,
    )
  }

  async enqueueCampaignFirefliesImport(
    userId: string,
    input: {
      campaignId: string
      transcriptId: string
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
    },
    orgId?: string | null,
  ) {
    return this.enqueueJob(
      userId,
      'campaign_fireflies_import',
      'Campaign Fireflies import',
      `campaign-fireflies:${input.campaignId}:${input.transcriptId}`,
      input as unknown as Record<string, unknown>,
      orgId,
    )
  }

  async enqueueSlackPeriodImport(
    userId: string,
    mapping: {
      id: string
      user_id: string
      org_id: string | null
      slack_team_id: string
      slack_channel_id: string
      slack_channel_name: string
      target_kind: 'user' | 'campaign' | 'agent' | 'customer'
      target_brain_id: string | null
      target_campaign_id: string | null
      cadence: string
    },
    periodStartTs: string,
    periodEndTs: string,
    orgId?: string | null,
    fork?: SlackForkTarget,
  ) {
    const normalizedPeriodStartTs = normalizeSlackTimestamp(periodStartTs)
    const normalizedPeriodEndTs = normalizeSlackTimestamp(periodEndTs)
    const payload: Record<string, unknown> = {
      mappingId: mapping.id,
      mappingUserId: mapping.user_id,
      channelId: mapping.slack_channel_id,
      channelName: mapping.slack_channel_name,
      teamId: mapping.slack_team_id,
      periodStartTs: normalizedPeriodStartTs,
      periodEndTs: normalizedPeriodEndTs,
      targetKind: fork?.kind === 'managed_person' ? 'user' : (fork?.kind ?? mapping.target_kind),
      targetCampaignId: mapping.target_campaign_id,
      targetBrainId:
        fork?.kind === 'user' || fork?.kind === 'managed_person'
          ? fork.brainId
          : mapping.target_brain_id,
      contactId: fork?.kind === 'customer' ? fork.contactId : null,
      senderFilterSlackUserId: fork?.slackUserId ?? null,
      isFork: !!fork,
    }
    const effectiveUserId = fork?.kind === 'user' ? fork.userId : userId
    const targetId =
      fork?.kind === 'customer'
        ? fork.contactId
        : fork?.kind === 'user'
          ? fork.userId
          : fork?.kind === 'managed_person'
            ? fork.brainId
            : mapping.target_campaign_id || mapping.target_brain_id || mapping.target_kind
    const dedupeKey = fork
      ? `slack:${mapping.id}:${normalizedPeriodStartTs}:fork:${fork.kind}:${targetId}`
      : `slack:${mapping.id}:${normalizedPeriodStartTs}`
    const effectiveTargetKind =
      fork?.kind === 'managed_person' ? 'user' : (fork?.kind ?? mapping.target_kind)
    const jobType =
      effectiveTargetKind === 'campaign' ? 'campaign_slack_import' : 'slack_period_import'
    const title = fork
      ? `Slack #${mapping.slack_channel_name} ${fork.kind} fork`
      : `Slack #${mapping.slack_channel_name} ${mapping.cadence}`
    return this.enqueueJob(effectiveUserId, jobType, title, dedupeKey, payload, orgId)
  }
}
