import type { Contact } from '@/lib/contacts/contacts-api'
import type { CustomFieldDefinition } from '@/lib/properties/custom-fields'

export interface ContactMergeFieldRow {
  id: string
  label: string
  valuePreview: string
  token: string
}

function formatPreview(v: unknown, max = 48): string {
  if (v == null || v === '') return '—'
  const s = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
  const t = s.trim()
  if (!t) return '—'
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function buildContactMergeFieldRows(
  contact: Contact,
  definitions: CustomFieldDefinition[],
): ContactMergeFieldRow[] {
  const custom = (contact.custom_fields ?? {}) as Record<string, unknown>
  const tagsStr = (contact.tags ?? []).join(', ')
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()

  const builtIn: ContactMergeFieldRow[] = [
    {
      id: 'full_name',
      label: 'Full name',
      valuePreview: formatPreview(fullName || null),
      token: '{{full_name}}',
    },
    {
      id: 'first_name',
      label: 'First name',
      valuePreview: formatPreview(contact.first_name),
      token: '{{first_name}}',
    },
    {
      id: 'last_name',
      label: 'Last name',
      valuePreview: formatPreview(contact.last_name),
      token: '{{last_name}}',
    },
    {
      id: 'email',
      label: 'Email',
      valuePreview: formatPreview(contact.email, 64),
      token: '{{email}}',
    },
    {
      id: 'phone',
      label: 'Phone',
      valuePreview: formatPreview(contact.phone),
      token: '{{phone}}',
    },
    {
      id: 'business_name',
      label: 'Business',
      valuePreview: formatPreview(contact.business_name),
      token: '{{business_name}}',
    },
    {
      id: 'website',
      label: 'Website',
      valuePreview: formatPreview(contact.website, 64),
      token: '{{website}}',
    },
    {
      id: 'address',
      label: 'Address',
      valuePreview: formatPreview(contact.address),
      token: '{{address}}',
    },
    {
      id: 'city',
      label: 'City',
      valuePreview: formatPreview(contact.city),
      token: '{{city}}',
    },
    {
      id: 'state',
      label: 'State',
      valuePreview: formatPreview(contact.state),
      token: '{{state}}',
    },
    {
      id: 'country',
      label: 'Country',
      valuePreview: formatPreview(contact.country),
      token: '{{country}}',
    },
    {
      id: 'source',
      label: 'Source',
      valuePreview: formatPreview(contact.source),
      token: '{{source}}',
    },
    {
      id: 'tags',
      label: 'Tags',
      valuePreview: formatPreview(tagsStr || null, 80),
      token: '{{tags}}',
    },
  ]

  const sortedDefs = [...definitions].sort((a, b) => a.display_order - b.display_order)
  const customRows: ContactMergeFieldRow[] = sortedDefs.map((def) => ({
    id: `cf:${def.id}`,
    label: def.name,
    valuePreview: formatPreview(custom[def.field_key] ?? def.default_value),
    token: `{{${def.field_key}}}`,
  }))

  return [...builtIn, ...customRows]
}

const TOKEN_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function expandContactMergeTokens(
  text: string,
  contact: Contact,
  definitions: CustomFieldDefinition[],
): string {
  const custom = (contact.custom_fields ?? {}) as Record<string, unknown>
  const tagsStr = (contact.tags ?? []).join(', ')
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()

  const map: Record<string, string> = {
    full_name: fullName,
    first_name: contact.first_name ?? '',
    last_name: contact.last_name ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    business_name: contact.business_name ?? '',
    website: contact.website ?? '',
    address: contact.address ?? '',
    city: contact.city ?? '',
    state: contact.state ?? '',
    country: contact.country ?? '',
    source: contact.source ?? '',
    tags: tagsStr,
  }

  for (const def of definitions) {
    const v = custom[def.field_key]
    if (v == null || v === '') {
      map[def.field_key] = def.default_value ?? ''
    } else if (typeof v === 'boolean') {
      map[def.field_key] = v ? 'Yes' : 'No'
    } else {
      map[def.field_key] = String(v)
    }
  }

  return text.replace(TOKEN_RE, (_, key: string) => map[key] ?? '')
}
