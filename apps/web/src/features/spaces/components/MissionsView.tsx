'use client'

import { useRouter } from 'next/navigation'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { toast } from 'sonner'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewModal } from '@/components/deliverables/DeliverablePreviewModal'
import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { billingApi } from '@/lib/billing/billing-api'
import { fetchCampaignTeam } from '@/lib/campaigns'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { createMission, resolveMissionCreateToastMessage } from '@/lib/missions'
import { getMappedPageGraderMetaContext } from '../services/page-grader-send.service'
import type { ViewDef } from '../types/space-schema'
import { MissionCaptureModal } from './MissionCaptureModal'
import { MissionsViewListContent } from './MissionsViewListContent'
import {
  buildMetaAdsLaunchMissionPayload,
  META_ADS_LAUNCH_PLAYBOOK_ID,
} from './playbooks/meta-ads-launch'
import { buildWebinarFulfillmentMissionPayload } from './playbooks/webinar-fulfillment'
import { StartPlaybookModal, type PlaybookStartRequest } from './StartPlaybookModal'
import { useMissionsViewListState } from './useMissionsViewListState'

function documentsToMissionAttachments(documents: DocumentAttachment[]) {
  return documents.flatMap((doc) => {
    const url = doc.fileUrl ?? doc.dataUrl
    if (!url) return []
    return [
      {
        url,
        name: doc.filename,
        size: 0,
        type: doc.mimeType ?? doc.type,
      },
    ]
  })
}

interface MissionsViewProps {
  campaignId: string
  campaignName: string
  spaceId?: string | null
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onAddColumn?: (e: MouseEvent<HTMLButtonElement>) => void
  currentUserId?: string | null
  toolbarSearchQuery?: string
}

export type MissionsViewHandle = {
  openNewMissionCapture: () => void
  openStartPlaybook: () => void
}

