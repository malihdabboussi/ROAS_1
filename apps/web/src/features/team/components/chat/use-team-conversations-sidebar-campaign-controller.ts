'use client'

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type {
  SidebarCampaignRow,
  SidebarEditingCampaign,
} from '@/components/layout/sidebar/sidebar-types'
import { createCampaign, deleteCampaign, updateCampaign, type Campaign } from '@/lib/campaigns'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import type { TeamConversationsSidebarProps } from './TeamConversationsSidebar'
import {
  buildCampaignById,
  TEAM_CONVERSATIONS_GENERAL_KEY,
} from './team-conversations-sidebar.logic'

type CampaignControllerOptions = Pick<
  TeamConversationsSidebarProps,
  | 'agentKey'
  | 'allCampaigns'
  | 'generalCampaignId'
  | 'onAssignAgentToCampaign'
  | 'onCampaignsRefresh'
  | 'onSessionActionsOpenIdChange'
>

export function useTeamConversationsSidebarCampaignController({
  agentKey,
  allCampaigns,
  generalCampaignId,
  onAssignAgentToCampaign,
  onCampaignsRefresh,
  onSessionActionsOpenIdChange,
}: CampaignControllerOptions) {
  const campaignMenuTriggerRef = useRef<HTMLElement | null>(null)
  const [assignConfirm, setAssignConfirm] = useState<{ id: string; name: string } | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [campaignMenuGroupKey, setCampaignMenuGroupKey] = useState<string | null>(null)
  const [campaignMenuAnchorRect, setCampaignMenuAnchorRect] = useState<{
    top: number
    left: number
    bottom: number
    right: number
  } | null>(null)
  const [shareCampaignRow, setShareCampaignRow] = useState<SidebarCampaignRow | null>(null)
  const [transferCampaign, setTransferCampaign] = useState<SidebarCampaignRow | null>(null)
  const [manageTeamCampaign, setManageTeamCampaign] = useState<SidebarCampaignRow | null>(null)
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<SidebarEditingCampaign>(null)
  const [deletingCampaign, setDeletingCampaign] = useState<{ id: string; name: string } | null>(
    null,
  )

  const campaignById = useMemo(() => buildCampaignById(allCampaigns), [allCampaigns])

  const resolveCampaignForGroup = useCallback(
    (groupKey: string): Campaign | null => {
      if (groupKey === TEAM_CONVERSATIONS_GENERAL_KEY) {
        if (!generalCampaignId) return null
        return campaignById.get(generalCampaignId) ?? null
      }
      return campaignById.get(groupKey) ?? null
    },
    [campaignById, generalCampaignId],
  )

  const deleteDialogCampaigns = useMemo(
    () =>
      allCampaigns.map((c) => {
        const cfg = (c.config ?? {}) as Record<string, unknown>
        return {
          id: c.id,
          name: c.name ?? 'Untitled',
          icon: typeof cfg.icon === 'string' ? cfg.icon : 'folder-kanban',
        }
      }),
    [allCampaigns],
  )

  useLayoutEffect(() => {
    if (!campaignMenuGroupKey || !campaignMenuTriggerRef.current) return
    const rect = campaignMenuTriggerRef.current.getBoundingClientRect()
    setCampaignMenuAnchorRect({
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
    })
  }, [campaignMenuGroupKey])

  const openNewCampaignModal = useCallback(() => {
    setEditingCampaign(null)
    setShowNewCampaignModal(true)
  }, [])

  const handleToggleCampaignMenu = useCallback(
    (groupKey: string, target: HTMLElement) => {
      onSessionActionsOpenIdChange(null)
      const next = campaignMenuGroupKey === groupKey ? null : groupKey
      if (next) campaignMenuTriggerRef.current = target
      setCampaignMenuGroupKey(next)
    },
    [campaignMenuGroupKey, onSessionActionsOpenIdChange],
  )

  const handlePinCampaignForMenu = useCallback(
    async (campaign: Campaign) => {
      const cfg = (campaign.config ?? {}) as Record<string, unknown>
      const currentlyPinned = !!cfg.isPinned
      const nextPinned = !currentlyPinned
      try {
        await updateCampaign(campaign.id, { config: { ...cfg, isPinned: nextPinned } })
        await onCampaignsRefresh?.()
      } catch (e) {
        toast.error(sanitizeUserError(e, 'Failed to update pin'))
      }
      setCampaignMenuGroupKey(null)
    },
    [onCampaignsRefresh],
  )

  const handleNewCampaignModalCreate = useCallback(
    async (name: string, icon: string) => {
      if (editingCampaign) {
        try {
          await updateCampaign(editingCampaign.id, {
            name,
            config: { ...editingCampaign.config, icon },
          })
          setEditingCampaign(null)
          await onCampaignsRefresh?.()
        } catch (e) {
          toast.error(sanitizeUserError(e, 'Failed to save campaign'))
        }
        return
      }
      try {
        const created = await createCampaign(name, icon)
        await onCampaignsRefresh?.()
        if (agentKey) {
          await onAssignAgentToCampaign?.(created.id).catch(() => null)
        }
      } catch (e) {
        toast.error(sanitizeUserError(e, 'Failed to create campaign'))
      }
    },
    [editingCampaign, onCampaignsRefresh, agentKey, onAssignAgentToCampaign],
  )

  const handleDeleteCampaignConfirm = useCallback(
    async (campaignId: string) => {
      await deleteCampaign(campaignId)
      window.dispatchEvent(new CustomEvent('campaign-deleted', { detail: { id: campaignId } }))
      await onCampaignsRefresh?.()
    },
    [onCampaignsRefresh],
  )

  const handleAssignConfirm = useCallback(async () => {
    if (!onAssignAgentToCampaign || !assignConfirm) return
    setAssigning(true)
    try {
      await onAssignAgentToCampaign(assignConfirm.id)
    } finally {
      setAssigning(false)
      setAssignConfirm(null)
    }
  }, [assignConfirm, onAssignAgentToCampaign])

  const handleEditCampaignFromMenu = useCallback((campaignRow: SidebarCampaignRow) => {
    setEditingCampaign({
      id: campaignRow.id,
      name: campaignRow.name,
      icon: campaignRow.icon,
      config: campaignRow.config,
    })
    setShowNewCampaignModal(true)
    setCampaignMenuGroupKey(null)
  }, [])

  const handleDeleteCampaignFromMenu = useCallback((campaignRow: SidebarCampaignRow) => {
    setDeletingCampaign({ id: campaignRow.id, name: campaignRow.name })
    setCampaignMenuGroupKey(null)
  }, [])

  const handleShareCampaignFromMenu = useCallback((campaignRow: SidebarCampaignRow) => {
    setShareCampaignRow(campaignRow)
    setCampaignMenuGroupKey(null)
  }, [])

  const handleTransferCampaignFromMenu = useCallback((campaignRow: SidebarCampaignRow) => {
    setTransferCampaign(campaignRow)
    setCampaignMenuGroupKey(null)
  }, [])

  const handleManageTeamCampaignFromMenu = useCallback((campaignRow: SidebarCampaignRow) => {
    setManageTeamCampaign(campaignRow)
    setCampaignMenuGroupKey(null)
  }, [])

  const handleNewCampaignModalClose = useCallback(() => {
    setShowNewCampaignModal(false)
    setEditingCampaign(null)
  }, [])

  const handleManageTeamOpenChange = useCallback((open: boolean) => {
    if (!open) setManageTeamCampaign(null)
  }, [])

  return {
    assignConfirm,
    assigning,
    campaignMenuAnchorRect,
    campaignMenuGroupKey,
    deleteDialogCampaigns,
    deletingCampaign,
    editingCampaign,
    manageTeamCampaign,
    resolveCampaignForGroup,
    shareCampaignRow,
    showNewCampaignModal,
    transferCampaign,
    handleAssignConfirm,
    handleDeleteCampaignConfirm,
    handleDeleteCampaignFromMenu,
    handleEditCampaignFromMenu,
    handleManageTeamOpenChange,
    handleManageTeamCampaignFromMenu,
    handleNewCampaignModalClose,
    handleNewCampaignModalCreate,
    handlePinCampaignForMenu,
    handleShareCampaignFromMenu,
    handleToggleCampaignMenu,
    handleTransferCampaignFromMenu,
    openNewCampaignModal,
    setAssignConfirm,
    setCampaignMenuGroupKey,
    setDeletingCampaign,
    setShareCampaignRow,
    setTransferCampaign,
  }
}
