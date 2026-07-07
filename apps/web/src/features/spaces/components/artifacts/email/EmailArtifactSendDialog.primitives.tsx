import { X } from 'lucide-react'
import type { Contact } from '@/lib/contacts/contacts-api'

export interface ProviderOption {
  id: string
  name: string
  supports_broadcast: boolean
}

export interface SenderOption {
  id: string
  name: string
  email: string
}

export interface AudienceOption {
  id: string
  name: string
}

export function displayContactName(contact: Contact): string {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()
  return name || contact.email || 'Unnamed contact'
}

export function toScheduledIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

export function formatScheduleLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function EmailSendPickerDropdown({
  open,
  children,
}: {
  open: boolean
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="z-dropdown absolute left-0 right-0 top-full mt-spacing-1">
      <div className="dropdown-menu-solid dropdown-list-scroll rounded-spacing-2 p-spacing-1">
        {children}
      </div>
    </div>
  )
}

export function RecipientChip({
  label,
  detail,
  onRemove,
}: {
  label: string
  detail?: string | null
  onRemove: () => void
}) {
  return (
    <span className="badge-glass badge-glass-blue gap-spacing-1 px-spacing-2 py-spacing-1 group inline-flex max-w-full items-center rounded-full">
      <span className="body-4 min-w-0 truncate font-medium">{label}</span>
      {detail ? (
        <span className="typo-caption text-muted-foreground min-w-0 truncate">{detail}</span>
      ) : null}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={`Remove ${label}`}
      >
        <X className="icon-xs" />
      </button>
    </span>
  )
}
