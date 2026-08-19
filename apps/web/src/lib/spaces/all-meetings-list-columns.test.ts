import { describe, expect, it } from 'vitest'
import { ensureAllMeetingsListColumns } from './all-meetings-list-columns'

describe('ensureAllMeetingsListColumns', () => {
  it('adds Campaign and Space to an existing All Meetings view', () => {
    const next = ensureAllMeetingsListColumns({
      fields: [
        { id: 'title', name: 'Name', type: 'text' },
        { id: 'call_kind', name: 'Call Kind', type: 'select' },
        { id: 'client_campaign', name: 'Client / Campaign', type: 'text' },
        { id: 'host', name: 'Host', type: 'text' },
      ],
      views: [
        {
          id: 'all-meetings',
          visible_fields: ['title', 'call_kind', 'client_campaign', 'host'],
          column_widths: { title: 360 },
        },
      ],
    })

    expect(next.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'client_campaign', name: 'Campaign' }),
        expect.objectContaining({ id: 'space_title', name: 'Space' }),
      ]),
    )
    expect(next.views[0]?.visible_fields).toEqual([
      'title',
      'call_kind',
      'client_campaign',
      'space_title',
      'host',
    ])
  })

  it('leaves spaces without All Meetings unchanged', () => {
    const schema = {
      fields: [{ id: 'title', name: 'Name', type: 'text' as const }],
      views: [{ id: 'today', visible_fields: ['title'] }],
    }
    expect(ensureAllMeetingsListColumns(schema)).toEqual(schema)
  })
})
