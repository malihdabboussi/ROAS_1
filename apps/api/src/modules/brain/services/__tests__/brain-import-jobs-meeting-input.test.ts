import { describe, expect, it } from 'vitest'
import { normalizeFathomMeetingSource } from '../../../meetings/providers/fathom-meeting-source'
import { normalizeFirefliesMeetingSource } from '../../../meetings/providers/fireflies-meeting-source'
import {
  buildMeetingMissionInput,
  compactMeetingSource,
  legacyFathomJobPayload,
} from '../brain-import-jobs-meeting-input'
import type { BrainImportJobRecord } from '../brain-import-jobs.types'

function job(jobType: BrainImportJobRecord['job_type'], payload: Record<string, unknown>) {
  return {
    id: 'job_1',
    user_id: 'user_1',
    org_id: null,
    job_type: jobType,
    title: 'x',
    dedupe_key: 'x',
    payload,
    status: 'queued',
    attempts: 0,
    max_attempts: 3,
    next_attempt_at: '',
    last_error: null,
    result: null,
    completed_at: null,
    chunks_total: null,
    chunks_completed: null,
  } satisfies BrainImportJobRecord
}

const fireflies = compactMeetingSource(
  normalizeFirefliesMeetingSource({
    id: 'ff_1',
    title: 'Pricing sync',
    date: 1_760_000_000_000,
    duration: 10,
    host_email: 'host@example.com',
    sentences: [
      { speaker_name: 'Host', text: 'Welcome', start_time: 0 },
      { speaker_name: 'Client', text: 'We need a new price', start_time: 65 },
    ],
    summary: { overview: 'Agreed to revisit pricing.', action_items: ['Send the deck'] },
  }),
)

describe('buildMeetingMissionInput', () => {
  it('builds a user-brain input whose transcript keeps the speaker/text shape Atlas expects', () => {
    const j = job('meeting_transcript_import', {
      provider: 'fireflies',
      externalId: 'ff_1',
      source: fireflies,
    })
    const result = buildMeetingMissionInput(j, j.payload)

    expect(result.targetBrain).toBe('user')
    expect(result.contentType).toBe('meeting_transcript')
    expect(result.title).toBe('Analyze meeting: Pricing sync')
    expect(result.input).toMatchObject({
      target_brain: 'user',
      content_type: 'meeting_transcript',
      skill: 'knowledge-intake',
      provider: 'fireflies',
      sessionKey: 'fireflies:ff_1',
      meetingTitle: 'Pricing sync',
      summary: 'Agreed to revisit pricing.',
      actionItems: ['Send the deck'],
      host_email: 'host@example.com',
      occurred_at: new Date(1_760_000_000_000).toISOString(),
      temporal_source: 'fireflies_payload',
      temporal_confidence: 1,
    })
    expect(result.input.transcript).toEqual([
      { speaker: { display_name: 'Host' }, text: 'Welcome', timestamp: '00:00' },
      { speaker: { display_name: 'Client' }, text: 'We need a new price', timestamp: '01:05' },
    ])
  })

  it('honors a valid target override and forwards brainId', () => {
    const j = job('meeting_transcript_import', {
      source: fireflies,
      targetBrainOverride: 'agent',
      brainId: 'brain_9',
    })
    const result = buildMeetingMissionInput(j, j.payload)
    expect(result.targetBrain).toBe('agent')
    expect(result.input.brainId).toBe('brain_9')
  })

  it('requires a contact for customer-brain imports', () => {
    const j = job('meeting_transcript_import', {
      source: fireflies,
      targetBrainOverride: 'customer',
    })
    expect(() => buildMeetingMissionInput(j, j.payload)).toThrow(/contact_id/)
    const ok = job('meeting_transcript_import', {
      source: fireflies,
      targetBrainOverride: 'customer',
      contactId: 'contact_1',
    })
    expect(buildMeetingMissionInput(ok, ok.payload).input.contact_id).toBe('contact_1')
  })

  it('targets the campaign brain for campaign meeting jobs', () => {
    const j = job('campaign_meeting_import', {
      source: compactMeetingSource(
        normalizeFathomMeetingSource({
          id: 'rec_1',
          title: 'Kickoff',
          transcript: [{ speaker: { display_name: 'A' }, text: 'go' }],
        }),
      ),
      campaignId: 'camp_1',
      domain: 'strategy',
    })
    const result = buildMeetingMissionInput(j, j.payload)
    expect(result.targetBrain).toBe('campaign')
    expect(result.campaignId).toBe('camp_1')
    expect(result.input).toMatchObject({
      campaignId: 'camp_1',
      domain: 'strategy',
      provider: 'fathom',
    })
  })

  it('fails loudly when the payload has no normalized source or campaign id', () => {
    const missing = job('meeting_transcript_import', {})
    expect(() => buildMeetingMissionInput(missing, missing.payload)).toThrow(/normalized source/)
    const noCampaign = job('campaign_meeting_import', { source: fireflies })
    expect(() => buildMeetingMissionInput(noCampaign, noCampaign.payload)).toThrow(/campaignId/)
  })

  it('compactMeetingSource drops the raw provider body only', () => {
    const compact = compactMeetingSource(
      normalizeFathomMeetingSource({ id: 'rec_1', title: 'Kickoff', transcript: [] }),
    )
    expect(compact).not.toHaveProperty('raw')
    expect(compact.externalRecordingId).toBe('rec_1')
  })

  it('maps a legacy Fathom job payload onto the shared builder', () => {
    const legacy = {
      meeting: {
        recording_id: 'rec_legacy',
        title: 'Old call',
        transcript: [{ speaker: { display_name: 'A' }, text: 'hello' }],
      },
      targetBrainOverride: 'agent',
      brainId: 'brain_1',
    }
    const j = job('fathom_meeting_import', legacy)
    const result = buildMeetingMissionInput(j, legacyFathomJobPayload(legacy))
    expect(result.targetBrain).toBe('agent')
    expect(result.input).toMatchObject({
      provider: 'fathom',
      sessionKey: 'fathom:rec_legacy',
      brainId: 'brain_1',
      transcript: [{ speaker: { display_name: 'A' }, text: 'hello' }],
    })
  })
})
