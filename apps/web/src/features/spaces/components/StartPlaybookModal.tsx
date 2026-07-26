'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import {
  IG_ORGANIC_VIDEO_PLAYBOOK_ID,
  type IgOrganicVideoKickoffFields,
} from './playbooks/ig-organic-video'
import {
  META_ADS_AUDIT_PLAYBOOK_ID,
  type MetaAdsAuditKickoffFields,
} from './playbooks/meta-ads-audit'
import {
  META_ADS_LAUNCH_PLAYBOOK_ID,
  type MetaAdsLaunchKickoffFields,
} from './playbooks/meta-ads-launch'
import {
  STATIC_AD_PRODUCTION_PLAYBOOK_ID,
  type StaticAdProductionKickoffFields,
} from './playbooks/static-ad-production'
import {
  WEBINAR_FULFILLMENT_PLAYBOOK_ID,
  type PlaybookKickoffFields,
} from './playbooks/webinar-fulfillment'
import {
  EMPTY_IG_VIDEO_FIELDS,
  EMPTY_STATIC_AD_FIELDS,
  isAdProductionPlaybookValid,
  StartAdProductionPlaybookFields,
} from './StartAdProductionPlaybookFields'

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
const EMPTY_AUDIT: MetaAdsAuditKickoffFields = {
  reporting_period: 'last_30d',
  comparison_period: 'previous_30d',
  selected_campaigns: '',
  notes: '',
}

type PlaybookSelection = 'webinar' | 'static' | 'video' | 'meta' | 'audit'

export type PlaybookStartRequest =
  | { playbookId: typeof WEBINAR_FULFILLMENT_PLAYBOOK_ID; fields: PlaybookKickoffFields }
  | {
      playbookId: typeof STATIC_AD_PRODUCTION_PLAYBOOK_ID
      fields: StaticAdProductionKickoffFields
    }
  | {
      playbookId: typeof IG_ORGANIC_VIDEO_PLAYBOOK_ID
      fields: IgOrganicVideoKickoffFields
    }
  | { playbookId: typeof META_ADS_LAUNCH_PLAYBOOK_ID; fields: MetaAdsLaunchKickoffFields }
  | { playbookId: typeof META_ADS_AUDIT_PLAYBOOK_ID; fields: MetaAdsAuditKickoffFields }

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
  const [selected, setSelected] = useState<PlaybookSelection>('webinar')
  const [webinar, setWebinar] = useState(EMPTY_WEBINAR)
  const [staticFields, setStaticFields] = useState(EMPTY_STATIC_AD_FIELDS)
  const [videoFields, setVideoFields] = useState(EMPTY_IG_VIDEO_FIELDS)
  const [meta, setMeta] = useState(EMPTY_META)
  const [audit, setAudit] = useState(EMPTY_AUDIT)
  useEffect(() => {
    if (!open) return
    setSelected('webinar')
    setWebinar(EMPTY_WEBINAR)
    setStaticFields(EMPTY_STATIC_AD_FIELDS)
    setVideoFields(EMPTY_IG_VIDEO_FIELDS)
    setMeta(EMPTY_META)
    setAudit(EMPTY_AUDIT)
  }, [open])

  const canStart =
    selected !== 'static' && selected !== 'video'
      ? true
      : isAdProductionPlaybookValid(selected, staticFields, videoFields)

  const start = () => {
    if (selected === 'webinar') {
      onStart({ playbookId: WEBINAR_FULFILLMENT_PLAYBOOK_ID, fields: webinar })
    } else if (selected === 'static') {
      onStart({ playbookId: STATIC_AD_PRODUCTION_PLAYBOOK_ID, fields: staticFields })
    } else if (selected === 'video') {
      onStart({ playbookId: IG_ORGANIC_VIDEO_PLAYBOOK_ID, fields: videoFields })
    } else if (selected === 'meta') {
      onStart({ playbookId: META_ADS_LAUNCH_PLAYBOOK_ID, fields: meta })
    } else {
      onStart({ playbookId: META_ADS_AUDIT_PLAYBOOK_ID, fields: audit })
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 flex max-h-full w-full max-w-2xl flex-col overflow-hidden border shadow-2xl">
            <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
              <div className="gap-spacing-3 flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="title-h6 text-foreground">
                    Start playbook
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                    Choose the guided workflow this Mission should run.
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="btn-icon-bare shrink-0"
                    aria-label="Close"
                    disabled={submitting}
                  >
                    <X className="icon-xs" />
                  </button>
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 space-y-spacing-5 min-h-0 flex-1 overflow-y-auto">
              <div className="gap-spacing-2 grid grid-cols-2 sm:grid-cols-3">
                <Choice
                  title="Webinar Fulfillment"
                  detail="Strategy through production"
                  active={selected === 'webinar'}
                  onClick={() => setSelected('webinar')}
                />
                <Choice
                  title="Static Ad Production"
                  detail="Production-ready images"
                  active={selected === 'static'}
                  onClick={() => setSelected('static')}
                />
                <Choice
                  title="IG Organic Video"
                  detail="Story footage and stickers"
                  active={selected === 'video'}
                  onClick={() => setSelected('video')}
                />
                <Choice
                  title="Meta Ads Launch"
                  detail="Approved assets to paused build"
                  active={selected === 'meta'}
                  onClick={() => setSelected('meta')}
                />
                <Choice
                  title="Meta Ads Audit"
                  detail="Live data to gated actions"
                  active={selected === 'audit'}
                  onClick={() => setSelected('audit')}
                />
              </div>
              <PlaybookFields
                selected={selected}
                webinar={webinar}
                staticFields={staticFields}
                videoFields={videoFields}
                meta={meta}
                audit={audit}
                setWebinar={setWebinar}
                setStaticFields={setStaticFields}
                setVideoFields={setVideoFields}
                setMeta={setMeta}
                setAudit={setAudit}
              />
            </div>

            <div className="border-border px-spacing-6 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-end border-t">
              <button
                type="button"
                onClick={onClose}
                className="button-default button-glass-neutral"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button-default button-glass-primary"
                disabled={submitting || !canStart}
                onClick={start}
              >
                {submitting ? 'Starting…' : 'Start playbook'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
          ? 'nav-glass-selected-purple rounded-spacing-2 p-spacing-3 border border-transparent text-left'
          : 'button-glass-neutral rounded-spacing-2 p-spacing-3 border border-transparent text-left'
      }
      onClick={onClick}
    >
      <span className="body-3 text-foreground font-semibold">{title}</span>
      <span className="body-4 text-muted-foreground mt-spacing-1 block">{detail}</span>
    </button>
  )
}

