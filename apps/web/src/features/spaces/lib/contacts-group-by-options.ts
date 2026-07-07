import type { ContactsGroupBy } from '../types/space-schema'

export const CONTACTS_GROUP_BY_OPTIONS: ReadonlyArray<{ id: ContactsGroupBy; label: string }> = [
  { id: 'contact_type', label: 'Stage' },
  { id: 'contact_source', label: 'Source' },
  { id: 'tags', label: 'Tags' },
  { id: 'funnel', label: 'Funnel' },
]
