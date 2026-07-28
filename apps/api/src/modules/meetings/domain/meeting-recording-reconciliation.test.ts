import { describe, expect, it } from 'vitest'
import {
  reconcileMeetingRecordings,
  recordingDurationSeconds,
  type MeetingIdentityAnchor,
  type MeetingRecordingCandidate,
} from './meeting-recording-reconciliation'

const meeting: MeetingIdentityAnchor = {
  calendarEventId: 'google:event-1',
  title: 'Dylan and Alex — Strategy Call',
  scheduledStart: '2026-07-28T17:00:00.000Z',
  scheduledEnd: '2026-07-28T18:00:00.000Z',
  participantEmails: ['dylan@dylanvanas.com', 'alex@example.com'],
}

function recording(
  input: Partial<MeetingRecordingCandidate> &
    Pick<MeetingRecordingCandidate, 'externalRecordingId'>,
): MeetingRecordingCandidate {
  return {
    provider: 'fathom',
    title: meeting.title,
    calendarEventId: meeting.calendarEventId,
    scheduledStart: meeting.scheduledStart,
    scheduledEnd: meeting.scheduledEnd,
    recordingStart: meeting.scheduledStart,
    recordingEnd: meeting.scheduledEnd,
    participantEmails: meeting.participantEmails,
    transcriptEntries: 0,
    hasSummary: false,
    actionItemCount: 0,
    ...input,
  }
}

describe('meeting recording reconciliation', () => {
  it('attaches a short pre-call and the full call to one meeting and selects the full call', () => {
    const shortPrecall = recording({
      externalRecordingId: 'rec-precall',
      recordingStart: '2026-07-28T16:55:00.000Z',
      recordingEnd: '2026-07-28T16:57:00.000Z',
      transcriptEntries: 12,
      hasSummary: true,
      actionItemCount: 1,
    })
    const fullCall = recording({
      externalRecordingId: 'rec-main',
      recordingStart: '2026-07-28T17:00:00.000Z',
      recordingEnd: '2026-07-28T17:48:00.000Z',
      transcriptEntries: 420,
      hasSummary: true,
      actionItemCount: 4,
    })

    const result = reconcileMeetingRecordings(meeting, [shortPrecall, fullCall])

    expect(result.attached.map((row) => row.externalRecordingId)).toEqual([
      'rec-precall',
      'rec-main',
    ])
    expect(result.primary?.externalRecordingId).toBe('rec-main')
    expect(result.supplemental.map((row) => row.externalRecordingId)).toEqual(['rec-precall'])
    expect(result.unmatched).toEqual([])
  })

  it('keeps a short call as primary when it is the only matching recording', () => {
    const shortCall = recording({
      externalRecordingId: 'rec-short',
      recordingStart: '2026-07-28T17:00:00.000Z',
      recordingEnd: '2026-07-28T17:02:00.000Z',
      transcriptEntries: 8,
      hasSummary: true,
      actionItemCount: 1,
    })

    const result = reconcileMeetingRecordings(meeting, [shortCall])

    expect(result.primary?.externalRecordingId).toBe('rec-short')
    expect(result.supplemental).toEqual([])
  })

  it('does not attach a different meeting that only shares the recording owner', () => {
    const unrelated = recording({
      externalRecordingId: 'rec-unrelated',
      calendarEventId: 'google:event-2',
      title: 'Operations Review',
      scheduledStart: '2026-07-28T20:00:00.000Z',
      scheduledEnd: '2026-07-28T20:30:00.000Z',
      recordingStart: '2026-07-28T20:00:00.000Z',
      recordingEnd: '2026-07-28T20:30:00.000Z',
      participantEmails: ['dylan@dylanvanas.com', 'nate@example.com'],
      transcriptEntries: 200,
    })

    const result = reconcileMeetingRecordings(meeting, [unrelated])

    expect(result.attached).toEqual([])
    expect(result.unmatched.map((row) => row.externalRecordingId)).toEqual(['rec-unrelated'])
  })

  it('uses exact calendar identity even when provider titles differ', () => {
    const providerRenamed = recording({
      externalRecordingId: 'rec-renamed',
      title: 'Growth priorities and launch blockers',
      transcriptEntries: 80,
    })

    const result = reconcileMeetingRecordings(meeting, [providerRenamed])

    expect(result.primary?.externalRecordingId).toBe('rec-renamed')
  })

  it('returns null duration for invalid windows', () => {
    expect(
      recordingDurationSeconds(
        recording({
          externalRecordingId: 'rec-invalid',
          recordingStart: 'invalid',
          recordingEnd: '2026-07-28T17:10:00.000Z',
        }),
      ),
    ).toBeNull()
  })
})