function PlaybookFields({
  selected,
  webinar,
  staticFields,
  videoFields,
  meta,
  audit,
  setWebinar,
  setStaticFields,
  setVideoFields,
  setMeta,
  setAudit,
}: {
  selected: PlaybookSelection
  webinar: PlaybookKickoffFields
  staticFields: StaticAdProductionKickoffFields
  videoFields: IgOrganicVideoKickoffFields
  meta: MetaAdsLaunchKickoffFields
  audit: MetaAdsAuditKickoffFields
  setWebinar: (fields: PlaybookKickoffFields) => void
  setStaticFields: (fields: StaticAdProductionKickoffFields) => void
  setVideoFields: (fields: IgOrganicVideoKickoffFields) => void
  setMeta: (fields: MetaAdsLaunchKickoffFields) => void
  setAudit: (fields: MetaAdsAuditKickoffFields) => void
}) {
  if (selected === 'static' || selected === 'video') {
    return (
      <StartAdProductionPlaybookFields
        selected={selected}
        staticFields={staticFields}
        videoFields={videoFields}
        onStaticChange={setStaticFields}
        onVideoChange={setVideoFields}
      />
    )
  }
  if (selected === 'webinar') {
    return (
      <>
        <Field
          label="Client / campaign context"
          value={webinar.client_context}
          onChange={(value) => setWebinar({ ...webinar, client_context: value })}
        />
        <Field
          label="Transcript URL (optional)"
          value={webinar.transcript_url}
          onChange={(value) => setWebinar({ ...webinar, transcript_url: value })}
        />
        <Field
          label="Drive / research links (optional)"
          value={webinar.drive_links}
          onChange={(value) => setWebinar({ ...webinar, drive_links: value })}
        />
        <Field
          label="Notes (optional)"
          value={webinar.notes}
          onChange={(value) => setWebinar({ ...webinar, notes: value })}
        />
      </>
    )
  }
  if (selected === 'meta') {
    return (
      <>
        <p className="body-4 text-muted-foreground">
          Mapped PageGrader account context will be included when available.
        </p>
        <Field
          label="Approved asset links"
          value={meta.asset_links}
          onChange={(value) => setMeta({ ...meta, asset_links: value })}
        />
        <Field
          label="Additional ad copy (optional)"
          value={meta.ad_copy}
          onChange={(value) => setMeta({ ...meta, ad_copy: value })}
        />
        <Field
          label="Creative links (optional)"
          value={meta.creative_links}
          onChange={(value) => setMeta({ ...meta, creative_links: value })}
        />
        <Field
          label="Destination URL (optional)"
          value={meta.destination_url}
          onChange={(value) => setMeta({ ...meta, destination_url: value })}
        />
        <Field
          label="Launch notes (optional)"
          value={meta.notes}
          onChange={(value) => setMeta({ ...meta, notes: value })}
        />
      </>
    )
  }
  return (
    <>
      <p className="body-4 text-muted-foreground">
        Blaze will use the mounted Meta account and verify the real result event before recommending
        changes.
      </p>
      <Field
        label="Reporting period"
        value={audit.reporting_period}
        onChange={(value) => setAudit({ ...audit, reporting_period: value })}
      />
      <Field
        label="Comparison period"
        value={audit.comparison_period}
        onChange={(value) => setAudit({ ...audit, comparison_period: value })}
      />
      <Field
        label="Campaign names or IDs, one per line (optional)"
        value={audit.selected_campaigns}
        onChange={(value) => setAudit({ ...audit, selected_campaigns: value })}
      />
      <Field
        label="Audit notes (optional)"
        value={audit.notes}
        onChange={(value) => setAudit({ ...audit, notes: value })}
      />
    </>
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
    <label className="space-y-spacing-2 block">
      <span className="body-3 text-foreground font-medium">{label}</span>
      <textarea
        className="input-glass body-3 text-foreground h-spacing-16 w-full resize-y"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
