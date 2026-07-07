import { Calendar, Loader2, Search, Send, X } from 'lucide-react'
import type { EmailSenderIdentity } from '@/lib/email'
import type { Contact } from '@/lib/contacts/contacts-api'
import {
  type AudienceOption,
  displayContactName,
  EmailSendPickerDropdown,
  formatScheduleLabel,
  RecipientChip,
} from './EmailArtifactSendDialog.primitives'

export function EmailSendPeopleSection({
  senderIdentities,
  contactSearch,
  contactPickerOpen,
  contactsLoading,
  availableContacts,
  selectedContacts,
  onAddContact,
  onContactPickerOpenChange,
  onContactSearchChange,
  onOpenWorkspaceSettings,
  onRemoveContact,
}: {
  senderIdentities: EmailSenderIdentity[]
  contactSearch: string
  contactPickerOpen: boolean
  contactsLoading: boolean
  availableContacts: Contact[]
  selectedContacts: Contact[]
  onAddContact: (contact: Contact) => void
  onContactPickerOpenChange: (open: boolean) => void
  onContactSearchChange: (next: string) => void
  onOpenWorkspaceSettings: () => void
  onRemoveContact: (contactId: string) => void
}) {
  return (
    <>
      {senderIdentities.length === 0 ? (
        <div className="border-border rounded-spacing-2 bg-secondary/30 p-spacing-3">
          <p className="body-3 text-muted-foreground">
            Add a verified sender before sending to people.
          </p>
          <button
            type="button"
            onClick={onOpenWorkspaceSettings}
            className="body-3 text-primary mt-spacing-2 font-medium hover:underline"
          >
            Open Email settings
          </button>
        </div>
      ) : null}

      <div className="gap-spacing-2 flex flex-col">
        <label className="body-3 text-foreground font-medium">People</label>
        <div className="relative">
          <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
          <input
            value={contactSearch}
            onFocus={() => onContactPickerOpenChange(true)}
            onBlur={() => setTimeout(() => onContactPickerOpenChange(false), 120)}
            onChange={(event) => {
              onContactSearchChange(event.target.value)
              onContactPickerOpenChange(true)
            }}
            placeholder="Search contacts..."
            className="input-leading input-glass body-3 h-spacing-9 w-full"
          />
          <EmailSendPickerDropdown open={contactPickerOpen}>
            {contactsLoading ? (
              <div className="body-3 text-muted-foreground p-spacing-3 gap-spacing-2 flex items-center">
                <Loader2 className="icon-sm animate-spin" />
                Searching...
              </div>
            ) : availableContacts.length === 0 ? (
              <p className="body-3 text-muted-foreground p-spacing-3">No people found</p>
            ) : (
              availableContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onAddContact(contact)}
                  className="hover:bg-hover-subtle rounded-spacing-1 px-spacing-2 py-spacing-2 body-3 flex w-full items-center text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate">
                      {displayContactName(contact)}
                    </span>
                    <span className="typo-caption text-muted-foreground block truncate">
                      {contact.email}
                    </span>
                  </span>
                </button>
              ))
            )}
          </EmailSendPickerDropdown>
        </div>
        {selectedContacts.length > 0 ? (
          <div className="gap-spacing-1 flex flex-wrap">
            {selectedContacts.map((contact) => (
              <RecipientChip
                key={contact.id}
                label={displayContactName(contact)}
                detail={contact.email}
                onRemove={() => onRemoveContact(contact.id)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

export function EmailSendAudienceSection({
  addList,
  addSegment,
  filteredLists,
  filteredSegments,
  listPickerOpen,
  listSearch,
  providerLoading,
  segmentPickerOpen,
  segmentSearch,
  selectedList,
  selectedSegment,
  onAddListChange,
  onAddSegmentChange,
  onListPickerOpenChange,
  onListSearchChange,
  onListSelect,
  onSegmentPickerOpenChange,
  onSegmentSearchChange,
  onSegmentSelect,
}: {
  addList: boolean
  addSegment: boolean
  filteredLists: AudienceOption[]
  filteredSegments: AudienceOption[]
  listPickerOpen: boolean
  listSearch: string
  providerLoading: boolean
  segmentPickerOpen: boolean
  segmentSearch: string
  selectedList?: AudienceOption
  selectedSegment?: AudienceOption
  onAddListChange: (checked: boolean) => void
  onAddSegmentChange: (checked: boolean) => void
  onListPickerOpenChange: (open: boolean) => void
  onListSearchChange: (next: string) => void
  onListSelect: (listId: string) => void
  onSegmentPickerOpenChange: (open: boolean) => void
  onSegmentSearchChange: (next: string) => void
  onSegmentSelect: (segmentId: string) => void
}) {
  const openListPicker = () => {
    onSegmentPickerOpenChange(false)
    onListPickerOpenChange(true)
  }

  const openSegmentPicker = () => {
    onListPickerOpenChange(false)
    onSegmentPickerOpenChange(true)
  }

  return (
    <div className="border-border rounded-spacing-2 p-spacing-3 gap-spacing-3 flex flex-col border">
      <div className="gap-spacing-2 body-3 text-foreground flex items-center font-medium">
        <input
          type="checkbox"
          checked={addList}
          onChange={(event) => onAddListChange(event.target.checked)}
          className="checkbox-glass-green shrink-0"
          aria-label="Add list"
        />
        <span>Add list</span>
      </div>
      {addList ? (
        <div className="gap-spacing-2 flex flex-col">
          {selectedList ? (
            <div className="gap-spacing-1 flex flex-wrap">
              <RecipientChip label={selectedList.name} onRemove={() => onListSelect('')} />
            </div>
          ) : null}
          <div className="relative">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
            <input
              value={listSearch}
              onFocus={openListPicker}
              onClick={openListPicker}
              onBlur={() => setTimeout(() => onListPickerOpenChange(false), 120)}
              onChange={(event) => onListSearchChange(event.target.value)}
              placeholder={providerLoading ? 'Loading lists...' : 'Search lists...'}
              className="input-leading input-glass body-3 h-spacing-9 w-full"
            />
            <EmailSendPickerDropdown open={listPickerOpen}>
              {providerLoading ? (
                <div className="body-3 text-muted-foreground p-spacing-3 gap-spacing-2 flex items-center">
                  <Loader2 className="icon-sm animate-spin" />
                  Loading lists...
                </div>
              ) : filteredLists.length === 0 ? (
                <p className="body-3 text-muted-foreground p-spacing-3">No lists found</p>
              ) : (
                filteredLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onListSelect(list.id)}
                    className="hover:bg-hover-subtle rounded-spacing-1 px-spacing-2 py-spacing-2 body-3 text-foreground gap-spacing-2 flex w-full items-center text-left"
                  >
                    <span className="min-w-0 flex-1 truncate">{list.name}</span>
                  </button>
                ))
              )}
            </EmailSendPickerDropdown>
          </div>
        </div>
      ) : null}

      <div className="gap-spacing-2 body-3 text-foreground flex items-center font-medium">
        <input
          type="checkbox"
          checked={addSegment}
          onChange={(event) => onAddSegmentChange(event.target.checked)}
          className="checkbox-glass-green shrink-0"
          aria-label="Add segment"
        />
        <span>Add segment</span>
      </div>
      {addSegment ? (
        <div className="gap-spacing-2 flex flex-col">
          {selectedSegment ? (
            <div className="gap-spacing-1 flex flex-wrap">
              <RecipientChip label={selectedSegment.name} onRemove={() => onSegmentSelect('')} />
            </div>
          ) : null}
          <div className="relative">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
            <input
              value={segmentSearch}
              onFocus={openSegmentPicker}
              onClick={openSegmentPicker}
              onBlur={() => setTimeout(() => onSegmentPickerOpenChange(false), 120)}
              onChange={(event) => onSegmentSearchChange(event.target.value)}
              placeholder={providerLoading ? 'Loading segments...' : 'Search segments...'}
              className="input-leading input-glass body-3 h-spacing-9 w-full"
            />
            <EmailSendPickerDropdown open={segmentPickerOpen}>
              {providerLoading ? (
                <div className="body-3 text-muted-foreground p-spacing-3 gap-spacing-2 flex items-center">
                  <Loader2 className="icon-sm animate-spin" />
                  Loading segments...
                </div>
              ) : filteredSegments.length === 0 ? (
                <p className="body-3 text-muted-foreground p-spacing-3">No segments found</p>
              ) : (
                filteredSegments.map((segment) => (
                  <button
                    key={segment.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSegmentSelect(segment.id)}
                    className="hover:bg-hover-subtle rounded-spacing-1 px-spacing-2 py-spacing-2 body-3 text-foreground gap-spacing-2 flex w-full items-center text-left"
                  >
                    <span className="min-w-0 flex-1 truncate">{segment.name}</span>
                  </button>
                ))
              )}
            </EmailSendPickerDropdown>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function EmailSendScheduleSummary({
  scheduleDate,
  onClear,
}: {
  scheduleDate: string
  onClear: () => void
}) {
  if (!scheduleDate) return null

  return (
    <div className="gap-spacing-2 body-3 text-muted-foreground flex items-center">
      <Calendar className="icon-sm shrink-0" />
      <span className="min-w-0 flex-1">
        Scheduled for{' '}
        <span className="text-foreground font-medium">{formatScheduleLabel(scheduleDate)}</span>
      </span>
      <button type="button" onClick={onClear} className="btn-icon-bare shrink-0" aria-label="Clear schedule">
        <X className="icon-xs" />
      </button>
    </div>
  )
}

export function EmailSendDialogFooter({
  scheduleDate,
  sending,
  senderIdentitiesLoading,
  onOpenSchedule,
  onSend,
}: {
  scheduleDate: string
  sending: boolean
  senderIdentitiesLoading: boolean
  onOpenSchedule: () => void
  onSend: () => void
}) {
  return (
    <div className="p-spacing-4 gap-spacing-3 flex shrink-0 items-center justify-end">
      <button
        type="button"
        onClick={onOpenSchedule}
        className={`btn-icon-bare shrink-0 ${scheduleDate ? 'text-primary' : ''}`}
        aria-label="Schedule send"
      >
        <Calendar className="icon-sm" />
      </button>
      <button
        type="button"
        onClick={onSend}
        disabled={sending || senderIdentitiesLoading}
        className="button-default button-glass-primary gap-spacing-2 flex items-center justify-center"
      >
        {sending ? <Loader2 className="icon-sm animate-spin" /> : <Send className="icon-sm" />}
        <span>{sending ? 'Sending...' : 'Send email'}</span>
      </button>
    </div>
  )
}
