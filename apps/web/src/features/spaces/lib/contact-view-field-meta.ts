import type { FieldDef, FieldType, SelectOption } from '../types/space-schema'

/** CRM contact columns for Spaces Contacts view (order = default column order). */
export const CONTACT_VIEW_COLUMN_META: readonly { id: string; name: string; type: FieldType }[] = [
  { id: 'title', name: 'Name', type: 'text' },
  { id: 'email', name: 'Email', type: 'email' },
  { id: 'first_name', name: 'First Name', type: 'text' },
  { id: 'last_name', name: 'Last Name', type: 'text' },
  { id: 'phone', name: 'Phone', type: 'phone' },
  { id: 'tags', name: 'Tags', type: 'multi_select' },
  { id: 'contact_type', name: 'Role', type: 'multi_select' },
  { id: 'contact_source', name: 'Contact Source', type: 'multi_select' },
  { id: 'business_name', name: 'Business Name', type: 'text' },
  { id: 'website', name: 'Website', type: 'url' },
  { id: 'address', name: 'Address', type: 'text' },
  { id: 'city', name: 'City', type: 'text' },
  { id: 'state', name: 'State', type: 'text' },
  { id: 'country', name: 'Country', type: 'text' },
  { id: 'notes', name: 'Notes', type: 'text' },
  { id: 'created_at', name: 'Created', type: 'created_at' },
  { id: 'updated_at', name: 'Updated', type: 'updated_at' },
] as const

const META_BY_ID = new Map(CONTACT_VIEW_COLUMN_META.map((m) => [m.id, m]))

/** Fixed channel enum for contact_source (matches the backend CHECK constraint). */
export const CONTACT_SOURCE_OPTIONS: SelectOption[] = [
  { id: 'funnel', label: 'Funnel', color: 'blue' },
  { id: 'form', label: 'Form', color: 'purple' },
  { id: 'widget', label: 'Widget', color: 'green' },
  { id: 'telegram', label: 'Telegram', color: 'cyan' },
  { id: 'import', label: 'Import', color: 'orange' },
  { id: 'manual', label: 'Manual', color: 'gray' },
  { id: 'automation', label: 'Automation', color: 'indigo' },
  { id: 'integration', label: 'Integration', color: 'pink' },
]

export const DEFAULT_CONTACT_VISIBLE_FIELD_IDS: string[] = CONTACT_VIEW_COLUMN_META.map((c) => c.id)

export function contactViewFieldDef(id: string): FieldDef {
  const m = META_BY_ID.get(id)
  if (m) {
    if (m.id === 'contact_source') {
      return { id: m.id, name: m.name, type: m.type, system: true, options: CONTACT_SOURCE_OPTIONS }
    }
    return { id: m.id, name: m.name, type: m.type, system: true }
  }
  return { id, name: id, type: 'text', system: true }
}

/** Valid ordered ids for the view; ensures synthetic Name (`title`) column exists. */
export function normalizeContactVisibleFieldOrderIds(raw: string[] | undefined): string[] {
  const ordered = raw?.length
    ? raw.filter((id) => META_BY_ID.has(id))
    : [...DEFAULT_CONTACT_VISIBLE_FIELD_IDS]
  if (!ordered.includes('title')) return ['title', ...ordered.filter((id) => id !== 'title')]
  return ordered
}

export function buildContactVisibleFieldDefs(raw: string[] | undefined): FieldDef[] {
  return normalizeContactVisibleFieldOrderIds(raw).map(contactViewFieldDef)
}
