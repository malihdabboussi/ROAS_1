import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { toast } from 'sonner'
import type { IconColorId } from '@/components/ui/IconPicker'
import type { AdCampaign, AdSet } from '@/lib/artifacts'
import {
  createAdCampaign,
  createAdSet,
  deleteAdCampaign,
  deleteAdSet,
  duplicateAdCampaign,
  duplicateAdSet,
  fetchAdCampaign,
  fetchAdSet,
  refreshAdCampaignMetaStatus,
  refreshAdSetMetaStatus,
  setAdCampaignMetaStatus,
  setAdSetMetaStatus,
  updateAdCampaign,
  updateAdSet,
} from '@/lib/artifacts/paid-ads-api'
import {
  getAdCampaignIconColorId,
  getAdCampaignIconName,
  getAdSetIconColorId,
  getAdSetIconName,
} from '../paid-ads-icon'
import type { PaidAdsRowMenuTarget } from '../PaidAdsRowMenu'
import type { PaidAdsTreeSelection } from '../types'
import type { usePaidAdsData } from '../use-paid-ads-data'
import type { PaidAdsMenuPosition, PaidAdsStructureRowMenuState } from './paid-ads-structure-helpers'
import {
  buildMetaAdSetUrl,
  buildMetaCampaignUrl,
  buildPaidAdsVibeyDeepLink,
  copyPaidAdsValueToClipboard,
  getRowMenuContextPosition,
  getRowMenuTriggerPosition,
  openPaidAdsLinkInNewTab,
} from './paid-ads-structure-action-utils'

