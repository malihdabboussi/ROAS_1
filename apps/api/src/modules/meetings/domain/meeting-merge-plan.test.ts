import { describe, expect, it } from 'vitest'
import { buildMeetingMergeSurvivorPatch, isMeetingCallItem } from './meeting-merge-plan'

describe('isMeetingCallItem', () => {
  it('accepts explicit call entry_type', () => {
    expect(isMeetingCallItem({ custom_data: { entry_type: 'call' } })).toBe(true)
  })

  it('rejects explicit follow_up entry_type even when other call signals exist', () => {
    expect(
      isMeetingCallItem({
        source: 'fathom',
        custom_data: { entry_type: 'follow_up', recording_url: 'https://x' },
      }),
    ).toBe(false)
  })

  it('treats fathom-sourced items as calls', () => {
    expect(isMeetingCallItem({ source: 'fathom', custom_data: {} })).toBe(true)
  })

  it('treats agent_suggested items as non-calls', () => {
    expect(isMeetingCallItem({ source: 'agent_suggested', custom_data: {} })).toBe(false)
  })

  it('recognizes meeting title prefixes', () => {
    expect(isMeetingCallItem({ title: 'Meeting: weekly sync', custom_data: {} })).toBe(true)
    expect(isMeetingCallItem({ title: 'Fathom meeting: kickoff', custom_data: {} })).toBe(true)
  })

  it('recognizes recording evidence in custom_data', () => {
    expect(isMeetingCallItem({ custom_data: { recording_url: 'https://x' } })).toBe(true)
    expect(isMeetingCallItem({ custom_data: { fathom_meeting_id: 'f1' } })).toBe(true)
    expect(
      isMeetingCallItem({ custom_data: { external_automation: { provider: 'fathom' } } }),
    ).toBe(true)
  })

  it('rejects plain tasks and doc items', () => {
    expect(isMeetingCallItem({ title: 'Write proposal', custom_data: {} })).toBe(false)
    expect(isMeetingCallItem({ custom_data: null })).toBe(false)
    expect(
      isMeetingCallItem({
        custom_data: { _view_type: 'doc', entry_type: 'meeting_transcript' },
      }),
    ).toBe(false)
  })
})

describe('buildMeetingMergeSurvivorPatch', () => {
  const survivor = {
    id: 'keep',
    description: null,
    notes: 'survivor notes',
    custom_data: {
      entry_type: 'call',
      call_date: '2026-08-10T10:00:00Z',
      attendees: ['Dylan', 'Adam'],
      participant_emails: ['dylan@roas.com'],
      tags: ['t1'],
    },
  }

  it('fills missing scalar fields from duplicates without overwriting survivor values', () => {
    const patch = buildMeetingMergeSurvivorPatch(survivor, [
      {
        id: 'dup-1',
        custom_data: {
          entry_type: 'call',
          call_date: '2026-08-11T09:00:00Z',
          recording_url: 'https://fathom.video/r/1',
          summary: 'Recap text',
        },
      },
    ])
    expect(patch.custom_data.call_date).toBe('2026-08-10T10:00:00Z')
    expect(patch.custom_data.recording_url).toBe('https://fathom.video/r/1')
    expect(patch.custom_data.summary).toBe('Recap text')
  })

  it('prefers the earliest duplicate when several fill the same missing field', () => {
    const patch = buildMeetingMergeSurvivorPatch(survivor, [
      { id: 'dup-1', custom_data: { recording_url: 'https://first' } },
      { id: 'dup-2', custom_data: { recording_url: 'https://second' } },
    ])
    expect(patch.custom_data.recording_url).toBe('https://first')
  })

  it('treats empty strings as missing', () => {
    const patch = buildMeetingMergeSurvivorPatch(
      { ...survivor, custom_data: { ...survivor.custom_data, summary: '' } },
      [{ id: 'dup-1', custom_data: { summary: 'From dup' } }],
    )
    expect(patch.custom_data.summary).toBe('From dup')
  })

  it('unions attendees, participant emails, and tags', () => {
    const patch = buildMeetingMergeSurvivorPatch(survivor, [
      {
        id: 'dup-1',
        custom_data: {
          attendees: ['Adam', 'Nate'],
          participant_emails: ['DYLAN@roas.com', 'nate@roas.com'],
          tags: ['t1', 't2'],
        },
      },
    ])
    expect(patch.custom_data.attendees).toEqual(['Dylan', 'Adam', 'Nate'])
    expect(patch.custom_data.participant_emails).toEqual(['dylan@roas.com', 'nate@roas.com'])
    expect(patch.custom_data.tags).toEqual(['t1', 't2'])
  })

  it('normalizes entry_type to call and records merged_from_item_ids', () => {
    const patch = buildMeetingMergeSurvivorPatch(
      { id: 'keep', custom_data: { merged_from_item_ids: ['old'] }, title: 'Meeting: x' },
      [
        { id: 'dup-1', custom_data: {} },
        { id: 'dup-2', custom_data: {} },
      ],
    )
    expect(patch.custom_data.entry_type).toBe('call')
    expect(patch.custom_data.merged_from_item_ids).toEqual(['old', 'dup-1', 'dup-2'])
  })

  it('never copies structural keys from duplicates', () => {
    const patch = buildMeetingMergeSurvivorPatch(survivor, [
      {
        id: 'dup-1',
        custom_data: { _view_type: 'doc', source_call_item_id: 'other', entry_type: 'follow_up' },
      },
    ])
    expect(patch.custom_data._view_type).toBeUndefined()
    expect(patch.custom_data.source_call_item_id).toBeUndefined()
    expect(patch.custom_data.entry_type).toBe('call')
  })

  it('fills description and notes only when the survivor has none', () => {
    const patch = buildMeetingMergeSurvivorPatch(survivor, [
      { id: 'dup-1', description: 'dup description', notes: 'dup notes', custom_data: {} },
    ])
    expect(patch.description).toBe('dup description')
    expect(patch.notes).toBe('survivor notes')
  })
})
