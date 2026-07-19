'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import {
  META_ADS_LAUNCH_PLAYBOOK_ID,
  type MetaAdsLaunchKickoffFields,
} from './playbooks/meta-ads-launch'
import {
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
  type PlaybookKickoffFields,
} from './playbooks/webinar-fulfillment'

const EMPTY_WEBINAR: PlaybookKickoffFields = {
  client_context: '',
  transcript_url: '',
  drive_links: '',
  notes: '',
}
const EMPTY_META: MetaAdsLaunchKickoffFields = {
  asset_links: '',
  ad_copy: '',
  creative_links: '',
  destination_url: '',
  notes: '',
}

export type PlaybookStartRequest =
  | { playbookId: typeof WEBINAR_FULFILLMENT_PLAYBOOK_ID; fields: PlaybookKickoffFields }
  | { playbookId: typeof META_ADS_LAUNCH_PLAYBOOK_ID; fields: MetaAdsLaunchKickoffFields }

export function StartPlaybookModal({
  open,
  submitting,
  onClose,
  onStart,
}: {
  open: boolean
  submitting: boolean
  onClose: () => void
  onStart: (request: PlaybookStartRequest) => void
}) {
  const [selected, setSelected] = useState<'webinar' | 'meta'>('webinar')
  const [webinar, setWebinar] = useState(EMPTY_WEBINAR)
  const [meta, setMeta] = useState(EMPTY_META)
  useEffect(() => {
    if (!open) return
    setSelected('webinar')
    setWebinar(EMPTY_WEBINAR)
    setMeta(EMPTY_META)
  }, [open])
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div className="z-modal-backdrop bg-modal-overlay fixed inset-0" onClick={onClose} />
      <div className="z-modal-content p-spacing-4 fixed inset-0 flex items-center justify-center overflow-y-auto">
        <div className="surface-card wizard-container-border rounded-spacing-4 flex w-full max-w-lg flex-col overflow-hidden border shadow-2xl">
          <div className="px-spacing-5 pt-spacing-5 pb-spacing-3 flex items-start justify-between">
            <div>
              <h2 className="title-h6 text-foreground">Start playbook</h2>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                Choose the guided workflow this Mission should run.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon-bare"
              aria-label="Close"
              disabled={submitting}
            >
              <X className="icon-xs" />
            </button>
          </div>
          <div className="px-spacing-5 pb-spacing-5 space-y-spacing-4">
            <div className="gap-spacing-2 grid grid-cols-2">
              <Choice
                title="Webinar Fulfillment"
                detail="Strategy through production"
                active={selected === 'webinar'}
                onClick={() => setSelected('webinar')}
              />
              <Choice
                title="Meta Ads Launch"
                detail="Approved assets to paused build"
                active={selected === 'meta'}
                onClick={() => setSelected('meta')}
              />
            </div>
            {selected === 'webinar' ? (
              <>
                <Field
                  label="Client / campaign context"
                  value={webinar.client_context}
                  onChange={(value) => setWebinar((old) => ({ ...old, client_context: value }))}
                />
                <Field
                  label="Transcript URL (optional)"
                  value={webinar.transcript_url}
                  onChange={(value) => setWebinar((old) => ({ ...old, transcript_url: value }))}
                />
                <Field
                  label="Drive / research links (optional)"
                  value={webinar.drive_links}
                  onChange={(value) => setWebinar((old) => ({ ...old, drive_links: value }))}
                />
                <Field
                  label="Notes (optional)"
                  value={webinar.notes}
                  onChange={(value) => setWebinar((old) => ({ ...old, notes: value }))}
                />
              </>
            ) : (
              <>
                <p className="body-4 text-muted-foreground">
                  Mapped PageGrader account context will be included when available.
                </p>
                <Field
                  label="Approved asset links"
                  value={meta.asset_links}
                  onChange={(value) => setMeta((old) => ({ ...old, asset_links: value }))}
                />
                <Field
                  label="Additional ad copy (optional)"
                  value={meta.ad_copy}
                  onChange={(value) => setMeta((old) => ({ ...old, ad_copy: value }))}
                />
                <Field
                  label="Creative links (optional)"
                  value={meta.creative_links}
                  onChange={(value) => setMeta((old) => ({ ...old, creative_links: value }))}
                />
                <Field
                  label="Destination URL (optional)"
                  value={meta.destination_url}
                  onChange={(value) => setMeta((old) => ({ ...old, destination_url: value }))}
                />
                <Field
                  label="Launch notes (optional)"
                  value={meta.notes}
                  onChange={(value) => setMeta((old) => ({ ...old, notes: value }))}
                />
              </>
            )}
            <div className="gap-spacing-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
              >
                Cancel
              </button>
              <button
                type="button"
                className="badge-glass badge-glass-green body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 font-semibold"
                disabled={submitting}
                onClick={() =>
                  onStart(
                    selected === 'webinar'
                      ? { playbookId: WEBINAR_FULFILLMENT_PLAYBOOK_ID, fields: webinar }
                      : { playbookId: META_ADS_LAUNCH_PLAYBOOK_ID, fields: meta },
                  )
                }
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

function Choice({
  title,
  detail,
  active,
  onClick,
}: {
  title: string
  detail: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'badge-glass badge-glass-green rounded-spacing-2 p-spacing-3 text-left'
          : 'button-glass-neutral rounded-spacing-2 p-spacing-3 text-left'
      }
      onClick={onClick}
    >
      <span className="body-3 font-semibold">{title}</span>
      <span className="body-4 mt-spacing-1 block">{detail}</span>
    </button>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-spacing-1 block">
      <span className="body-4 text-muted-foreground">{label}</span>
      <textarea
        className="input-glass rounded-spacing-2 body-3 text-foreground min-h-16 w-full resize-y px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