export function usePaidAdsStructureActions({
  platformCampaignId,
  spaceId,
  data,
  selection,
  setSelection,
  ensureCampaignExpanded,
}: {
  platformCampaignId: string
  spaceId: string | null
  data: ReturnType<typeof usePaidAdsData>
  selection: PaidAdsTreeSelection | null
  setSelection: Dispatch<SetStateAction<PaidAdsTreeSelection | null>>
  ensureCampaignExpanded: (campaignId: string) => void
}) {
  const [rowMenu, setRowMenu] = useState<PaidAdsStructureRowMenuState | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const closeRowMenu = useCallback(() => setRowMenu(null), [])

  const startRename = useCallback((id: string, currentName: string) => {
    setRenameId(id)
    setRenameDraft(currentName ?? '')
  }, [])

  const cancelRename = useCallback(() => {
    setRenameId(null)
    setRenameDraft('')
  }, [])

  const submitRenameForCampaign = useCallback(
    async (campaign: AdCampaign) => {
      if (renameId !== campaign.id) return
      const next = renameDraft.trim()
      cancelRename()
      if (!next || next === campaign.name) return
      try {
        const updated = await updateAdCampaign(campaign.id, { name: next })
        data.patchAdCampaign(updated)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to rename campaign')
      }
    },
    [renameId, renameDraft, cancelRename, data],
  )

  const submitRenameForAdSet = useCallback(
    async (set: AdSet) => {
      if (renameId !== set.id) return
      const next = renameDraft.trim()
      cancelRename()
      if (!next || next === set.name) return
      try {
        const updated = await updateAdSet(set.id, { name: next })
        data.patchAdSet(updated)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to rename ad set')
      }
    },
    [renameId, renameDraft, cancelRename, data],
  )

  const positionFromTrigger = useCallback(getRowMenuTriggerPosition, [])
  const positionFromContextMenu = useCallback(getRowMenuContextPosition, [])

  const openCampaignMenu = useCallback((campaign: AdCampaign, position: PaidAdsMenuPosition) => {
    setRowMenu({
      rowId: `campaign:${campaign.id}`,
      position,
      target: {
        kind: 'campaign',
        data: campaign,
        iconName: getAdCampaignIconName(campaign),
        iconColorId: getAdCampaignIconColorId(campaign),
      },
    })
  }, [])

  const openAdSetMenu = useCallback(
    (
      adSet: AdSet,
      adAccountId: string | null,
      hasAds: boolean,
      position: PaidAdsMenuPosition,
    ) => {
      setRowMenu({
        rowId: `ad_set:${adSet.id}`,
        position,
        target: {
          kind: 'ad_set',
          data: adSet,
          adAccountId,
          hasAds,
          iconName: getAdSetIconName(adSet),
          iconColorId: getAdSetIconColorId(adSet),
        },
      })
    },
    [],
  )

  const copyToClipboard = useCallback(copyPaidAdsValueToClipboard, [])
  const buildVibeyDeepLink = useCallback(buildPaidAdsVibeyDeepLink, [])
  const openInNewTab = useCallback(openPaidAdsLinkInNewTab, [])
  const getMetaCampaignUrl = useCallback(buildMetaCampaignUrl, [])
  const getMetaAdSetUrl = useCallback(buildMetaAdSetUrl, [])

  const patchCampaignIcon = useCallback(
    async (campaign: AdCampaign, patch: { icon?: string; icon_color?: IconColorId }) => {
      const latest = data.adCampaigns.find((item) => item.id === campaign.id) ?? campaign
      const metadata = {
        ...(latest.metadata ?? {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.icon_color !== undefined ? { icon_color: patch.icon_color } : {}),
      }
      data.patchAdCampaign({ ...latest, metadata })
      try {
        const updated = await updateAdCampaign(campaign.id, { metadata })
        data.patchAdCampaign(updated)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update icon')
      }
    },
    [data],
  )

  const duplicateCampaign = useCallback(
    async (campaign: AdCampaign) => {
      try {
        const created = await duplicateAdCampaign(campaign.id)
        data.insertAdCampaign(created)
        toast.success('Campaign duplicated')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to duplicate campaign')
      }
    },
    [data],
  )

  const setCampaignStatus = useCallback(
    async (campaign: AdCampaign, status: 'ACTIVE' | 'PAUSED') => {
      try {
        await setAdCampaignMetaStatus(campaign.id, status)
        const updated = await fetchAdCampaign(campaign.id)
        data.patchAdCampaign(updated)
        toast.success(status === 'ACTIVE' ? 'Campaign activated' : 'Campaign paused')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update Meta status')
      }
    },
    [data],
  )

  const refreshCampaignStatus = useCallback(
    async (campaign: AdCampaign) => {
      try {
        await refreshAdCampaignMetaStatus(campaign.id)
        const updated = await fetchAdCampaign(campaign.id)
        data.patchAdCampaign(updated)
        toast.success('Status refreshed')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to refresh status')
      }
    },
    [data],
  )

  const deleteCampaign = useCallback(
    async (campaign: AdCampaign, mode: 'keep_ads' | 'delete_all') => {
      const label = campaign.name || 'this campaign'
      const message =
        mode === 'delete_all'
          ? `Delete "${label}" and all ad sets + ads? This cannot be undone.`
          : `Delete "${label}"? Ads will move to Ungrouped.`
      if (!window.confirm(message)) return
      try {
        await deleteAdCampaign(campaign.id, mode)
        await data.refresh(true)
        if (selection?.kind === 'campaign' && selection.id === campaign.id) setSelection(null)
        toast.success('Campaign deleted')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete campaign')
      }
    },
    [data, selection, setSelection],
  )

  const patchAdSetIcon = useCallback(
    async (set: AdSet, patch: { icon?: string; icon_color?: IconColorId }) => {
      let latest: AdSet | undefined
      for (const campaign of data.adCampaigns) {
        const found = campaign.ad_sets?.find((item) => item.id === set.id)
        if (found) {
          latest = found
          break
        }
      }
      const base = latest ?? set
      const metadata = {
        ...(base.metadata ?? {}),
        ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
        ...(patch.icon_color !== undefined ? { icon_color: patch.icon_color } : {}),
      }
      data.patchAdSet({ ...base, metadata })
      try {
        const updated = await updateAdSet(set.id, { metadata })
        data.patchAdSet(updated)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update icon')
      }
    },
    [data],
  )

  const duplicateAdSetAction = useCallback(
    async (set: AdSet) => {
      try {
        await duplicateAdSet(set.id)
        await data.refresh(true)
        toast.success('Ad set duplicated')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to duplicate ad set')
      }
    },
    [data],
  )

  const setAdSetStatus = useCallback(
    async (set: AdSet, status: 'ACTIVE' | 'PAUSED') => {
      try {
        await setAdSetMetaStatus(set.id, status)
        const updated = await fetchAdSet(set.id)
        data.patchAdSet(updated)
        toast.success(status === 'ACTIVE' ? 'Ad set activated' : 'Ad set paused')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to update Meta status')
      }
    },
    [data],
  )

  const refreshAdSetStatus = useCallback(
    async (set: AdSet) => {
      try {
        await refreshAdSetMetaStatus(set.id)
        const updated = await fetchAdSet(set.id)
        data.patchAdSet(updated)
        toast.success('Status refreshed')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to refresh status')
      }
    },
    [data],
  )

  const deleteAdSetAction = useCallback(
    async (set: AdSet, mode: 'keep_ads' | 'delete_all') => {
      const label = set.name || 'this ad set'
      const message =
        mode === 'delete_all'
          ? `Delete "${label}" and all ads? This cannot be undone.`
          : `Delete "${label}"? Ads will move to Ungrouped.`
      if (!window.confirm(message)) return
      try {
        await deleteAdSet(set.id, mode)
        await data.refresh(true)
        if (selection?.kind === 'ad_set' && selection.id === set.id) setSelection(null)
        toast.success('Ad set deleted')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to delete ad set')
      }
    },
    [data, selection, setSelection],
  )

  const handleNewCampaign = useCallback(async () => {
    try {
      const created = await createAdCampaign(platformCampaignId, undefined, spaceId)
      data.insertAdCampaign(created)
      ensureCampaignExpanded(created.id)
      setSelection({
        kind: 'campaign',
        id: created.id,
        title: created.name || 'Untitled Campaign',
      })
      toast.success('Ad campaign created')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create ad campaign')
    }
  }, [data, ensureCampaignExpanded, platformCampaignId, setSelection, spaceId])

  const addAdSetForCampaign = useCallback(
    async (campaign: AdCampaign) => {
      ensureCampaignExpanded(campaign.id)
      try {
        const created = await createAdSet(campaign.id, 'Untitled Ad Set', spaceId)
        data.insertAdSet(campaign.id, created)
        setSelection({
          kind: 'ad_set',
          id: created.id,
          title: created.name || 'Untitled Ad Set',
          adCampaignId: campaign.id,
        })
        toast.success('Ad set created')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to create ad set')
      }
    },
    [data, ensureCampaignExpanded, setSelection, spaceId],
  )

  return {
    rowMenu,
    menuOpenRowId: rowMenu?.rowId ?? null,
    renameId,
    renameDraft,
    closeRowMenu,
    startRename,
    cancelRename,
    setRenameDraft,
    submitRenameForCampaign,
    submitRenameForAdSet,
    positionFromTrigger,
    positionFromContextMenu,
    openCampaignMenu,
    openAdSetMenu,
    copyToClipboard,
    buildVibeyDeepLink,
    openInNewTab,
    buildMetaCampaignUrl: getMetaCampaignUrl,
    buildMetaAdSetUrl: getMetaAdSetUrl,
    patchCampaignIcon,
    duplicateCampaign,
    setCampaignStatus,
    refreshCampaignStatus,
    deleteCampaign,
    patchAdSetIcon,
    duplicateAdSetAction,
    setAdSetStatus,
    refreshAdSetStatus,
    deleteAdSetAction,
    handleNewCampaign,
    addAdSetForCampaign,
  }
}

export type PaidAdsStructureActions = ReturnType<typeof usePaidAdsStructureActions>
export type { PaidAdsRowMenuTarget }
