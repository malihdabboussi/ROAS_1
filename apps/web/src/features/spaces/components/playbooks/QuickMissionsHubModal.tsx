'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createMission, resolveMissionCreateToastMessage } from '@/lib/missions'
import {
  buildIgOrganicVideoMissionPayload,
  IG_ORGANIC_VIDEO_PLAYBOOK_ID,
  type IgOrganicVideoKickoffFields,
} from './ig-organic-video'
import {
  buildMetaAdsAuditMissionPayload,
  META_ADS_AUDIT_PLAYBOOK_ID,
  type MetaAdsAuditKickoffFields,
} from './meta-ads-audit'
import {
  buildMetaAdsLaunchMissionPayload,
  META_ADS_LAUNCH_PLAYBOOK_ID,
  type MetaAdsLaunchKickoffFields,
} from './meta-ads-launch'
import {
  buildStaticAdProductionMissionPayload,
  STATIC_AD_PRODUCTION_PLAYBOOK_ID,
  type StaticAdProductionKickoffFields,
} from './static-ad-production'
import {
  buildWebinarFulfillmentMissionPayload,
  type PlaybookKickoffFields,
} from './webinar-fulfillment'
import {
  findQuickMissionByKey,
  QUICK_MISSION_PLAYBOOKS,
  type QuickMissionCatalogEntry,
  type QuickMissionPlaybookId,
} from './quick-missions-catalog'
import {
  EMPTY_IG_VIDEO_FIELDS,
  EMPTY_STATIC_AD_FIELDS,
  isAdProductionPlaybookValid,
  StartAdProductionPlaybookFields,
} from '../StartAdProductionPlaybookFields'

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

export type QuickMissionClientOption = {
  spaceId: string
  campaignId: string
  title: string
}

type HubStep = 'mission' | 'client' | 'context'

