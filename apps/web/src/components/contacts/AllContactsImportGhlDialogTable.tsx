import { Check } from 'lucide-react'
import type { GhlListContact } from '@/lib/contacts'
import { getGhlContactDisplayName } from './AllContactsImportGhlDialog.helpers'

type AllContactsImportGhlDialogTableProps = {
  contacts: GhlListContact[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
}

export function AllContactsImportGhlDialogTable({
  contacts,
  selectedIds,
  onToggle,
  onToggleAll,
}: AllContactsImportGhlDialogTableProps) {
  const allFilteredSelected =
    contacts.length > 0 && contacts.every((contact) => selectedIds.has(contact.id))

  return (
    <table className="w-full">
      <thead>
        <tr className="border-border border-b">
          <th className="w-spacing-10 px-spacing-2 py-spacing-2 text-center">
            <button
              type="button"
              onClick={onToggleAll}
              className="hover:bg-hover-subtle rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center"
            >
              <span
                className={`rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center border border-dotted ${
                  allFilteredSelected ? 'border-primary/50' : 'border-border'
                }`}
                aria-hidden
              >
                {allFilteredSelected ? (
                  <Check className="icon-xs text-primary" aria-hidden />
                ) : (
                  <div className="icon-xs" aria-hidden />
                )}
              </span>
            </button>
          </th>
          <th className="typo-caption text-muted-foreground px-spacing-2 py-spacing-2 text-left uppercase">
            Name
          </th>
          <th className="typo-caption text-muted-foreground px-spacing-2 py-spacing-2 text-left uppercase">
            Email
          </th>
          <th className="typo-caption text-muted-foreground px-spacing-2 py-spacing-2 text-left uppercase">
            Phone
          </th>
        </tr>
      </thead>
      <tbody>
        {contacts.map((contact) => {
          const selected = selectedIds.has(contact.id)
          return (
            <tr
              key={contact.id}
              className="border-border hover:bg-hover-subtle cursor-pointer border-b"
              onClick={() => onToggle(contact.id)}
            >
              <td
                className="px-spacing-2 py-spacing-2 text-center"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onToggle(contact.id)}
                  className="hover:bg-hover-subtle rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center"
                >
                  <span
                    className={`rounded-spacing-1 p-spacing-0-5 inline-flex items-center justify-center border border-dotted ${
                      selected ? 'border-primary/50' : 'border-border'
                    }`}
                    aria-hidden
                  >
                    {selected ? (
                      <Check className="icon-xs text-primary" aria-hidden />
                    ) : (
                      <div className="icon-xs" aria-hidden />
                    )}
                  </span>
                </button>
              </td>
              <td className="body-3 px-spacing-2 py-spacing-2">
                {getGhlContactDisplayName(contact)}
              </td>
              <td className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                {contact.email || '\u2014'}
              </td>
              <td className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                {contact.phone || '\u2014'}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
