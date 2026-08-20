import type { SpaceFieldType } from './spaces-api'

export const MAPPED_SPACE_FIELD_ID = 'space_title'

export const ALL_MEETINGS_LIST_FIELD_IDS = [
  'title',
  'call_kind',
  'client_campaign',
  'host',
  'call_date',
  'call_status',
  'recording_url',
] as const

type MeetingsListField = {
  id: string
  name: string
  type: SpaceFieldType | string
  required?: boolean
  options?: Array<{ id: string; label: string; color?: string }>
}

export const MAPPED_SPACE_FIELD: MeetingsListField = {
  id: MAPPED_SPACE_FIELD_ID,
  name: 'Space',
  type: 'text',
}

const CLIENT_CAMPAIGN_FIELD: MeetingsListField = {
  id: 'client_campaign',
  name: 'Client / Campaign',
  type: 'text',
}

const HOST_FIELD: MeetingsListField = {
  id: 'host',
  name: 'Host',
  type: 'text',
}

const CALL_STATUS_FIELD: MeetingsListField = {
  id: 'call_status',
  name: 'Call status',
  type: 'select',
  required: false,
  options: [
    { id: 'live', label: 'Live', color: 'emerald' },
    { id: 'completed', label: 'Completed', color: 'blue' },
    { id: 'no_show', label: 'No Show', color: 'red' },
    { id: 'rescheduled', label: 'Rescheduled', color: 'amber' },
  ],
}

const ONE_ROOM_COLUMN_WIDTHS: Record<string, number> = {
  title: 360,
  call_kind: 110,
  client_campaign: 240,
  host: 160,
  call_date: 170,
  call_status: 140,
  recording_url: 220,
}

type MeetingsListView = {
  id?: string
  visible_fields?: string[]
  column_widths?: Record<string, number>
  toolbar_call_date_window?: 'past_through_tomorrow' | 'all'
  date_display_formats?: Record<string, string>
}

type MeetingsListSchema<TField extends MeetingsListField, TView extends MeetingsListView> = {
  fields: TField[]
  views: TView[]
}

const REQUIRED_FIELDS = [CLIENT_CAMPAIGN_FIELD, HOST_FIELD, CALL_STATUS_FIELD]

/** True when All Meetings still has the old task columns instead of Host + Call status. */
export function allMeetingsNeedsOneRoomColumns(view: MeetingsListView | undefined): boolean {
  const visible = view?.visible_fields ?? []
  return !visible.includes('host') || !visible.includes('call_status')
}

/**
 * All Meetings one-room columns: Client / Campaign, Host, Call status.
 * Hides Priority and task Status on that view. Does not delete those fields.
 * Space stays available as a field; it is not a default All Meetings column.
 */
export function ensureAllMeetingsListColumns<
  TField extends MeetingsListField,
  TView extends MeetingsListView,
>(
  schema: MeetingsListSchema<TField, TView>,
): MeetingsListSchema<TField | MeetingsListField, TView> {
  if (!schema.views.some((view) => view.id === 'all-meetings')) return schema

  let fieldsChanged = false
  let fields: Array<TField | MeetingsListField> = schema.fields.map((field) => {
    if (field.id !== 'client_campaign' || field.name === CLIENT_CAMPAIGN_FIELD.name) return field
    fieldsChanged = true
    return { ...field, name: CLIENT_CAMPAIGN_FIELD.name }
  })
  for (const required of REQUIRED_FIELDS) {
    if (fields.some((field) => field.id === required.id)) continue
    fields = [...fields, required]
    fieldsChanged = true
  }

  let viewsChanged = false
  const views = schema.views.map((view) => {
    if (view.id !== 'all-meetings') return view
    if (!allMeetingsNeedsOneRoomColumns(view)) return view
    viewsChanged = true
    return {
      ...view,
      visible_fields: [...ALL_MEETINGS_LIST_FIELD_IDS],
      column_widths: {
        ...ONE_ROOM_COLUMN_WIDTHS,
        ...view.column_widths,
        client_campaign: 240,
        host: view.column_widths?.host ?? 160,
        call_status: view.column_widths?.call_status ?? 140,
      },
      toolbar_call_date_window: view.toolbar_call_date_window ?? 'past_through_tomorrow',
      date_display_formats: {
        ...view.date_display_formats,
        call_date: view.date_display_formats?.call_date ?? 'date_time',
      },
    }
  })

  if (!fieldsChanged && !viewsChanged) return schema
  return { ...schema, fields, views }
}
