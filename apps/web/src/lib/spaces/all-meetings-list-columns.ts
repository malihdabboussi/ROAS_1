import type { SpaceFieldType } from './spaces-api'

export const MAPPED_SPACE_FIELD_ID = 'space_title'
export const CLIENT_WORKSPACE_FIELD_ID = 'campaign_name'

export const ALL_MEETINGS_LIST_FIELD_IDS = [
  'title',
  'call_kind',
  'campaign_name',
  'host',
  'attendees',
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
  name: 'Campaign Space',
  type: 'text',
}

const CLIENT_WORKSPACE_FIELD: MeetingsListField = {
  id: CLIENT_WORKSPACE_FIELD_ID,
  name: 'Client Workspace',
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

const ATTENDEES_FIELD: MeetingsListField = {
  id: 'attendees',
  name: 'Attendees',
  type: 'multi_select',
  required: false,
  options: [],
}

const CALL_STATUS_FIELD: MeetingsListField = {
  id: 'call_status',
  name: 'Call status',
  type: 'select',
  required: false,
  options: [
    { id: 'upcoming', label: 'Upcoming', color: 'slate' },
    { id: 'live', label: 'Live', color: 'emerald' },
    { id: 'completed', label: 'Completed', color: 'blue' },
    { id: 'no_show', label: 'No Show', color: 'red' },
    { id: 'rescheduled', label: 'Rescheduled', color: 'amber' },
  ],
}

const ONE_ROOM_COLUMN_WIDTHS: Record<string, number> = {
  title: 360,
  call_kind: 110,
  campaign_name: 180,
  host: 160,
  attendees: 260,
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

const REQUIRED_FIELDS = [
  CLIENT_CAMPAIGN_FIELD,
  CLIENT_WORKSPACE_FIELD,
  HOST_FIELD,
  ATTENDEES_FIELD,
  CALL_STATUS_FIELD,
]

const FIELD_NAMES: Record<string, string> = {
  client_campaign: CLIENT_CAMPAIGN_FIELD.name,
  campaign_name: CLIENT_WORKSPACE_FIELD.name,
  space_title: MAPPED_SPACE_FIELD.name,
}

/** True when All Meetings still has the old task columns instead of Host + Call status. */
export function allMeetingsNeedsOneRoomColumns(view: MeetingsListView | undefined): boolean {
  const visible = view?.visible_fields ?? []
  return !visible.includes('host') || !visible.includes('call_status')
}

/** Insert Client Workspace in place of the legacy combined/Space columns. */
export function withClientWorkspaceColumns(visible: string[]): string[] {
  if (visible.includes('campaign_name') && !visible.includes('space_title')) return visible
  const without = visible.filter(
    (id) => id !== 'client_campaign' && id !== 'campaign_name' && id !== 'space_title',
  )
  const afterKind = without.indexOf('call_kind')
  const at = afterKind >= 0 ? afterKind + 1 : Math.max(without.indexOf('title') + 1, 0)
  return [...without.slice(0, at), 'campaign_name', ...without.slice(at)]
}

/** Restore the meeting participant column immediately after Host without resetting user order. */
export function withAttendeesColumn(visible: string[]): string[] {
  if (visible.includes('attendees')) return visible
  const afterHost = visible.indexOf('host')
  const at = afterHost >= 0 ? afterHost + 1 : visible.length
  return [...visible.slice(0, at), 'attendees', ...visible.slice(at)]
}

/**
 * All Meetings one-room columns: Client Workspace, Host, Attendees, Call status.
 * Hides Priority and task Status on that view. Does not delete those fields.
 * Client / Campaign mapping stays as a field; it is not a default column.
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
    const nextName = FIELD_NAMES[field.id]
    if (!nextName || field.name === nextName) return field
    fieldsChanged = true
    return { ...field, name: nextName }
  })
  for (const required of REQUIRED_FIELDS) {
    if (fields.some((field) => field.id === required.id)) continue
    fields = [...fields, required]
    fieldsChanged = true
  }

  let viewsChanged = false
  const views = schema.views.map((view) => {
    if (view.id !== 'all-meetings') return view
    if (allMeetingsNeedsOneRoomColumns(view)) {
      viewsChanged = true
      return {
        ...view,
        visible_fields: [...ALL_MEETINGS_LIST_FIELD_IDS],
        column_widths: {
          ...ONE_ROOM_COLUMN_WIDTHS,
          ...view.column_widths,
          campaign_name: 180,
          host: view.column_widths?.host ?? 160,
          attendees: view.column_widths?.attendees ?? 260,
          call_status: view.column_widths?.call_status ?? 140,
        },
        toolbar_call_date_window: view.toolbar_call_date_window ?? 'past_through_tomorrow',
        date_display_formats: {
          ...view.date_display_formats,
          call_date: view.date_display_formats?.call_date ?? 'date_time',
        },
      }
    }
    const visible_fields = withAttendeesColumn(
      withClientWorkspaceColumns(view.visible_fields ?? []),
    )
    if (
      visible_fields === view.visible_fields ||
      arraysEqual(visible_fields, view.visible_fields)
    ) {
      return view
    }
    viewsChanged = true
    return {
      ...view,
      visible_fields,
      column_widths: {
        ...view.column_widths,
        campaign_name: view.column_widths?.campaign_name ?? 180,
        attendees: view.column_widths?.attendees ?? 260,
      },
    }
  })

  if (!fieldsChanged && !viewsChanged) return schema
  return { ...schema, fields, views }
}

function arraysEqual(left: string[], right: string[] | undefined): boolean {
  if (!right || left.length !== right.length) return false
  return left.every((id, index) => id === right[index])
}
