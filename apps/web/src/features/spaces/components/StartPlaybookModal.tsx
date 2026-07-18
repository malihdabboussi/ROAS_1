'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  SPACE_MISSION_PLAYBOOKS,
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
  type PlaybookKickoffFields,
} from './playbooks/webinar-fulfillment'

const EMPTY_FIELDS: PlaybookKickoffFields = {
  client_context: '',
  transcript_url: '',
  drive_links: '',
  notes: '',
}

interface StartPlaybookModalProps {
  open: boolean
  submitting: boolean
  onClose: () => void
  onStart: (fields: PlaybookKickoffFields) => void
}

export function StartPlaybookModal({
  open,
  submitting,
  onClose,
  onStart,
}: StartPlaybookModalProps) {
  const [fields, setFields] = useState<PlaybookKickoffFields>(EMPTY_FIELDS)
  const playbook = SPACE_MISSION_PLAYBOOKS.find((p) => p.id === WEBINAR_FULFILLMENT_PLAYBOOK_ID)

  useEffect(() => {
    if (open) setFields(EMPTY_FIELDS)
  }, [open])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="z-modal-backdrop bg-modal-overlay fixed inset-0" onClick={onClose} />
      <div className="z-modal-content p-spacing-4 fixed inset-0 flex items-center justify-center overflow-y-auto">
        <div className="surface-card wizard-container-border rounded-spacing-4 flex w-full max-w-lg flex-col overflow-hidden border shadow-2xl">
          <div className="px-spacing-5 pt-spacing-5 pb-spacing-3 shrink-0">
            <div className="gap-spacing-3 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="title-h6 text-foreground">Start playbook</h2>
                <p className="body-4 text-muted-foreground mt-spacing-1">
                  {playbook?.title ?? 'Webinar Fulfillment'} — guided mission, not freeform invent.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-icon-bare shrink-0"
                aria-label="Close"
                disabled={submitting}
              >
                <X className="icon-xs" />
              </button>
            </div>
          </div>

          <div className="px-spacing-5 pb-spacing-5 space-y-spacing-4">
            <label className="space-y-spacing-1 block">
              <span className="body-4 text-muted-foreground">Client / campaign context</span>
              <textarea
                className="input-glass rounded-spacing-2 body-3 text-foreground min-h-20 w-full resize-y px-3 py-2"
                value={fields.client_context}
                onChange={(e) => setFields((prev) => ({ ...prev, client_context: e.target.value }))}
                placeholder="Who is the client, what did they buy, what does a win look like?"
                disabled={submitting}
              />
            </label>

            <label className="space-y-spacing-1 block">
              <span className="body-4 text-muted-foreground">Transcript URL (optional)</span>
              <input
                type="url"
                className="input-glass rounded-spacing-2 body-3 text-foreground w-full px-3 py-2"
                value={fields.transcript_url}
                onChange={(e) => setFields((prev) => ({ ...prev, transcript_url: e.target.value }))}
                placeholder="https://"
                disabled={submitting}
              />
            </label>

            <label className="space-y-spacing-1 block">
              <span className="body-4 text-muted-foreground">
                Drive / research links (optional)
              </span>
              <textarea
                className="input-glass rounded-spacing-2 body-3 text-foreground min-h-16 w-full resize-y px-3 py-2"
                value={fields.drive_links}
                onChange={(e) => setFields((prev) => ({ ...prev, drive_links: e.target.value }))}
                placeholder="Onboarding form, sales notes, research docs…"
                disabled={submitting}
              />
            </label>

            <label className="space-y-spacing-1 block">
              <span className="body-4 text-muted-foreground">Notes (optional)</span>
              <textarea
                className="input-glass rounded-spacing-2 body-3 text-foreground min-h-16 w-full resize-y px-3 py-2"
                value={fields.notes}
                onChange={(e) => setFields((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Anything the strategist should not miss"
                disabled={submitting}
              />
            </label>

            <div className="gap-spacing-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onStart(fields)}
                className="badge-glass badge-glass-green body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 font-semibold disabled:opacity-40"
                disabled={submitting}
              >
                {submitting ? 'Starting…' : 'Start playbook'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
