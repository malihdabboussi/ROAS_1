import type { SpaceFieldType } from './spaces-api'

export const MAPPED_SPACE_FIELD_ID = 'space_title'

export const ALL_MEETINGS_LIST_FIELD_IDS = [
  'title',
  'call_kind',
  'client_campaign',
  'space_title',
  'host',
  'call_date',
  'call_status',
  'recording_url',
] as const

type MeetingsListField = {
  id: string
  name: string
  type: SpaceFieldType | string
}

export const MAPPED_SPACE_FIELD: MeetingsListField = {
  id: MAPPED_SPACE_FIELD_ID,
  name: 'Space',
  type: 'text',
}

type MeetingsListView = {
  id?: string
  visible_fields?: string[]
  column_widths?: Record<string, number>
}

type MeetingsListSchema<TField extends MeetingsListField, TView extends MeetingsListView> = {
  fields: TField[]
  views: TView[]
}

/** All Meetings always shows Campaign + Space, including on spaces created before those columns. */
export function ensureAllMeetingsListColumns<
  TField extends MeetingsListField,
  TView extends MeetingsListView,
>(
  schema: MeetingsListSchema<TField, TView>,
): MeetingsListSchema<TField | MeetingsListField, TView> {
  if (!schema.views.some((view) => view.id === 'all-meetings')) return schema

  const fields = schema.fields.some((field) => field.id === MAPPED_SPACE_FIELD_ID)
    ? schema.fields
    : [...schema.fields, MAPPED_SPACE_FIELD]
  const namedFields = fields.map((field) =>
    field.id === 'client_campaign' ? { ...field, name: 'Campaign' } : field,
  ) as Array<TField | MeetingsListField>

  const views = schema.views.map((view) => {
    if (view.id !== 'all-meetings') return view
    const visible = [...(view.visible_fields ?? [])]
    insertAfter(visible, 'client_campaign', 'call_kind')
    insertAfter(visible, MAPPED_SPACE_FIELD_ID, 'client_campaign')
    return {
      ...view,
      visible_fields: visible,
      column_widths: {
        ...view.column_widths,
        client_campaign: view.column_widths?.client_campaign ?? 200,
        [MAPPED_SPACE_FIELD_ID]: view.column_widths?.[MAPPED_SPACE_FIELD_ID] ?? 180,
      },
    }
  })

  return { ...schema, fields: namedFields, views }
}

function insertAfter(ids: string[], id: string, afterId: string) {
  if (ids.includes(id)) return
  const index = ids.indexOf(afterId)
  if (index >= 0) ids.splice(index + 1, 0, id)
  else ids.push(id)
}
