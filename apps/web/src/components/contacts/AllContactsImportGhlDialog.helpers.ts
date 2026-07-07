import type { GhlListContact } from '@/lib/contacts'

export function getGhlContactDisplayName(contact: GhlListContact): string {
  if (contact.name?.trim()) return contact.name.trim()
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
  return name || '\u2014'
}

export function getGhlImportContacts(
  contacts: GhlListContact[],
  selectedIds: Set<string>,
): Array<{
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  contact_source: string
  contact_source_detail: string
}> {
  return contacts
    .filter((contact) => selectedIds.has(contact.id))
    .map((contact) => {
      const email = (contact.email || '').trim().toLowerCase()
      if (!email) return null
      return {
        email,
        first_name: contact.firstName?.trim() || null,
        last_name: contact.lastName?.trim() || null,
        phone: contact.phone?.trim() || null,
        contact_source: 'import',
        contact_source_detail: 'gohighlevel',
      }
    })
    .filter(Boolean) as Array<{
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    contact_source: string
    contact_source_detail: string
  }>
}
