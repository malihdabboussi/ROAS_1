import { describe, expect, it } from 'vitest'
import { DEFAULT_SPACE_SCHEMA } from '../types/space-schema'
import { normalizeSpaceSchema } from './normalize-space-schema'

describe('normalizeSpaceSchema', () => {
  it('preserves imported views while restoring required fields and version', () => {
    const normalized = normalizeSpaceSchema({
      views: [{ id: 'missions', type: 'missions', name: 'Missions' }],
      custom_data: { source: 'page_grader' },
    })

    expect(normalized.version).toBe(1)
    expect(normalized.fields).toEqual(DEFAULT_SPACE_SCHEMA.fields)
    expect(normalized.views).toEqual([{ id: 'missions', type: 'missions', name: 'Missions' }])
    expect((normalized as unknown as { custom_data?: unknown }).custom_data).toEqual({
      source: 'page_grader',
    })
  })

  it('merges missing canonical fields without replacing valid custom fields', () => {
    const normalized = normalizeSpaceSchema({
      version: 1,
      fields: [{ id: 'client_stage', name: 'Client stage', type: 'select' }],
      views: [],
    })

    expect(normalized.fields[0]).toMatchObject({ id: 'client_stage' })
    expect(normalized.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'title' })]),
    )
    expect(normalized.views).toEqual(DEFAULT_SPACE_SCHEMA.views)
  })

  it('adds workspace, Host, Attendees, and Call status fields to All Meetings views', () => {
    const normalized = normalizeSpaceSchema({
      fields: [{ id: 'title', name: 'Name', type: 'text' }],
      views: [
        {
          id: 'all-meetings',
          type: 'list',
          visible_fields: ['title', 'call_kind', 'priority', 'status'],
        },
      ],
    })
    expect(normalized.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'campaign_name', name: 'Client Workspace' }),
        expect.objectContaining({ id: 'space_title', name: 'Campaign Space' }),
        expect.objectContaining({ id: 'host', name: 'Host' }),
        expect.objectContaining({ id: 'attendees', name: 'Attendees' }),
        expect.objectContaining({ id: 'call_status', name: 'Call status' }),
      ]),
    )
    expect(normalized.views[0]?.visible_fields).toEqual([
      'title',
      'call_kind',
      'campaign_name',
      'space_title',
      'host',
      'attendees',
      'call_date',
      'call_status',
      'recording_url',
    ])
  })
})
