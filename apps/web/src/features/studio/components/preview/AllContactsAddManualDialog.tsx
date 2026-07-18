'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createCrmContact, importContactsToCampaign } from '../../services/leads.service'

export function AllContactsAddManualDialog(props: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  /** When set, new contact is linked to this campaign after create. */
  campaignId?: string | null
}) {
  const { open, onClose, onCreated, campaignId } = props
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const created = await createCrmContact({
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      if (campaignId) {
        await importContactsToCampaign(campaignId, [created.id])
      }
      toast.success('Contact added')
      onCreated()
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Add contact</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Enter the contact details you want to save.
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 relative w-full max-w-md">
            <button
              type="button"
              onClick={handleClose}
              className="btn-icon-bare btn-close-absolute"
              aria-label="Close"
            >
              <X className="icon-sm" />
            </button>
            <h2 className="title-h6 mb-spacing-4">Add contact manually</h2>
            <form onSubmit={handleSubmit} className="space-y-spacing-3">
              <div className="gap-spacing-2 grid grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-first-name"
                    className="body-4 text-muted-foreground mb-1 block"
                  >
                    First name
                  </label>
                  <input
                    id="contact-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-glass h-9 w-full px-3"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-last-name"
                    className="body-4 text-muted-foreground mb-1 block"
                  >
                    Last name
                  </label>
                  <input
                    id="contact-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-glass h-9 w-full px-3"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="contact-email" className="body-4 text-muted-foreground mb-1 block">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass h-9 w-full px-3"
                />
              </div>
              <div>
                <label htmlFor="contact-phone" className="body-4 text-muted-foreground mb-1 block">
                  Phone
                </label>
                <input
                  id="contact-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-glass h-9 w-full px-3"
                />
              </div>
              <div className="pt-spacing-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="button-glass-neutral rounded-lg px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="button-glass-accent rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
