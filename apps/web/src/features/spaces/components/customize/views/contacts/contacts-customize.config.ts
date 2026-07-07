import type { ComponentType } from 'react'
import { CircleDot, Clock, FileText, Link, Mail, Phone, RefreshCw, Tags, Type, User } from 'lucide-react'
import { CONTACT_VIEW_COLUMN_META } from '../../../../lib/contact-view-field-meta'
import type { ContactsConfig, ViewDef } from '../../../../types/space-schema'

export const CONTACTS_SORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'created_at', label: 'Created date' },
  { id: 'email', label: 'Email' },
  { id: 'name', label: 'Name' },
]

export function getContactsConfig(view: ViewDef): ContactsConfig {
  return view.contacts_config ?? {}
}

export function patchContactsConfig(
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>,
  current: ContactsConfig,
  patch: Partial<ContactsConfig>,
) {
  void onViewPatch({ contacts_config: { ...current, ...patch } })
}

const CONTACT_FIELD_ICON_BY_ID: Record<string, ComponentType<{ className?: string }>> = {
  title: User,
  email: Mail,
  first_name: User,
  last_name: User,
  phone: Phone,
  tags: Tags,
  contact_type: CircleDot,
  contact_source: Type,
  business_name: Type,
  website: Link,
  address: Type,
  city: Type,
  state: Type,
  country: Type,
  notes: FileText,
  created_at: Clock,
  updated_at: RefreshCw,
}

export const CONTACT_FIELD_DEFS: {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
}[] = CONTACT_VIEW_COLUMN_META.map((m) => ({
  id: m.id,
  label: m.name,
  icon: CONTACT_FIELD_ICON_BY_ID[m.id] ?? Type,
}))
