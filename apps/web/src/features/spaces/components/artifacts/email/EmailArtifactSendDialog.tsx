'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useWorkspaceSettingsModal } from '@/lib/settings'
import { SpacesScheduleDateTimeModal } from '@/features/spaces/components/cells/date-picker/SpacesScheduleDateTimeModal'
import {
  nextSpacesScheduleDefault,
  parseLocalSpacesScheduleValue,
  toLocalSpacesScheduleValue,
} from '@/features/spaces/lib/spaces-schedule-datetime'
import { sendContactEmail } from '@/features/spaces/services/contact-communications.service'
import { sendCampaignEmailArtifact, type EmailArtifact } from '@/lib/artifacts'
import type { Contact } from '@/lib/contacts/contacts-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  EmailSendAudienceSection,
  EmailSendDialogFooter,
  EmailSendPeopleSection,
  EmailSendScheduleSummary,
} from './EmailArtifactSendDialog.sections'
import { toScheduledIso } from './EmailArtifactSendDialog.primitives'
import { useEmailArtifactSendOptions } from './use-email-artifact-send-options'

export function EmailArtifactSendDialog({
  email,
  subject,
  body,
  open,
  onClose,
  onSent,
}: {
  email: EmailArtifact
  subject: string
  body: string
  open: boolean
  onClose: () => void
  onSent?: () => void
}) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleDraft, setScheduleDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [contactPickerOpen, setContactPickerOpen] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [addList, setAddList] = useState(false)
  const [addSegment, setAddSegment] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [segmentSearch, setSegmentSearch] = useState('')
  const [listPickerOpen, setListPickerOpen] = useState(false)
  const [segmentPickerOpen, setSegmentPickerOpen] = useState(false)

  const {
    contactSearch,
    contacts,
    contactsLoading,
    listId,
    lists,
    peopleSenderId,
    provider,
    providerLoading,
    providerSenderId,
    providerSenders,
    segmentId,
    segments,
    senderIdentities,
    senderIdentitiesLoading,
    setContactSearch,
    setListId,
    setSegmentId,
  } = useEmailArtifactSendOptions(open)

  const availableContacts = useMemo(
    () =>
      contacts.filter(
        (contact) => !selectedContacts.some((selected) => selected.id === contact.id),
      ),
    [contacts, selectedContacts],
  )
  const selectedPeopleSender = senderIdentities.find((sender) => sender.id === peopleSenderId)
  const selectedProviderSender = providerSenders.find((sender) => sender.id === providerSenderId)
  const selectedList = lists.find((list) => list.id === listId)
  const selectedSegment = segments.find((segment) => segment.id === segmentId)
  const filteredLists = useMemo(
    () => lists.filter((list) => list.name.toLowerCase().includes(listSearch.trim().toLowerCase())),
    [listSearch, lists],
  )
  const filteredSegments = useMemo(
    () =>
      segments.filter((segment) =>
        segment.name.toLowerCase().includes(segmentSearch.trim().toLowerCase()),
      ),
    [segmentSearch, segments],
  )

  if (!open) return null

  const addContact = (contact: Contact) => {
    setSelectedContacts((prev) =>
      prev.some((selected) => selected.id === contact.id) ? prev : [...prev, contact],
    )
    setContactSearch('')
    setContactPickerOpen(false)
  }

  const sendToPeople = async () => {
    if (!selectedPeopleSender) throw new Error('Choose a sender')
    if (selectedContacts.length === 0) {
      throw new Error('Choose at least one contact')
    }
    for (const contact of selectedContacts) {
      await sendContactEmail(contact.id, {
        subject,
        body,
        from_identity_id: selectedPeopleSender.id,
      })
    }
  }

  const sendToAudience = async () => {
    if (!provider) throw new Error('No email audience provider connected')
    if (!selectedProviderSender) throw new Error('No sender available for lists or segments')
    if (!listId && !segmentId) {
      throw new Error('Choose a list or segment')
    }
    if (scheduleDate && !toScheduledIso(scheduleDate)) {
      throw new Error('Choose a schedule time')
    }
    await sendCampaignEmailArtifact({
      email_id: email.id,
      provider,
      list_id: listId || undefined,
      segment_id: segmentId || undefined,
      from_email: selectedProviderSender.email,
      from_name: selectedProviderSender.name,
      schedule_date: scheduleDate ? toScheduledIso(scheduleDate) : undefined,
    })
  }

  const handleSend = async () => {
    if (sending) return
    const trimmedSubject = subject.trim()
    const trimmedBody = body.trim()
    if (!trimmedSubject || !trimmedBody || trimmedBody === '<p></p>') {
      toast.error('Subject and body are required')
      return
    }
    setSending(true)
    try {
      const sendsToPeople = selectedContacts.length > 0
      const sendsToAudience = Boolean(listId || segmentId)
      if (!sendsToPeople && !sendsToAudience) {
        toast.error('Choose who should get this email')
        return
      }
      if (sendsToPeople) await sendToPeople()
      if (sendsToAudience) await sendToAudience()
      if (sendsToPeople && !sendsToAudience) {
        toast.success(
          `Email sent to ${selectedContacts.length} contact${selectedContacts.length === 1 ? '' : 's'}`,
        )
      } else {
        toast.success(scheduleDate ? 'Email scheduled' : 'Email send started')
      }
      onSent?.()
      onClose()
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to send email'))
    } finally {
      setSending(false)
    }
  }

  const openSchedulePicker = () => {
    const seed = scheduleDate
      ? (parseLocalSpacesScheduleValue(scheduleDate) ?? nextSpacesScheduleDefault())
      : nextSpacesScheduleDefault()
    setScheduleDraft(toLocalSpacesScheduleValue(seed))
    setScheduleModalOpen(true)
  }

  return (
    <div className="z-modal fixed inset-0 flex items-center justify-center p-spacing-4">
      <button
        type="button"
        className="bg-modal-overlay absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="surface-card border-border rounded-spacing-3 relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col border shadow-xl">
        <div className="px-spacing-4 py-spacing-3 gap-spacing-2 flex shrink-0 items-center justify-between">
          <div className="min-w-0">
            <h3 className="body-2 text-foreground font-semibold">Send email</h3>
            <p className="typo-caption text-muted-foreground truncate">
              {subject || 'Untitled Email'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
            <X className="icon-sm" />
          </button>
        </div>

        <div className="p-spacing-4 gap-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {senderIdentitiesLoading ? (
            <div className="py-spacing-8 h-spacing-60 flex flex-1 items-center justify-center">
              <VibeyLoadingOrb state="processing" size="md" />
            </div>
          ) : (
            <>
              <EmailSendPeopleSection
                senderIdentities={senderIdentities}
                contactSearch={contactSearch}
                contactPickerOpen={contactPickerOpen}
                contactsLoading={contactsLoading}
                availableContacts={availableContacts}
                selectedContacts={selectedContacts}
                onAddContact={addContact}
                onContactPickerOpenChange={setContactPickerOpen}
                onContactSearchChange={setContactSearch}
                onOpenWorkspaceSettings={() => openWorkspaceSettings('email')}
                onRemoveContact={(contactId) =>
                  setSelectedContacts((prev) => prev.filter((row) => row.id !== contactId))
                }
              />

              <EmailSendAudienceSection
                addList={addList}
                addSegment={addSegment}
                filteredLists={filteredLists}
                filteredSegments={filteredSegments}
                listPickerOpen={listPickerOpen}
                listSearch={listSearch}
                providerLoading={providerLoading}
                segmentPickerOpen={segmentPickerOpen}
                segmentSearch={segmentSearch}
                selectedList={selectedList}
                selectedSegment={selectedSegment}
                onAddListChange={(checked) => {
                  setAddList(checked)
                  if (!checked) {
                    setListPickerOpen(false)
                    setListId('')
                    setListSearch('')
                  }
                }}
                onAddSegmentChange={(checked) => {
                  setAddSegment(checked)
                  if (!checked) {
                    setSegmentPickerOpen(false)
                    setSegmentId('')
                    setSegmentSearch('')
                  }
                }}
                onListPickerOpenChange={setListPickerOpen}
                onListSearchChange={setListSearch}
                onListSelect={(nextListId) => {
                  setListId(nextListId)
                  setListSearch('')
                  setListPickerOpen(false)
                }}
                onSegmentPickerOpenChange={setSegmentPickerOpen}
                onSegmentSearchChange={setSegmentSearch}
                onSegmentSelect={(nextSegmentId) => {
                  setSegmentId(nextSegmentId)
                  setSegmentSearch('')
                  setSegmentPickerOpen(false)
                }}
              />

              <EmailSendScheduleSummary
                scheduleDate={scheduleDate}
                onClear={() => setScheduleDate('')}
              />
            </>
          )}
        </div>

        <EmailSendDialogFooter
          scheduleDate={scheduleDate}
          sending={sending}
          senderIdentitiesLoading={senderIdentitiesLoading}
          onOpenSchedule={openSchedulePicker}
          onSend={() => void handleSend()}
        />
      </div>

      <SpacesScheduleDateTimeModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        title="Schedule send"
        value={scheduleDraft}
        onChange={setScheduleDraft}
        confirmLabel="Set schedule"
        onConfirm={() => {
          if (!scheduleDraft || !toScheduledIso(scheduleDraft)) {
            toast.error('Choose a date and time')
            return
          }
          setScheduleDate(scheduleDraft)
          setScheduleModalOpen(false)
        }}
      />
    </div>
  )
}
