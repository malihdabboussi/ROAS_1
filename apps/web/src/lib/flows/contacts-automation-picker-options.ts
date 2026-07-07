export type ContactsAutomationPickerOption = {
  id: string
  label: string
  color?: string
}

export type ContactsAutomationView = {
  type: string
  contacts_config?: {
    tag_options?: ContactsAutomationPickerOption[]
    contact_type_options?: ContactsAutomationPickerOption[]
  }
}

/** Default contact stages when no `contact_type_options` exist on contacts views. */
const DEFAULT_CONTACT_TYPE_OPTIONS: ContactsAutomationPickerOption[] = [
  { id: 'lead', label: 'lead', color: 'yellow' },
  { id: 'customer', label: 'customer', color: 'green' },
  { id: 'team_of_customer', label: 'team of customer', color: 'blue' },
  { id: 'cofounder', label: 'cofounder', color: 'purple' },
  { id: 'team_member', label: 'team member', color: 'purple' },
  { id: 'vendor', label: 'vendor', color: 'orange' },
  { id: 'investor', label: 'investor', color: 'indigo' },
  { id: 'peer', label: 'peer', color: 'cyan' },
  { id: 'friend', label: 'friend', color: 'pink' },
  { id: 'family', label: 'family', color: 'pink' },
  { id: 'unknown', label: 'unknown', color: 'gray' },
]

/**
 * Merge tag + contact type options from all contacts views in the space schema
 * (same sources as the Contacts UI pickers).
 */
export function mergeContactsViewsPickerOptions(views: ContactsAutomationView[]): {
  tagOptions: ContactsAutomationPickerOption[]
  typeOptions: ContactsAutomationPickerOption[]
} {
  const tagById = new Map<string, ContactsAutomationPickerOption>()
  const typeById = new Map<string, ContactsAutomationPickerOption>()

  for (const view of views) {
    if (view.type !== 'contacts') continue
    const contactsConfig = view.contacts_config
    for (const option of contactsConfig?.tag_options ?? []) tagById.set(option.id, option)
    for (const option of contactsConfig?.contact_type_options ?? []) {
      typeById.set(option.id, option)
    }
  }
  for (const option of DEFAULT_CONTACT_TYPE_OPTIONS) {
    if (!typeById.has(option.id)) typeById.set(option.id, option)
  }

  return {
    tagOptions: [...tagById.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    ),
    typeOptions: [...typeById.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
    ),
  }
}