export const MissionsView = forwardRef<MissionsViewHandle, MissionsViewProps>(function MissionsView(
  {
    campaignId,
    campaignName,
    spaceId = null,
    activeView,
    onViewPatch,
    onAddColumn,
    currentUserId = null,
    toolbarSearchQuery = '',
  },
  ref,
) {
  const router = useRouter()
  const missionCaptureModalRef = useRef<HTMLDivElement>(null)
  const missionComposerMirrorRef = useRef('')
  const [creditsExhausted, setCreditsExhausted] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [playbookOpen, setPlaybookOpen] = useState(false)
  const [missionComposerDraft, setMissionComposerDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [capabilityWarning, setCapabilityWarning] = useState<string | null>(null)
  const {
    agents,
    loading,
    selectedMission,
    setSelectedMission,
    selectedSubtaskId,
    setSelectedSubtaskId,
    previewDeliverable,
    setPreviewDeliverable,
    loadData,
    listContentProps,
  } = useMissionsViewListState({
    campaignId,
    campaignName,
    activeView,
    onViewPatch,
    onAddColumn,
    currentUserId,
    toolbarSearchQuery,
  })

  useImperativeHandle(
    ref,
    () => ({
      openNewMissionCapture: () => {
        setCaptureOpen(true)
      },
      openStartPlaybook: () => {
        setPlaybookOpen(true)
      },
    }),
    [],
  )

  useEffect(() => {
    if (!captureOpen) {
      setMissionComposerDraft('')
      return
    }
    const syncDraft = () => {
      const next = missionComposerMirrorRef.current
      setMissionComposerDraft((prev) => (prev === next ? prev : next))
    }
    syncDraft()
    const id = window.setInterval(syncDraft, 250)
    return () => window.clearInterval(id)
  }, [captureOpen])
  useEffect(() => {
    let mounted = true
    billingApi
      .getStatus()
      .then((status) => {
        if (!mounted) return
        setCreditsExhausted((status?.balance?.totalAvailable ?? 0) <= 0)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const runPreflight = async () => {
      const team = await fetchCampaignTeam(campaignId).catch(() => [])
      if (cancelled) return
      if (team.length === 0) {
        setCapabilityWarning(
          'No workers are assigned to this campaign. ROAS can send anyway, but results may be weak.',
        )
        return
      }
      const missionText = missionComposerDraft.toLowerCase()
      if (!missionText.trim()) {
        setCapabilityWarning(null)
        return
      }
      const teamAgentKeys = new Set(team.map((a) => a.agent_key))
      const teamAgents = agents.filter((a) => teamAgentKeys.has(a.agent_key))
      const skillText = teamAgents
        .flatMap((a) => a.skills || [])
        .join(' ')
        .toLowerCase()
      const missionTokens = missionText
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 5)
      const matched = missionTokens.some((t) => skillText.includes(t))
      if (!matched) {
        setCapabilityWarning(
          'Team skills may not match this mission. ROAS will still proceed, but consider hiring a specialist.',
        )
      } else {
        setCapabilityWarning(null)
      }
    }
    void runPreflight()
    return () => {
      cancelled = true
    }
  }, [campaignId, missionComposerDraft, agents])

  const handleMissionComposerSend = useCallback(
    async (content: string, documents?: DocumentAttachment[]) => {
      const title = content.trim()
      if (!title || !campaignId) return
      setSubmitting(true)
      try {
        const attachments = documentsToMissionAttachments(documents ?? [])
        const mission = await createMission({
          title,
          brief: title,
          priority: 'medium',
          campaign_id: campaignId,
          space_id: spaceId || undefined,
          idempotency_key: `mission-${crypto.randomUUID()}`,
          input: attachments.length > 0 ? { attachments } : undefined,
        })
        setCaptureOpen(false)
        setMissionComposerDraft('')
        await loadData()
        setSelectedMission(mission)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : resolveMissionCreateToastMessage(err))
      } finally {
        setSubmitting(false)
      }
    },
    [campaignId, loadData, setSelectedMission, spaceId],
  )

  const handleStartPlaybook = useCallback(
    async (request: PlaybookStartRequest) => {
      if (!campaignId) return
      setSubmitting(true)
      try {
        const pageGraderContext =
          request.playbookId === META_ADS_LAUNCH_PLAYBOOK_ID
            ? await getMappedPageGraderMetaContext({ campaignId, spaceId }).catch(() => null)
            : null
        const payload =
          request.playbookId === META_ADS_LAUNCH_PLAYBOOK_ID
            ? buildMetaAdsLaunchMissionPayload(request.fields, pageGraderContext)
            : buildWebinarFulfillmentMissionPayload(request.fields)
        const mission = await createMission({
          ...payload,
          campaign_id: campaignId,
          space_id: spaceId || undefined,
          idempotency_key: `playbook-${request.playbookId}-${crypto.randomUUID()}`,
        })
        setPlaybookOpen(false)
        await loadData()
        setSelectedMission(mission)
        toast.success(`${payload.title} playbook started`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : resolveMissionCreateToastMessage(err))
      } finally {
        setSubmitting(false)
      }
    },
    [campaignId, loadData, setSelectedMission, spaceId],
  )

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <VibeyLoadingOrb text="Loading missions…" state="processing" size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MissionsViewListContent
        {...listContentProps}
        onStartPlaybook={() => setPlaybookOpen(true)}
      />

      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          initialSubtaskId={selectedSubtaskId}
          onClose={() => {
            setSelectedSubtaskId(null)
            setSelectedMission(null)
          }}
          onUpdated={() => void loadData()}
        />
      )}

      {previewDeliverable && (
        <DeliverablePreviewModal
          deliverable={previewDeliverable}
          agents={agents}
          campaignId={previewDeliverable.campaign_id ?? campaignId}
          hideOpenSourceMission
          renderEntityPreview={renderDeliverableEntityPreview}
          onClose={() => setPreviewDeliverable(null)}
        />
      )}

      {captureOpen ? (
        <MissionCaptureModal
          campaignId={campaignId}
          submitting={submitting}
          creditsExhausted={creditsExhausted}
          capabilityWarning={capabilityWarning}
          modalRef={missionCaptureModalRef}
          composerMirrorRef={missionComposerMirrorRef}
          onClose={() => setCaptureOpen(false)}
          onHireClick={() => router.push('/team?hire=true')}
          onSend={(content, documents) => void handleMissionComposerSend(content, documents)}
        />
      ) : null}

      <StartPlaybookModal
        open={playbookOpen}
        submitting={submitting}
        onClose={() => setPlaybookOpen(false)}
        onStart={(request) => void handleStartPlaybook(request)}
      />
    </div>
  )
})
