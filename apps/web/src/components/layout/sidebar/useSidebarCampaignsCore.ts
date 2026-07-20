'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  archiveCampaign,
  campaignListCacheKey,
  createCampaign,
  deleteCampaign,
  fetchCampaigns,
  fetchCampaignUserState,
  updateCampaign,
  updateCampaignUserState,
  type CampaignUserState,
} from '@/features/studio/services/campaign.service'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { SIDEBAR_TOAST_ERRORS } from '../config/sidebar-toast-errors.config'
import type { SidebarCampaignRow, SidebarEditingCampaign } from './sidebar-types'

// Shared with use-space-campaign-name.ts (and other campaigns consumers): one
// org-scoped network call per 60s window across the whole app instead of one per mount.
const CAMPAIGNS_LIST_CACHE_KEY = 'campaigns:list'
const CAMPAIGNS_USER_STATE_CACHE_KEY = 'campaigns:user-state'
const CAMPAIGNS_CACHE_TTL_MS = 60_000

function invalidateCampaignsListCache() {
  invalidateCachedFetch(CAMPAIGNS_LIST_CACHE_KEY)
}

function invalidateCampaignsUserStateCache() {
  invalidateCachedFetch(CAMPAIGNS_USER_STATE_CACHE_KEY)
}

export function useSidebarCampaignsCore({
  activeCampaignId,
  setActiveCampaign,
}: {
  activeCampaignId: string | null
  setActiveCampaign: (id: string | null, name?: string | null, icon?: string | null) => void
}) {
  const campaignsCacheKey = getOrgScopedKey('vibey-campaigns-cache')
  const campaignsListCacheKey = campaignListCacheKey()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<SidebarCampaignRow[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignIcon, setNewCampaignIcon] = useState('folder-kanban')
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<SidebarEditingCampaign>(null)
  const [deletingCampaign, setDeletingCampaign] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [campaignMenuId, setCampaignMenuId] = useState<string | null>(null)
  const campaignMenuTriggerRef = useRef<HTMLElement | null>(null)
  const [campaignMenuAnchorRect, setCampaignMenuAnchorRect] = useState<{
    top: number
    left: number
    bottom: number
    right: number
  } | null>(null)

  useEffect(() => {
    function handleCampaignDeleted(e: Event) {
      const { id: deletedId } = (e as CustomEvent<{ id: string }>).detail
      invalidateCampaignsListCache()
      setCampaigns((prev) => prev.filter((c) => c.id !== deletedId))
      try {
        const cached = localStorage.getItem(campaignsCacheKey)
        if (cached) {
          const parsed = JSON.parse(cached) as { id: string }[]
          localStorage.setItem(
            campaignsCacheKey,
            JSON.stringify(parsed.filter((c) => c.id !== deletedId)),
          )
        }
      } catch {
        /* empty */
      }
      if (activeCampaignId === deletedId) setActiveCampaign(null)
    }
    window.addEventListener('campaign-deleted', handleCampaignDeleted)
    return () => window.removeEventListener('campaign-deleted', handleCampaignDeleted)
  }, [activeCampaignId, campaignsCacheKey, setActiveCampaign])

  useEffect(() => {
    try {
      const cached = localStorage.getItem(campaignsCacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as Array<Partial<SidebarCampaignRow>>
        setCampaigns(
          parsed.map((c) => ({
            id: String(c.id ?? ''),
            name: String(c.name ?? 'Untitled'),
            icon: String(c.icon ?? 'folder-kanban'),
            isPinned: !!c.isPinned,
            isSystemGeneral: !!c.isSystemGeneral,
            isSystemPersonal: !!c.isSystemPersonal,
            isFavorite: !!c.isFavorite,
            isHidden: !!c.isHidden,
            config: (c.config as Record<string, unknown>) ?? {},
            created_at: String(c.created_at ?? ''),
          })),
        )
        setCampaignsLoading(false)
      }
    } catch {
      /* empty */
    }

    async function load() {
      try {
        const [data, userStateRows] = await Promise.all([
          cachedFetch(campaignsListCacheKey, fetchCampaigns, {
            ttlMs: CAMPAIGNS_CACHE_TTL_MS,
          }),
          cachedFetch(CAMPAIGNS_USER_STATE_CACHE_KEY, fetchCampaignUserState, {
            ttlMs: CAMPAIGNS_CACHE_TTL_MS,
          }).catch(() => [] as CampaignUserState[]),
        ])
        const stateById = new Map(userStateRows.map((s) => [s.campaign_id, s]))
        const mapped: SidebarCampaignRow[] = data.map((c) => {
          const state = stateById.get(c.id)
          return {
            id: c.id,
            name: c.name ?? 'Untitled',
            icon: ((c.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban',
            isPinned: !!(c.config as Record<string, unknown>)?.isPinned,
            isSystemGeneral: (c.config as Record<string, unknown>)?.system_kind === 'general',
            isSystemPersonal: (c.config as Record<string, unknown>)?.system_kind === 'personal',
            isFavorite: !!state?.is_favorite,
            isHidden: !!state?.is_hidden,
            config: (c.config as Record<string, unknown>) ?? {},
            created_at: c.created_at,
          }
        })
        setCampaigns(mapped)
        try {
          localStorage.setItem(campaignsCacheKey, JSON.stringify(mapped))
        } catch {
          /* empty */
        }
      } catch (e) {
        toast.error(sanitizeUserError(e, SIDEBAR_TOAST_ERRORS.LOAD_CAMPAIGNS_FAILED.userMessage))
      } finally {
        setCampaignsLoading(false)
      }
    }
    void load()
  }, [campaignsCacheKey, campaignsListCacheKey])

  useEffect(() => {
    if (campaignMenuId && campaignMenuTriggerRef.current) {
      const rect = campaignMenuTriggerRef.current.getBoundingClientRect()
      setCampaignMenuAnchorRect({
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
      })
    }
  }, [campaignMenuId])

  const requestCreateCampaign = useCallback(() => {
    setShowNewCampaignModal(true)
  }, [])

  const handleCreateCampaignInline = useCallback(async () => {
    const name = newCampaignName.trim()
    const icon = newCampaignIcon
    if (!name) return
    setIsCreatingCampaign(false)
    setNewCampaignName('')
    setNewCampaignIcon('folder-kanban')
    try {
      const newCampaign = await createCampaign(name, icon)
      invalidateCampaignsListCache()
      setCampaigns((prev) => [
        {
          id: newCampaign.id,
          name: newCampaign.name ?? name,
          icon,
          isPinned: false,
          isSystemGeneral: false,
          isSystemPersonal: false,
          isFavorite: false,
          isHidden: false,
          config: (newCampaign.config as Record<string, unknown>) ?? {},
          created_at: newCampaign.created_at,
        },
        ...prev,
      ])
      setActiveCampaign(newCampaign.id, newCampaign.name ?? name, icon)
    } catch (e) {
      toast.error(sanitizeUserError(e, SIDEBAR_TOAST_ERRORS.SAVE_CAMPAIGN_FAILED.userMessage))
    }
  }, [newCampaignName, newCampaignIcon, setActiveCampaign])

  const sortedCampaigns = useMemo(() => {
    const rank = (c: SidebarCampaignRow) => {
      if (c.isSystemPersonal) return 0
      if (c.isSystemGeneral) return 1
      if (c.isFavorite) return 2
      return 3
    }
    return [...campaigns]
      .filter((c) => !c.isHidden)
      .sort((a, b) => {
        const rankDiff = rank(a) - rank(b)
        if (rankDiff !== 0) return rankDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [campaigns])

  const generalCampaign = useMemo(
    () => sortedCampaigns.find((campaign) => campaign.isSystemGeneral) ?? null,
    [sortedCampaigns],
  )
  const personalCampaign = useMemo(
    () => sortedCampaigns.find((campaign) => campaign.isSystemPersonal) ?? null,
    [sortedCampaigns],
  )
  const manageCampaigns = useMemo(() => sortedCampaigns, [sortedCampaigns])

  const hiddenCampaigns = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.isHidden && !c.isSystemGeneral && !c.isSystemPersonal)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [campaigns],
  )

  const handlePinCampaign = useCallback(
    async (campaignId: string, currentlyPinned: boolean) => {
      const newPinned = !currentlyPinned
      try {
        const campaign = campaigns.find((c) => c.id === campaignId)
        if (!campaign) return
        await updateCampaign(campaignId, { config: { ...campaign.config, isPinned: newPinned } })
        invalidateCampaignsListCache()
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaignId
              ? { ...c, isPinned: newPinned, config: { ...c.config, isPinned: newPinned } }
              : c,
          ),
        )
      } catch (e) {
        toast.error(sanitizeUserError(e, SIDEBAR_TOAST_ERRORS.PIN_CAMPAIGN_FAILED.userMessage))
      }
      setCampaignMenuId(null)
    },
    [campaigns],
  )

  const patchCampaignConfig = useCallback(
    async (campaignId: string, configPatch: Record<string, unknown>) => {
      const previous = campaigns.find((c) => c.id === campaignId)
      if (!previous) return
      const nextConfig = { ...previous.config, ...configPatch }
      const optimistic: SidebarCampaignRow = {
        ...previous,
        config: nextConfig,
        ...(typeof configPatch.icon === 'string' ? { icon: configPatch.icon as string } : {}),
      }
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? optimistic : c)))
      try {
        await updateCampaign(campaignId, { config: nextConfig })
        invalidateCampaignsListCache()
      } catch (e) {
        setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? previous : c)))
        toast.error(sanitizeUserError(e, SIDEBAR_TOAST_ERRORS.SAVE_CAMPAIGN_FAILED.userMessage))
      }
    },
    [campaigns],
  )

  const handleDeleteCampaign = useCallback(
    async (campaignId: string) => {
      try {
        await deleteCampaign(campaignId)
        invalidateCampaignsListCache()
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
        if (activeCampaignId === campaignId) {
          setActiveCampaign(null)
          router.push('/team')
        }
      } catch (e) {
        toast.error(sanitizeUserError(e, SIDEBAR_TOAST_ERRORS.DELETE_CAMPAIGN_FAILED.userMessage))
      }
      setCampaignMenuId(null)
    },
    [activeCampaignId, setActiveCampaign, router],
  )

  const toggleFavoriteCampaign = useCallback(
    async (campaignId: string) => {
      const previous = campaigns.find((c) => c.id === campaignId)
      if (!previous) return
      const next = !previous.isFavorite
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, isFavorite: next } : c)),
      )
      try {
        await updateCampaignUserState(campaignId, { is_favorite: next })
        invalidateCampaignsUserStateCache()
      } catch (e) {
        setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? previous : c)))
        toast.error(sanitizeUserError(e, 'Failed to update favorite'))
      }
    },
    [campaigns],
  )

  const toggleHiddenCampaign = useCallback(
    async (campaignId: string) => {
      const previous = campaigns.find((c) => c.id === campaignId)
      if (!previous) return
      const next = !previous.isHidden
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, isHidden: next } : c)))
      try {
        await updateCampaignUserState(campaignId, { is_hidden: next })
        invalidateCampaignsUserStateCache()
        if (next) {
          toast.success(`Hidden "${previous.name}"`, {
            action: {
              label: 'Undo',
              onClick: () => {
                setCampaigns((prev) =>
                  prev.map((c) => (c.id === campaignId ? { ...c, isHidden: false } : c)),
                )
                void updateCampaignUserState(campaignId, { is_hidden: false })
                  .then(() => invalidateCampaignsUserStateCache())
                  .catch(() => {})
              },
            },
          })
        }
        if (next && activeCampaignId === campaignId) setActiveCampaign(null)
      } catch (e) {
        setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? previous : c)))
        toast.error(sanitizeUserError(e, 'Failed to hide campaign'))
      }
    },
    [campaigns, activeCampaignId, setActiveCampaign],
  )

  const archiveCampaignById = useCallback(
    async (campaignId: string) => {
      const previous = campaigns.find((c) => c.id === campaignId)
      if (!previous) return
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
      try {
        await archiveCampaign(campaignId)
        invalidateCampaignsListCache()
        toast.success(`Archived "${previous.name}"`)
        if (activeCampaignId === campaignId) {
          setActiveCampaign(null)
          router.push('/team')
        }
      } catch (e) {
        setCampaigns((prev) => [previous, ...prev])
        toast.error(sanitizeUserError(e, 'Failed to archive campaign'))
      }
      setCampaignMenuId(null)
    },
    [campaigns, activeCampaignId, setActiveCampaign, router],
  )

  const handleNewCampaignModalCreate = useCallback(
    async (name: string, icon: string) => {
      try {
        if (editingCampaign) {
          const updated = await updateCampaign(editingCampaign.id, {
            name,
            config: { ...editingCampaign.config, icon },
          })
          invalidateCampaignsListCache()
          setCampaigns((prev) =>
            prev.map((c) =>
              c.id === editingCampaign.id
                ? {
                    ...c,
                    name: updated.name ?? name,
                    icon,
                    config: (updated.config as Record<string, unknown>) ?? {
                      ...c.config,
                      icon,
                    },
                  }
                : c,
            ),
          )
          setEditingCampaign(null)
        } else {
          const newCampaign = await createCampaign(name, icon)
          invalidateCampaignsListCache()
          setCampaigns((prev) => [
            {
              id: newCampaign.id,
              name: newCampaign.name ?? name,
              icon,
              isPinned: false,
              isSystemGeneral: false,
              isSystemPersonal: false,
              isFavorite: false,
              isHidden: false,
              config: (newCampaign.config as Record<string, unknown>) ?? {},
              created_at: newCampaign.created_at,
            },
            ...prev,
          ])
          setActiveCampaign(newCampaign.id, newCampaign.name ?? name, icon)
        }
      } catch (e) {
        toast.error(sanitizeUserError(e, SIDEBAR_TOAST_ERRORS.SAVE_CAMPAIGN_FAILED.userMessage))
      }
    },
    [editingCampaign, setActiveCampaign],
  )

  return {
    campaigns,
    campaignsLoading,
    sortedCampaigns,
    generalCampaign,
    personalCampaign,
    manageCampaigns,
    hiddenCampaigns,
    isCreatingCampaign,
    setIsCreatingCampaign,
    newCampaignName,
    setNewCampaignName,
    newCampaignIcon,
    setNewCampaignIcon,
    showNewCampaignModal,
    setShowNewCampaignModal,
    editingCampaign,
    setEditingCampaign,
    deletingCampaign,
    setDeletingCampaign,
    campaignMenuId,
    setCampaignMenuId,
    campaignMenuTriggerRef,
    campaignMenuAnchorRect,
    requestCreateCampaign,
    handleCreateCampaignInline,
    handlePinCampaign,
    patchCampaignConfig,
    toggleFavoriteCampaign,
    toggleHiddenCampaign,
    archiveCampaignById,
    handleDeleteCampaign,
    handleNewCampaignModalCreate,
  }
}
