'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { backendPost } from '@/lib/api/backend-client'
import { ARTIFACT_INLINE_ERRORS } from '@/lib/artifacts/artifact-inline-errors.config'
import type { AdCampaign, Funnel, Sequence } from '@/lib/artifacts/artifact-types'
import {
  fetchCampaignAdCampaigns,
  fetchCampaignSequences,
  fetchMetaAdAccounts,
  fetchMetaPixels,
  getMetaConnectionStatus,
} from '@/lib/artifacts/funnel-settings-api'
import { updateFunnel } from '@/lib/artifacts/funnel-preview-api'
import { customDomainsApi } from '@/lib/domains/custom-domains-api'
import type { CustomDomain, DomainStatus } from '@/lib/domains/domains.types'
import {
  createWorkflowEdge,
  deleteWorkflowEdge,
  fetchWorkflowGraph,
  updateWorkflowEdge,
  type WorkflowEdge,
} from '@/lib/workflows/workflow-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { getFunnelPixelsFromMetadata, type FunnelPixelEntry } from './funnel-pixel-utils'

export type { FunnelPixelEntry }

export type HandleDomainUpdated = (update: {
  id: string
  status?: DomainStatus
  verification_records?: CustomDomain['verification_records']
}) => void

export function useFunnelSettings(params: {
  campaignId: string
  funnel: Funnel
  onFunnelChange: (next: Funnel) => void
  isFreeUser: boolean
  domains?: CustomDomain[]
  setDomains?: React.Dispatch<React.SetStateAction<CustomDomain[]>>
  domainsLoading?: boolean
  metaPixelsByAccount?: Record<string, Array<{ id: string; name: string }>>
  adCampaigns?: AdCampaign[]
  /**
   * When both are passed (SettingsTab), domain dropdown selection is controlled so Add Domain
   * dialog can call `setSelectedDomainId` at the parent level.
   */
  selectedDomainId?: string
  setSelectedDomainId?: React.Dispatch<React.SetStateAction<string>>
}) {
  const {
    campaignId,
    funnel,
    onFunnelChange,
    isFreeUser,
    domains: domainsProp,
    setDomains: setDomainsProp,
    domainsLoading: domainsLoadingProp,
    metaPixelsByAccount: metaPixelsProp,
    adCampaigns: adCampaignsProp,
    selectedDomainId: selectedDomainIdProp,
    setSelectedDomainId: setSelectedDomainIdProp,
  } = params

  const [internalDomains, setInternalDomains] = useState<CustomDomain[]>([])
  const [internalDomainsLoading, setInternalDomainsLoading] = useState(false)
  const [metaPixelsByAccountInternal, setMetaPixelsByAccountInternal] = useState<
    Record<string, Array<{ id: string; name: string }>>
  >({})
  const [adCampaignsInternal, setAdCampaignsInternal] = useState<AdCampaign[]>([])
  const metaFetchedRef = useRef(false)

  const domains = domainsProp ?? internalDomains
  const setDomains = setDomainsProp ?? setInternalDomains
  const domainsLoading = domainsLoadingProp ?? internalDomainsLoading
  const metaPixelsByAccount = metaPixelsProp ?? metaPixelsByAccountInternal
  const adCampaigns = adCampaignsProp ?? adCampaignsInternal

  const [sequences, setSequences] = useState<Sequence[]>([])
  const [funnelSequenceEdges, setFunnelSequenceEdges] = useState<WorkflowEdge[]>([])
  const [sequenceEdgeLoading, setSequenceEdgeLoading] = useState(false)
  const [sequenceEdgeSaving, setSequenceEdgeSaving] = useState(false)
  const sequencesFetchedRef = useRef(false)

  const [savingFunnelIds, setSavingFunnelIds] = useState<Set<string>>(new Set())
  const [funnelPixelSaving, setFunnelPixelSaving] = useState(false)
  const [funnelManualPixelId, setFunnelManualPixelId] = useState('')
  const autoAppliedFunnelPixelIds = useRef<Set<string>>(new Set())

  const [domainActionLoading, setDomainActionLoading] = useState(false)
  const [internalSelectedDomainId, setInternalSelectedDomainId] = useState<string>('')
  const domainSelectionControlled = setSelectedDomainIdProp !== undefined
  const selectedDomainId = domainSelectionControlled
    ? (selectedDomainIdProp as string)
    : internalSelectedDomainId
  const setSelectedDomainId = domainSelectionControlled
    ? setSelectedDomainIdProp!
    : setInternalSelectedDomainId

  const loadDomainsInternal = useCallback(async () => {
    setInternalDomainsLoading(true)
    try {
      const result = await customDomainsApi.list()
      setInternalDomains(result.domains ?? [])
    } catch {
      setInternalDomains([])
    } finally {
      setInternalDomainsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (domainsProp !== undefined) return
    void loadDomainsInternal()
  }, [domainsProp, loadDomainsInternal])

  useEffect(() => {
    if (metaPixelsProp !== undefined) return
    let cancelled = false
    ;(async () => {
      const status = await getMetaConnectionStatus().catch(() => ({
        connected: false as const,
      }))
      if (cancelled || !status.connected) return
      try {
        const accounts = await fetchMetaAdAccounts()
        if (cancelled) return
        const accountIds = [...new Set(accounts.map((a) => a.id).filter(Boolean))]
        const pixelEntries = await Promise.all(
          accountIds.map(async (id) => {
            try {
              return [id, await fetchMetaPixels(id)] as const
            } catch {
              return [id, []] as const
            }
          }),
        )
        if (cancelled) return
        setMetaPixelsByAccountInternal(Object.fromEntries(pixelEntries))
        metaFetchedRef.current = true
      } catch {
        /* raw */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [metaPixelsProp])

  useEffect(() => {
    if (adCampaignsProp !== undefined) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchCampaignAdCampaigns(campaignId)
        if (!cancelled) setAdCampaignsInternal(list)
      } catch {
        if (!cancelled) setAdCampaignsInternal([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [campaignId, adCampaignsProp])

  useEffect(() => {
    if (!campaignId || sequencesFetchedRef.current) return
    let cancelled = false
    setSequenceEdgeLoading(true)
    ;(async () => {
      try {
        const [seqs, graph] = await Promise.all([
          fetchCampaignSequences(campaignId),
          fetchWorkflowGraph(campaignId),
        ])
        if (cancelled) return
        sequencesFetchedRef.current = true
        setSequences(seqs)
        setFunnelSequenceEdges(
          graph.edges.filter(
            (e) => e.edge_type === 'funnel_conversion_to_sequence',
          ) as WorkflowEdge[],
        )
      } catch {
        /* silent — same as SettingsTab */
      } finally {
        if (!cancelled) setSequenceEdgeLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [campaignId])

  useEffect(() => {
    setSelectedDomainId(funnel.domain_id ?? '')
  }, [funnel.id, funnel.domain_id])

  useEffect(() => {
    setFunnelManualPixelId('')
  }, [funnel.id])

  const allMetaPixelOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const pixels of Object.values(metaPixelsByAccount)) {
      for (const pixel of pixels) {
        byId.set(pixel.id, pixel.name || pixel.id)
      }
    }
    return Array.from(byId.entries()).map(([value, label]) => ({ value, label }))
  }, [metaPixelsByAccount])

  useEffect(() => {
    const meta =
      funnel.metadata && typeof funnel.metadata === 'object'
        ? (funnel.metadata as Record<string, unknown>)
        : {}
    if (meta.meta_pixel_enabled === false) return
    const currentPixels = getFunnelPixelsFromMetadata(meta)
    if (currentPixels.length > 0) return
    if (autoAppliedFunnelPixelIds.current.has(funnel.id)) return
    const firstWithPixel = adCampaigns.find((ac) => {
      const id = (ac.metadata as Record<string, unknown> | undefined)?.meta_pixel_id
      return typeof id === 'string' && id.trim().length > 0
    })
    const defaultPixelId = firstWithPixel
      ? (firstWithPixel.metadata as Record<string, unknown> | undefined)?.meta_pixel_id
      : null
    const pixelId =
      typeof defaultPixelId === 'string' && defaultPixelId.trim() ? defaultPixelId.trim() : null
    if (!pixelId) return
    autoAppliedFunnelPixelIds.current.add(funnel.id)
    updateFunnel(funnel.id, {
      metadata: {
        ...meta,
        meta_pixel_enabled: true,
        meta_pixel_id: pixelId,
        meta_pixels: [{ id: pixelId, source: 'integration' }],
      },
    })
      .then(() => {
        onFunnelChange({
          ...funnel,
          metadata: {
            ...(funnel.metadata && typeof funnel.metadata === 'object'
              ? (funnel.metadata as Record<string, unknown>)
              : {}),
            meta_pixel_enabled: true,
            meta_pixel_id: pixelId,
            meta_pixels: [{ id: pixelId, source: 'integration' as const }],
          },
        })
      })
      .catch(() => {
        autoAppliedFunnelPixelIds.current.delete(funnel.id)
      })
  }, [adCampaigns, funnel, onFunnelChange])

  const handleUpdateFunnelPixels = useCallback(
    async (funnelId: string, pixels: FunnelPixelEntry[]) => {
      const currentMetadata =
        funnel.metadata && typeof funnel.metadata === 'object'
          ? (funnel.metadata as Record<string, unknown>)
          : {}
      const nextMetadata = {
        ...currentMetadata,
        meta_pixels: pixels,
        meta_pixel_id: pixels[0]?.id ?? null,
      }
      onFunnelChange({ ...funnel, metadata: nextMetadata })
      setFunnelPixelSaving(true)
      try {
        await updateFunnel(funnelId, { metadata: nextMetadata })
      } catch {
        toast.error(ARTIFACT_INLINE_ERRORS.SAVE_SETTINGS)
        onFunnelChange({ ...funnel, metadata: funnel.metadata ?? null })
      } finally {
        setFunnelPixelSaving(false)
      }
    },
    [funnel, onFunnelChange],
  )

  const handleToggleMetaEventsEnabled = useCallback(
    async (funnelId: string, enabled: boolean) => {
      const currentMetadata =
        funnel.metadata && typeof funnel.metadata === 'object'
          ? (funnel.metadata as Record<string, unknown>)
          : {}
      const nextMetadata = { ...currentMetadata, meta_events_enabled: enabled }
      onFunnelChange({ ...funnel, metadata: nextMetadata })
      setFunnelPixelSaving(true)
      try {
        await updateFunnel(funnelId, { metadata: nextMetadata })
      } catch {
        toast.error(ARTIFACT_INLINE_ERRORS.SAVE_SETTINGS)
        onFunnelChange({ ...funnel, metadata: funnel.metadata ?? null })
      } finally {
        setFunnelPixelSaving(false)
      }
    },
    [funnel, onFunnelChange],
  )

  const metaEventsEnabled = useMemo(() => {
    const meta =
      funnel.metadata && typeof funnel.metadata === 'object'
        ? (funnel.metadata as Record<string, unknown>)
        : {}
    return meta.meta_events_enabled !== false
  }, [funnel.metadata])

  const metaPixelEnabled = useMemo(() => {
    const meta =
      funnel.metadata && typeof funnel.metadata === 'object'
        ? (funnel.metadata as Record<string, unknown>)
        : {}
    if (meta.meta_pixel_enabled === false) return false
    if (meta.meta_pixel_enabled === true) return true
    return getFunnelPixelsFromMetadata(meta).length > 0
  }, [funnel.metadata])

  const handleToggleMetaPixelEnabled = useCallback(
    async (funnelId: string, enabled: boolean) => {
      const currentMetadata =
        funnel.metadata && typeof funnel.metadata === 'object'
          ? (funnel.metadata as Record<string, unknown>)
          : {}
      const nextMetadata = { ...currentMetadata, meta_pixel_enabled: enabled }
      onFunnelChange({ ...funnel, metadata: nextMetadata })
      setFunnelPixelSaving(true)
      try {
        await updateFunnel(funnelId, { metadata: nextMetadata })
      } catch {
        toast.error(ARTIFACT_INLINE_ERRORS.SAVE_SETTINGS)
        onFunnelChange({ ...funnel, metadata: funnel.metadata ?? null })
      } finally {
        setFunnelPixelSaving(false)
      }
    },
    [funnel, onFunnelChange],
  )

  const handleUpdateFunnelMetaEvents = useCallback(
    async (funnelId: string, events: Record<string, string>) => {
      const currentMetadata =
        funnel.metadata && typeof funnel.metadata === 'object'
          ? (funnel.metadata as Record<string, unknown>)
          : {}
      const nextMetadata = { ...currentMetadata, meta_events: events }
      onFunnelChange({ ...funnel, metadata: nextMetadata })
      setFunnelPixelSaving(true)
      try {
        await updateFunnel(funnelId, { metadata: nextMetadata })
      } catch {
        toast.error(ARTIFACT_INLINE_ERRORS.SAVE_SETTINGS)
        onFunnelChange({ ...funnel, metadata: funnel.metadata ?? null })
      } finally {
        setFunnelPixelSaving(false)
      }
    },
    [funnel, onFunnelChange],
  )

  const handleDomainUpdated: HandleDomainUpdated = useCallback(
    (update) => {
      setDomains((prev) =>
        prev.map((d) =>
          d.id === update.id
            ? {
                ...d,
                ...(update.status ? { status: update.status } : {}),
                ...(update.verification_records !== undefined
                  ? { verification_records: update.verification_records }
                  : {}),
                last_verification_check: new Date().toISOString(),
              }
            : d,
        ),
      )
    },
    [setDomains],
  )

  const handleToggleFunnelTag = useCallback(
    async (funnelId: string, tagId: string) => {
      const current = funnel.tag_ids ?? []
      const next = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId]

      onFunnelChange({ ...funnel, tag_ids: next })

      try {
        setSavingFunnelIds((prev) => new Set(prev).add(funnelId))
        await updateFunnel(funnelId, { tag_ids: next })
      } catch {
        toast.error(ARTIFACT_INLINE_ERRORS.SAVE_SETTINGS)
        onFunnelChange({ ...funnel, tag_ids: current })
      } finally {
        setSavingFunnelIds((prev) => {
          const n = new Set(prev)
          n.delete(funnelId)
          return n
        })
      }
    },
    [funnel, onFunnelChange],
  )

  const handleToggleFunnelBranding = useCallback(
    async (funnelId: string, hideBranding: boolean) => {
      onFunnelChange({ ...funnel, hide_branding: hideBranding })

      try {
        setSavingFunnelIds((prev) => new Set(prev).add(funnelId))
        await updateFunnel(funnelId, { hide_branding: hideBranding })
      } catch {
        toast.error(ARTIFACT_INLINE_ERRORS.SAVE_SETTINGS)
        onFunnelChange({ ...funnel, hide_branding: funnel.hide_branding })
      } finally {
        setSavingFunnelIds((prev) => {
          const n = new Set(prev)
          n.delete(funnelId)
          return n
        })
      }
    },
    [funnel, onFunnelChange],
  )

  const handleConnectFunnelSequence = useCallback(
    async (funnelId: string, sequenceId: string) => {
      setSequenceEdgeSaving(true)
      try {
        const edge = await createWorkflowEdge(campaignId, {
          from_type: 'funnel',
          from_id: funnelId,
          to_type: 'sequence',
          to_id: sequenceId,
          edge_type: 'funnel_conversion_to_sequence',
        })
        if (edge.status === 'valid') {
          const activated = await updateWorkflowEdge(campaignId, edge.id, { status: 'active' })
          setFunnelSequenceEdges((prev) => [...prev, activated])
        } else {
          setFunnelSequenceEdges((prev) => [...prev, edge])
          if (edge.validation_errors?.length) {
            toast.error(edge.validation_errors[0]!.message)
          }
        }
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Failed to connect sequence'))
      } finally {
        setSequenceEdgeSaving(false)
      }
    },
    [campaignId],
  )

  const handleDisconnectFunnelSequence = useCallback(
    async (edgeId: string) => {
      setSequenceEdgeSaving(true)
      try {
        await deleteWorkflowEdge(campaignId, edgeId, 'remove_unsent')
        setFunnelSequenceEdges((prev) => prev.filter((e) => e.id !== edgeId))
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Failed to disconnect sequence'))
      } finally {
        setSequenceEdgeSaving(false)
      }
    },
    [campaignId],
  )

  const handleDisconnectFunnelDomain = useCallback(async () => {
    setDomainActionLoading(true)
    try {
      const result = await backendPost<{
        success: boolean
        published_url?: string | null
      }>('/api/domains/disconnect-funnel', {
        funnel_id: funnel.id,
      })
      onFunnelChange({
        ...funnel,
        domain_id: null,
        published_url: result.published_url ?? funnel.published_url,
      })
    } finally {
      setDomainActionLoading(false)
    }
  }, [funnel, onFunnelChange])

  const handleConnectFunnelDomain = useCallback(
    async (domainId?: string) => {
      const id = domainId ?? selectedDomainId
      if (!id) return
      setDomainActionLoading(true)
      try {
        const result = await backendPost<{
          success: boolean
          published_url?: string | null
        }>('/api/domains/connect-funnel', {
          domain_id: id,
          funnel_id: funnel.id,
        })
        onFunnelChange({
          ...funnel,
          domain_id: id,
          published_url: result.published_url ?? funnel.published_url,
        })
      } finally {
        setDomainActionLoading(false)
      }
    },
    [funnel, onFunnelChange, selectedDomainId],
  )

  return {
    funnel,
    domains,
    domainsLoading,
    setDomains,
    sequences,
    funnelSequenceEdges,
    sequenceEdgeLoading,
    sequenceEdgeSaving,
    savingFunnelIds,
    funnelPixelSaving,
    funnelManualPixelId,
    setFunnelManualPixelId,
    allMetaPixelOptions,
    getFunnelPixelsFromMetadata,
    handleUpdateFunnelPixels,
    handleUpdateFunnelMetaEvents,
    metaEventsEnabled,
    handleToggleMetaEventsEnabled,
    metaPixelEnabled,
    handleToggleMetaPixelEnabled,
    handleDomainUpdated,
    handleToggleFunnelTag,
    handleToggleFunnelBranding,
    handleConnectFunnelSequence,
    handleDisconnectFunnelSequence,
    handleConnectFunnelDomain,
    handleDisconnectFunnelDomain,
    selectedDomainId,
    setSelectedDomainId,
    domainActionLoading,
    setDomainActionLoading,
    isFreeUser,
  }
}
