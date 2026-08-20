'use client'

import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createMission, resolveMissionCreateToastMessage } from '@/lib/missions'
import { QUICK_MISSIONS_MESSAGES } from '../../config/quick-missions-messages.config'
import {
  EMPTY_IG_VIDEO_FIELDS,
  EMPTY_STATIC_AD_FIELDS,
  isAdProductionPlaybookValid,
} from '../StartAdProductionPlaybookFields'
import { buildClientStrategyMissionPayload } from './client-strategy'
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
  CLIENT_STRATEGY_PLAYBOOK_ID,
  findQuickMissionByKey,
  QUICK_MISSION_PLAYBOOKS,
  type QuickMissionCatalogEntry,
  type QuickMissionPlaybookId,
} from './quick-missions-catalog'
import { QuickMissionCampaignSpaceSelect } from './QuickMissionCampaignSpaceSelect'
import { QuickMissionContextFields } from './QuickMissionContextFields'
import {
  buildStaticAdProductionMissionPayload,
  STATIC_AD_PRODUCTION_PLAYBOOK_ID,
  type StaticAdProductionKickoffFields,
} from './static-ad-production'
import {
  buildWebinarFulfillmentMissionPayload,
  type PlaybookKickoffFields,
} from './webinar-fulfillment'

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
  initialClientSpaceId,
  parentMissionId,
  sourceConversationId,
  onClose,
  onResolveSourceConversation,
  onStarted,
}: {
  open: boolean
  submitting?: boolean
  clients: QuickMissionClientOption[]
  initialPlaybookKey?: string | null
  initialClientSpaceId?: string | null
  parentMissionId?: string | null
  sourceConversationId?: string | null
  onClose: () => void
  onResolveSourceConversation?: (input: {
    missionTitle: string
    campaignId: string
    spaceId: string
  }) => Promise<string | null>
  onStarted?: (
    missionId: string,
    missionTitle: string,
    spaceId: string,
    sourceConversationId: string | null,
  ) => void | Promise<void>
}) {
  const [step, setStep] = useState<HubStep>('mission')
  const [selected, setSelected] = useState<QuickMissionCatalogEntry | null>(null)
  const [clientSpaceId, setClientSpaceId] = useState('')
  const [webinar, setWebinar] = useState(EMPTY_WEBINAR)
  const [staticFields, setStaticFields] = useState(EMPTY_STATIC_AD_FIELDS)
  const [videoFields, setVideoFields] = useState(EMPTY_IG_VIDEO_FIELDS)
  const [meta, setMeta] = useState(EMPTY_META)
  const [audit, setAudit] = useState(EMPTY_AUDIT)

  useEffect(() => {
    if (!open) return
    const preset = initialPlaybookKey ? findQuickMissionByKey(initialPlaybookKey) : null
    setSelected(preset ?? null)
    setStep(preset ? 'client' : 'mission')
    setClientSpaceId(initialClientSpaceId ?? '')
    setWebinar(EMPTY_WEBINAR)
    setStaticFields(EMPTY_STATIC_AD_FIELDS)
    setVideoFields(EMPTY_IG_VIDEO_FIELDS)
    setMeta(EMPTY_META)
    setAudit(EMPTY_AUDIT)
  }, [open, initialClientSpaceId, initialPlaybookKey])

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
    const payload = buildPayload(selected.id, {
      webinar,
      staticFields,
      videoFields,
      meta,
      audit,
    })
    const missionTitle = `${payload.title} — ${selectedClient.title}`
    toast.info(QUICK_MISSIONS_MESSAGES.startingToast(missionTitle))
    onClose()
    try {
      const resolvedSourceConversationId =
        sourceConversationId ??
        (await onResolveSourceConversation?.({
          missionTitle,
          campaignId: selectedClient.campaignId,
          spaceId: selectedClient.spaceId,
        })) ??
        null
      const mission = await createMission({
        ...payload,
        title: missionTitle,
        input: {
          ...payload.input,
          ...(resolvedSourceConversationId
            ? {
                source_conversation_id: resolvedSourceConversationId,
                source_surface: 'chat_quick_mission',
              }
            : {}),
        },
        campaign_id: selectedClient.campaignId,
        space_id: selectedClient.spaceId,
        ...(parentMissionId ? { parent_mission_id: parentMissionId } : {}),
        idempotency_key: `quick-mission-${selected.id}-${crypto.randomUUID()}`,
      })
      toast.success(QUICK_MISSIONS_MESSAGES.startedToast(missionTitle))
      try {
        await onStarted?.(
          mission.id,
          missionTitle,
          selectedClient.spaceId,
          resolvedSourceConversationId,
        )
      } catch {
        toast.warning(QUICK_MISSIONS_MESSAGES.receiptSaveFailed)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : resolveMissionCreateToastMessage(error))
    }
  }

  const isBusy = Boolean(submitting)

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
                <div className="space-y-spacing-2">
                  <span className="body-3 text-foreground font-medium">Campaign &amp; space</span>
                  <QuickMissionCampaignSpaceSelect
                    clients={clients}
                    value={clientSpaceId}
                    onChange={setClientSpaceId}
                  />
                </div>
              ) : null}

              {step === 'context' && selected ? (
                <QuickMissionContextFields
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
  if (playbookId === CLIENT_STRATEGY_PLAYBOOK_ID) {
    return buildClientStrategyMissionPayload(fields.webinar)
  }
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