export function QuickMissionsHubModal({
  open,
  submitting,
  clients,
  initialPlaybookKey,
  onClose,
  onStarted,
}: {
  open: boolean
  submitting?: boolean
  clients: QuickMissionClientOption[]
  initialPlaybookKey?: string | null
  onClose: () => void
  onStarted?: (missionId: string) => void
}) {
  const [step, setStep] = useState<HubStep>('mission')
  const [selected, setSelected] = useState<QuickMissionCatalogEntry | null>(null)
  const [clientSpaceId, setClientSpaceId] = useState('')
  const [webinar, setWebinar] = useState(EMPTY_WEBINAR)
  const [staticFields, setStaticFields] = useState(EMPTY_STATIC_AD_FIELDS)
  const [videoFields, setVideoFields] = useState(EMPTY_IG_VIDEO_FIELDS)
  const [meta, setMeta] = useState(EMPTY_META)
  const [audit, setAudit] = useState(EMPTY_AUDIT)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const preset = initialPlaybookKey ? findQuickMissionByKey(initialPlaybookKey) : null
    setSelected(preset ?? null)
    setStep(preset ? 'client' : 'mission')
    setClientSpaceId('')
    setWebinar(EMPTY_WEBINAR)
    setStaticFields(EMPTY_STATIC_AD_FIELDS)
    setVideoFields(EMPTY_IG_VIDEO_FIELDS)
    setMeta(EMPTY_META)
    setAudit(EMPTY_AUDIT)
  }, [open, initialPlaybookKey])

  const selectedClient = useMemo(
    () => clients.find((client) => client.spaceId === clientSpaceId) ?? null,
    [clientSpaceId, clients],
  )

  const canContinueContext =
    selected != null &&
    (selected.selection !== 'static' && selected.selection !== 'video'
      ? true
      : isAdProductionPlaybookValid(selected.selection, staticFields, videoFields))

  const runMission = async () => {
    if (!selected || !selectedClient) return
    setBusy(true)
    try {
      const payload = buildPayload(selected.id, {
        webinar,
        staticFields,
        videoFields,
        meta,
        audit,
      })
      const mission = await createMission({
        ...payload,
        campaign_id: selectedClient.campaignId,
        space_id: selectedClient.spaceId,
        idempotency_key: `quick-mission-${selected.id}-${crypto.randomUUID()}`,
      })
      toast.success(`${payload.title} started`)
      onStarted?.(mission.id)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : resolveMissionCreateToastMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const isBusy = busy || Boolean(submitting)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isBusy) onClose()
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
                    Quick Missions
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                    {step === 'mission'
                      ? 'Pick a mission playbook.'
                      : step === 'client'
                        ? 'Choose the client campaign.'
                        : 'Add context, then run.'}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="btn-icon-bare shrink-0"
                    aria-label="Close"
                    disabled={isBusy}
                  >
                    <X className="icon-xs" />
                  </button>
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 min-h-0 flex-1 overflow-y-auto">
              {step === 'mission' ? (
                <div className="gap-spacing-2 grid grid-cols-1 sm:grid-cols-2">
                  {QUICK_MISSION_PLAYBOOKS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={
                        selected?.id === entry.id
                          ? 'nav-glass-selected-purple rounded-spacing-2 p-spacing-3 border border-transparent text-left'
                          : 'button-glass-neutral rounded-spacing-2 p-spacing-3 border border-transparent text-left'
                      }
                      onClick={() => setSelected(entry)}
                    >
                      <span className="body-3 text-foreground font-semibold">{entry.name}</span>
                      <span className="body-4 text-muted-foreground mt-spacing-1 block">
                        {entry.description}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 'client' ? (
                <label className="space-y-spacing-2 block">
                  <span className="body-3 text-foreground font-medium">Client campaign</span>
                  <select
                    className="input-glass body-3 text-foreground h-spacing-8 w-full"
                    value={clientSpaceId}
                    onChange={(event) => setClientSpaceId(event.target.value)}
                    aria-label="Select client campaign"
                  >
                    <option value="">Select a campaign…</option>
                    {clients.map((client) => (
                      <option key={client.spaceId} value={client.spaceId}>
                        {client.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {step === 'context' && selected ? (
                <ContextFields
                  selection={selected.selection}
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
              ) : null}
            </div>

            <div className="border-border px-spacing-6 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-between border-t">
              <button
                type="button"
                className="button-default button-glass-neutral"
                disabled={isBusy}
                onClick={() => {
                  if (step === 'mission') onClose()
                  else if (step === 'client') setStep('mission')
                  else setStep('client')
                }}
              >
                {step === 'mission' ? 'Cancel' : 'Back'}
              </button>
              <button
                type="button"
                className="button-default button-glass-primary"
                disabled={
                  isBusy ||
                  (step === 'mission' && !selected) ||
                  (step === 'client' && !selectedClient) ||
                  (step === 'context' && !canContinueContext)
                }
                onClick={() => {
                  if (step === 'mission') {
                    setStep('client')
                    return
                  }
                  if (step === 'client') {
                    setStep('context')
                    return
                  }
                  void runMission()
                }}
              >
                {isBusy ? 'Starting…' : step === 'context' ? 'Run mission' : 'Continue'}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function buildPayload(
  playbookId: QuickMissionPlaybookId,
  fields: {
    webinar: PlaybookKickoffFields
    staticFields: StaticAdProductionKickoffFields
    videoFields: IgOrganicVideoKickoffFields
    meta: MetaAdsLaunchKickoffFields
    audit: MetaAdsAuditKickoffFields
  },
) {
  if (playbookId === META_ADS_LAUNCH_PLAYBOOK_ID) {
    return buildMetaAdsLaunchMissionPayload(fields.meta)
  }
  if (playbookId === META_ADS_AUDIT_PLAYBOOK_ID) {
    return buildMetaAdsAuditMissionPayload(fields.audit)
  }
  if (playbookId === STATIC_AD_PRODUCTION_PLAYBOOK_ID) {
    return buildStaticAdProductionMissionPayload(fields.staticFields)
  }
  if (playbookId === IG_ORGANIC_VIDEO_PLAYBOOK_ID) {
    return buildIgOrganicVideoMissionPayload(fields.videoFields)
  }
  return buildWebinarFulfillmentMissionPayload(fields.webinar)
}

function ContextFields({
  selection,
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
  selection: QuickMissionCatalogEntry['selection']
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
  if (selection === 'static' || selection === 'video') {
    return (
      <StartAdProductionPlaybookFields
        selected={selection}
        staticFields={staticFields}
        videoFields={videoFields}
        onStaticChange={setStaticFields}
        onVideoChange={setVideoFields}
      />
    )
  }
  if (selection === 'webinar') {
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
          label="Notes (optional)"
          value={webinar.notes}
          onChange={(value) => setWebinar({ ...webinar, notes: value })}
        />
      </>
    )
  }
  if (selection === 'meta') {
    return (
      <>
        <Field
          label="Approved asset links"
          value={meta.asset_links}
          onChange={(value) => setMeta({ ...meta, asset_links: value })}
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
      <Field
        label="Reporting period"
        value={audit.reporting_period}
        onChange={(value) => setAudit({ ...audit, reporting_period: value })}
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

export const QUICK_MISSIONS_OPEN_EVENT = 'vibey:open-quick-missions'

export function dispatchOpenQuickMissions(playbookKey?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(QUICK_MISSIONS_OPEN_EVENT, {
      detail: { playbookKey: playbookKey ?? null },
    }),
  )
}
