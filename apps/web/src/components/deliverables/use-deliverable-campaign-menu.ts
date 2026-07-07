'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getMovableArtifactTarget } from '@/components/deliverables/deliverable-movable-artifact'
import {
  copyArtifactToCampaign,
  fetchCampaigns,
  moveArtifactToCampaign,
  resolveArtifactCampaigns,
  type Campaign,
} from '@/lib/campaigns'
import type { MissionDeliverable } from '@/lib/missions'

export type CampaignPickerOption = { id: string; label: string; isCurrent: boolean }

export type CampaignToCampaignAction = 'move' | 'copy'

export function useDeliverableCampaignMenu(
  deliverable: MissionDeliverable,
  options?: { onCampaignMoved?: () => void },
) {
  const campaignButtonRef = useRef<HTMLButtonElement>(null)
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
  const [campaignRows, setCampaignRows] = useState<Campaign[]>([])
  const [campaignsLoaded, setCampaignsLoaded] = useState(false)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [movingToCampaign, setMovingToCampaign] = useState(false)
  const [campaignAction, setCampaignAction] = useState<CampaignToCampaignAction>('move')
  /** Lineage campaign ids from DB when dropdown opens; updated after move/copy */
  const [artifactCampaignIds, setArtifactCampaignIds] = useState<string[]>([])
  const [campaignDropdownPos, setCampaignDropdownPos] = useState({ top: 0, left: 0, right: 0 })

  const movable = useMemo(() => getMovableArtifactTarget(deliverable), [deliverable])
  const eligible = movable !== null
  const onCampaignMovedRef = useRef(options?.onCampaignMoved)
  onCampaignMovedRef.current = options?.onCampaignMoved

  useEffect(() => {
    setCampaignsLoaded(false)
    setCampaignRows([])
    setArtifactCampaignIds(
      deliverable.campaign_id ? ([deliverable.campaign_id].filter(Boolean) as string[]) : [],
    )
    setCampaignDropdownOpen(false)
    setCampaignAction('move')
  }, [deliverable.id, deliverable.campaign_id])

  useLayoutEffect(() => {
    if (!campaignDropdownOpen || !campaignButtonRef.current) return
    const rect = campaignButtonRef.current.getBoundingClientRect()
    setCampaignDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      right: window.innerWidth - rect.right,
    })
  }, [campaignDropdownOpen])

  useEffect(() => {
    if (!campaignDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (campaignButtonRef.current?.contains(t)) return
      if (t.closest('[data-dropdown="campaign-move"]')) return
      setCampaignDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [campaignDropdownOpen])

  const campaignOptions = useMemo((): CampaignPickerOption[] => {
    return campaignRows
      .filter((c) => (c.config as Record<string, unknown>)?.system_kind !== 'general')
      .map((c) => ({
        id: c.id,
        label: c.name,
        isCurrent: artifactCampaignIds.includes(c.id),
      }))
  }, [campaignRows, artifactCampaignIds])

  const refreshLineageCampaigns = useCallback(async () => {
    if (!movable) return
    const map = await resolveArtifactCampaigns([{ table: movable.table, id: movable.artifactId }])
    const key = `${movable.table}:${movable.artifactId}`
    const ids = map[key] ?? []
    setArtifactCampaignIds(ids)
  }, [movable])

  const loadForDropdown = useCallback(async () => {
    setCampaignsLoading(true)
    try {
      if (!campaignsLoaded) {
        const campaigns = await fetchCampaigns()
        setCampaignRows(campaigns)
        setCampaignsLoaded(true)
      }
    } catch {
      setCampaignRows([])
      setCampaignsLoaded(true)
      setArtifactCampaignIds(
        deliverable.campaign_id ? ([deliverable.campaign_id].filter(Boolean) as string[]) : [],
      )
      setCampaignsLoading(false)
      return
    }
    try {
      if (movable) {
        await refreshLineageCampaigns()
      } else {
        setArtifactCampaignIds(
          deliverable.campaign_id ? ([deliverable.campaign_id].filter(Boolean) as string[]) : [],
        )
      }
    } catch {
      setArtifactCampaignIds(
        deliverable.campaign_id ? ([deliverable.campaign_id].filter(Boolean) as string[]) : [],
      )
    } finally {
      setCampaignsLoading(false)
    }
  }, [campaignsLoaded, movable, deliverable.campaign_id, refreshLineageCampaigns])

  const handleCampaignDropdownToggle = useCallback(() => {
    setCampaignDropdownOpen((o) => {
      const next = !o
      if (next) void loadForDropdown()
      return next
    })
  }, [loadForDropdown])

  const handleSelectCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (!movable || movingToCampaign) return
      if (artifactCampaignIds.includes(targetCampaignId)) {
        toast.info('Already in this campaign')
        setCampaignDropdownOpen(false)
        return
      }
      setMovingToCampaign(true)
      try {
        if (campaignAction === 'move') {
          await moveArtifactToCampaign(movable.table, movable.artifactId, targetCampaignId)
        } else {
          await copyArtifactToCampaign(movable.table, movable.artifactId, targetCampaignId)
        }
        await refreshLineageCampaigns()
        onCampaignMovedRef.current?.()
        toast.success(campaignAction === 'move' ? 'Moved to campaign' : 'Copied to campaign')
        setCampaignDropdownOpen(false)
      } catch {
        toast.error(
          campaignAction === 'move' ? 'Could not move to campaign' : 'Could not copy to campaign',
        )
      } finally {
        setMovingToCampaign(false)
      }
    },
    [movable, movingToCampaign, artifactCampaignIds, campaignAction, refreshLineageCampaigns],
  )

  return {
    eligible,
    campaignButtonRef,
    campaignDropdownOpen,
    setCampaignDropdownOpen,
    campaignOptions,
    campaignsLoading,
    movingToCampaign,
    campaignDropdownPos,
    campaignAction,
    setCampaignAction,
    handleCampaignDropdownToggle,
    handleSelectCampaign,
  }
}
