import { describe, expect, it } from 'vitest'
import {
  ALL_MEETINGS_LIST_FIELD_IDS,
  ensureAllMeetingsListColumns,
  withAttendeesColumn,
  withClientWorkspaceColumns,
} from './all-meetings-list-columns'

describe('ensureAllMeetingsListColumns', () => {
  it('replaces Priority with Client Workspace, Campaign Space, Host, and Call status', () => {
    const next = ensureAllMeetingsListColumns({
      fields: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'call_kind', name: 'Call Kind', type: 'select' },
        { id: 'priority', name: 'Priority', type: 'select' },
        { id: 'status', name: 'Status', type: 'select' },
      ],
      views: [
        {
          id: 'all-meetings',
          visible_fields: ['title', 'call_kind', 'priority', 'status'],
          column_widths: { title: 360 },
        },
      ],
    })

    expect(next.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'campaign_name', name: 'Client Workspace' }),
        expect.objectContaining({ id: 'space_title', name: 'Campaign Space' }),
        expect.objectContaining({ id: 'client_campaign', name: 'Client / Campaign' }),
        expect.objectContaining({ id: 'host', name: 'Host' }),
        expect.objectContaining({ id: 'attendees', name: 'Attendees', type: 'multi_select' }),
        expect.objectContaining({
          id: 'call_status',
          name: 'Call status',
          options: expect.arrayContaining([
            expect.objectContaining({ id: 'live', label: 'Live' }),
            expect.objectContaining({ id: 'completed', label: 'Completed' }),
            expect.objectContaining({ id: 'no_show', label: 'No Show' }),
            expect.objectContaining({ id: 'rescheduled', label: 'Rescheduled' }),
          ]),
        }),
      ]),
    )
    expect(next.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'priority' })]),
    )
    expect(next.views[0]?.visible_fields).toEqual([...ALL_MEETINGS_LIST_FIELD_IDS])
    expect(next.views[0]?.visible_fields).toContain('attendees')
    expect(next.views[0]?.visible_fields).not.toContain('client_campaign')
    expect(next.views[0]?.visible_fields).not.toEqual(
      expect.arrayContaining(['priority', 'status']),
    )
  })

  it('inserts Client Workspace and Campaign Space without wiping later columns', () => {
    const schema = {
      fields: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'host', name: 'Host', type: 'text' },
        { id: 'call_status', name: 'Call status', type: 'select' },
      ],
      views: [
        {
          id: 'all-meetings',
          visible_fields: ['title', 'host', 'call_status', 'priority'],
        },
      ],
    }
    expect(ensureAllMeetingsListColumns(schema).views[0]?.visible_fields).toEqual([
      'title',
      'campaign_name',
      'space_title',
      'host',
      'attendees',
      'call_status',
      'priority',
    ])
  })

  it('restores Attendees after Host without resetting a customized column order', () => {
    const next = ensureAllMeetingsListColumns({
      fields: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'campaign_name', name: 'Client Workspace', type: 'text' },
        { id: 'space_title', name: 'Campaign Space', type: 'text' },
        { id: 'host', name: 'Host', type: 'text' },
        { id: 'call_status', name: 'Call status', type: 'select' },
      ],
      views: [
        {
          id: 'all-meetings',
          visible_fields: [
            'call_status',
            'title',
            'campaign_name',
            'space_title',
            'host',
            'call_date',
          ],
        },
      ],
    })

    expect(next.views[0]?.visible_fields).toEqual([
      'call_status',
      'title',
      'campaign_name',
      'space_title',
      'host',
      'attendees',
      'call_date',
    ])
  })

  it('leaves spaces without All Meetings unchanged', () => {
    const schema = {
      fields: [{ id: 'title', name: 'Name', type: 'text' as const }],
      views: [{ id: 'today', visible_fields: ['title'] }],
    }
    expect(ensureAllMeetingsListColumns(schema)).toBe(schema)
  })

  it('returns the same schema object when All Meetings already has the workspace columns', () => {
    const schema = {
      fields: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'client_campaign', name: 'Client / Campaign', type: 'text' },
        { id: 'campaign_name', name: 'Client Workspace', type: 'text' },
        { id: 'space_title', name: 'Campaign Space', type: 'text' },
        { id: 'host', name: 'Host', type: 'text' },
        { id: 'attendees', name: 'Attendees', type: 'multi_select' },
        { id: 'call_status', name: 'Call status', type: 'select' },
      ],
      views: [
        {
          id: 'all-meetings',
          visible_fields: [...ALL_MEETINGS_LIST_FIELD_IDS],
        },
      ],
    }
    expect(ensureAllMeetingsListColumns(schema)).toBe(schema)
  })

  it('rewrites a live All Meetings view that still shows Priority and Status', () => {
    const next = ensureAllMeetingsListColumns({
      fields: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'priority', name: 'Priority', type: 'select' },
        { id: 'status', name: 'Status', type: 'select' },
        { id: 'space_title', name: 'Space', type: 'text' },
        { id: 'client_campaign', name: 'Campaign', type: 'text' },
      ],
      views: [
        {
          id: 'all-meetings',
          visible_fields: [
            'title',
            'call_kind',
            'priority',
            'status',
            'attendees',
            'call_date',
            'recording_url',
            'space_title',
          ],
        },
      ],
    })
    expect(next.views[0]?.visible_fields).toEqual([...ALL_MEETINGS_LIST_FIELD_IDS])
    expect(next.views[0]?.visible_fields).toContain('space_title')
    expect(next.views[0]?.visible_fields).not.toContain('client_campaign')
    expect(next.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'campaign_name', name: 'Client Workspace' }),
        expect.objectContaining({ id: 'space_title', name: 'Campaign Space' }),
        expect.objectContaining({ id: 'client_campaign', name: 'Client / Campaign' }),
      ]),
    )
  })
})

describe('withClientWorkspaceColumns', () => {
  it('replaces Client / Campaign with the All Tasks workspace columns', () => {
    expect(
      withAttendeesColumn(
        withClientWorkspaceColumns([
          'title',
          'call_kind',
          'client_campaign',
          'host',
          'call_date',
          'call_status',
          'recording_url',
        ]),
      ),
    ).toEqual([...ALL_MEETINGS_LIST_FIELD_IDS])
  })
})
