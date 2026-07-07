'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  cloneAdToAdSet,
  createAvatar,
  createFunnel,
  createOffer,
  createPresentation,
  createSequence,
  deleteAd,
  deleteAdCampaign,
  deleteAdSet,
  deleteAvatar,
  deleteFunnel,
  deleteFunnelPage,
  deleteOffer,
  deletePresentation,
  deleteSequence,
  deleteSocialPost,
  deleteUngroupedAds,
  duplicateAd,
  duplicateAdCampaign,
  duplicateAdSet,
  movePageToFunnel,
  moveSequenceEmailToSequence,
  reorderFunnelPages,
  reorderSequenceEmails,
  updateAd,
  updateAdCampaign,
  updateAdSet,
  updateAvatar,
  updateFunnel,
  updateFunnelPage,
  updateOffer,
  updatePresentation,
  updateSequence,
} from '@/features/studio/services/artifact-preview.service'
import { moveArtifactToCampaign } from '@/features/studio/services/campaign.service'
import { ARTIFACT_TABLE_MAP } from '../tree/constants'
import type { ArtifactsState, TreeNode } from '../tree/types'

interface UseArtifactMutationsParams {
  campaignId: string
  selectedId: string | null
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedResource: React.Dispatch<React.SetStateAction<unknown>>
  setArtifacts: React.Dispatch<React.SetStateAction<ArtifactsState>>
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  loadArtifacts: (silent?: boolean) => Promise<ArtifactsState | null>
}

export function useArtifactMutations({
  campaignId,
  selectedId,
  setSelectedId,
  setSelectedResource,
  setArtifacts,
  setExpandedIds,
  loadArtifacts,
}: UseArtifactMutationsParams) {
  const [addLoading, setAddLoading] = useState<string | null>(null)
  const [pendingAdd, setPendingAdd] = useState<string | null>(null)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteModalNode, setDeleteModalNode] = useState<TreeNode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [sequenceDeleteMode, setSequenceDeleteMode] = useState<'keep_unsent' | 'remove_unsent'>(
    'keep_unsent',
  )
  const [campaignDeleteMode, setCampaignDeleteMode] = useState<'keep_ads' | 'delete_all'>(
    'keep_ads',
  )
  const [adSetDeleteMode, setAdSetDeleteMode] = useState<'keep_ads' | 'delete_all'>('keep_ads')
  const [draggingType, setDraggingType] = useState<string | null>(null)

  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [bulkSelectedNodes, setBulkSelectedNodes] = useState<Map<string, TreeNode>>(new Map())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)

  const bulkSelectedIds = useMemo(() => new Set(bulkSelectedNodes.keys()), [bulkSelectedNodes])

  const handleStartAdd = useCallback(
    (categoryId: string) => {
      if (addLoading) return
      setPendingAdd(categoryId)
      setExpandedIds((prev) => new Set([...prev, categoryId]))
    },
    [addLoading, setExpandedIds],
  )

  const handleCancelAdd = useCallback(() => setPendingAdd(null), [])

  const handleConfirmAdd = useCallback(
    async (categoryId: string, name: string) => {
      if (!campaignId || addLoading) return
      setPendingAdd(null)
      setAddLoading(categoryId)
      try {
        if (categoryId === 'funnels') {
          const created = await createFunnel(campaignId, {
            name: name.trim() || 'New Funnel',
            funnel_type: 'lead-magnet',
          })
          setArtifacts((prev) => ({
            ...prev,
            funnels: [{ ...created, pages: created.pages ?? [] }, ...prev.funnels],
          }))
          setExpandedIds((prev) => new Set([...prev, `funnel-${created.id}`]))
        } else if (categoryId === 'offers') {
          const created = await createOffer(campaignId, name.trim() || 'Untitled Offer')
          setArtifacts((prev) => ({ ...prev, offers: [created, ...prev.offers] }))
          setExpandedIds((prev) => new Set([...prev, `offer-${created.id}`]))
        } else if (categoryId === 'sequences') {
          const created = await createSequence(campaignId, name.trim() || 'Untitled Sequence')
          setArtifacts((prev) => ({
            ...prev,
            sequences: [
              { ...created, sequence_emails: created.sequence_emails ?? [] },
              ...prev.sequences,
            ],
          }))
          setExpandedIds((prev) => new Set([...prev, `sequence-${created.id}`]))
        } else if (categoryId === 'presentations') {
          const created = await createPresentation(
            campaignId,
            name.trim() || 'Untitled Presentation',
          )
          setArtifacts((prev) => ({ ...prev, presentations: [created, ...prev.presentations] }))
        } else if (categoryId === 'avatars') {
          const created = await createAvatar(campaignId, name.trim() || 'Untitled Avatar')
          setArtifacts((prev) => ({ ...prev, avatars: [created, ...prev.avatars] }))
        }
      } catch (err) {
        console.error('Failed to create artifact:', err)
        toast.error(STUDIO_INLINE_ERRORS.CREATE_ARTIFACT)
      } finally {
        setAddLoading(null)
      }
    },
    [campaignId, addLoading, setArtifacts, setExpandedIds],
  )

  const handleReorderPages = useCallback(
    async (funnelId: string, pageIds: string[]) => {
      try {
        const updated = await reorderFunnelPages(funnelId, pageIds)
        setArtifacts((prev) => ({
          ...prev,
          funnels: prev.funnels.map((f) => (f.id === funnelId ? updated : f)),
        }))
      } catch (err) {
        console.error('Failed to reorder pages:', err)
        toast.error(STUDIO_INLINE_ERRORS.REORDER_PAGES)
      }
    },
    [setArtifacts],
  )

  const handleReorderEmails = useCallback(
    async (sequenceId: string, emailIds: string[]) => {
      try {
        const updated = await reorderSequenceEmails(sequenceId, emailIds)
        setArtifacts((prev) => ({
          ...prev,
          sequences: prev.sequences.map((s) => (s.id === sequenceId ? updated : s)),
        }))
      } catch (err) {
        console.error('Failed to reorder emails:', err)
        toast.error(STUDIO_INLINE_ERRORS.REORDER_EMAILS)
      }
    },
    [setArtifacts],
  )

  const handleMovePageToFunnel = useCallback(
    async (targetFunnelId: string, pageId: string) => {
      try {
        await movePageToFunnel(targetFunnelId, pageId)
        setExpandedIds((prev) => new Set([...prev, `funnel-${targetFunnelId}`]))
        void loadArtifacts()
      } catch (err) {
        console.error('Failed to move page:', err)
        toast.error(STUDIO_INLINE_ERRORS.MOVE_PAGE)
      }
    },
    [loadArtifacts, setExpandedIds],
  )

  const handleMoveSequenceEmailToSequence = useCallback(
    async (targetSequenceId: string, emailId: string) => {
      try {
        await moveSequenceEmailToSequence(targetSequenceId, emailId)
        setExpandedIds((prev) => new Set([...prev, `sequence-${targetSequenceId}`]))
        void loadArtifacts()
      } catch (err) {
        console.error('Failed to move email:', err)
        toast.error(STUDIO_INLINE_ERRORS.MOVE_EMAIL)
      }
    },
    [loadArtifacts, setExpandedIds],
  )

  const handleEditFolder = useCallback((node: TreeNode) => {
    setMenuOpenId(null)
    setEditingFolderId(node.id)
  }, [])

  const handleConfirmEdit = useCallback(
    async (node: TreeNode, name: string) => {
      setEditingFolderId(null)
      try {
        if (node.type === 'page' && node.funnelId && node.pageId) {
          const updated = await updateFunnelPage(node.funnelId, node.pageId, { name })
          setArtifacts((prev) => ({
            ...prev,
            funnels: prev.funnels.map((f) =>
              f.id === node.funnelId
                ? {
                    ...f,
                    pages: (f.pages ?? []).map((p) =>
                      (p as { id: string }).id === node.pageId ? updated : p,
                    ),
                  }
                : f,
            ),
          }))
        } else if (node.type === 'funnel' && node.resourceId) {
          const updated = await updateFunnel(node.resourceId, { name })
          setArtifacts((prev) => ({
            ...prev,
            funnels: prev.funnels.map((f) => (f.id === node.resourceId ? updated : f)),
          }))
        } else if (node.type === 'offer' && node.resourceId) {
          const updated = await updateOffer(node.resourceId, name)
          setArtifacts((prev) => ({
            ...prev,
            offers: prev.offers.map((o) => (o.id === node.resourceId ? updated : o)),
          }))
        } else if (node.type === 'sequence' && node.resourceId) {
          const updated = await updateSequence(node.resourceId, name)
          setArtifacts((prev) => ({
            ...prev,
            sequences: prev.sequences.map((s) => (s.id === node.resourceId ? updated : s)),
          }))
        } else if (node.type === 'presentation' && node.resourceId) {
          const updated = await updatePresentation(node.resourceId, { name })
          setArtifacts((prev) => ({
            ...prev,
            presentations: prev.presentations.map((p) => (p.id === node.resourceId ? updated : p)),
          }))
        } else if (node.type === 'avatar' && node.resourceId) {
          const updated = await updateAvatar(node.resourceId, { name })
          setArtifacts((prev) => ({
            ...prev,
            avatars: prev.avatars.map((a) => (a.id === node.resourceId ? updated : a)),
          }))
        } else if (node.type === 'ad' && node.resourceId) {
          const updated = await updateAd(node.resourceId, { headline: name })
          setArtifacts((prev) => ({
            ...prev,
            ads: prev.ads.map((a) => (a.id === node.resourceId ? updated : a)),
          }))
        } else if (node.type === 'ad-campaign' && node.resourceId) {
          const updated = await updateAdCampaign(node.resourceId, { name })
          setArtifacts((prev) => ({
            ...prev,
            adCampaigns: prev.adCampaigns.map((c) => (c.id === node.resourceId ? updated : c)),
          }))
        } else if (node.type === 'ad-set' && node.resourceId) {
          const updated = await updateAdSet(node.resourceId, { name })
          setArtifacts((prev) => ({
            ...prev,
            adCampaigns: prev.adCampaigns.map((c) => ({
              ...c,
              ad_sets: (c.ad_sets ?? []).map((s) => (s.id === node.resourceId ? updated : s)),
            })),
          }))
        }
      } catch (err) {
        console.error('Failed to update artifact:', err)
        toast.error(STUDIO_INLINE_ERRORS.UPDATE_ARTIFACT)
      }
    },
    [setArtifacts],
  )

  const handleCancelEdit = useCallback(() => setEditingFolderId(null), [])

  const handleMoveToCampaign = useCallback(
    async (node: TreeNode, targetCampaignId: string) => {
      const table = ARTIFACT_TABLE_MAP[node.type]
      const id = node.resourceId
      if (!table || !id) return
      setMenuOpenId(null)
      try {
        await moveArtifactToCampaign(table, id, targetCampaignId)
        void loadArtifacts(true)
      } catch (err) {
        console.error('Failed to move artifact:', err)
        toast.error(STUDIO_INLINE_ERRORS.MOVE_TO_CAMPAIGN)
      }
    },
    [loadArtifacts],
  )

  const handleDeleteFolder = useCallback((node: TreeNode) => {
    if (node.id === 'ungrouped-ads') {
      setMenuOpenId(null)
      setDeleteError(null)
      setDeleteModalNode(node)
      return
    }
    if (
      (node.type === 'ad-campaign' || node.type === 'ad-set' || node.type === 'ad') &&
      !node.resourceId
    )
      return
    setMenuOpenId(null)
    setDeleteError(null)
    if (node.type === 'sequence') setSequenceDeleteMode('keep_unsent')
    if (node.type === 'ad-campaign') setCampaignDeleteMode('keep_ads')
    if (node.type === 'ad-set')
      setAdSetDeleteMode(node.isPublishedToMeta ? 'delete_all' : 'keep_ads')
    setDeleteModalNode(node)
  }, [])

  const handleDuplicateFolder = useCallback(
    async (node: TreeNode) => {
      if (!node.resourceId) return
      setMenuOpenId(null)
      try {
        if (node.type === 'ad') {
          await duplicateAd(node.resourceId)
        } else if (node.type === 'ad-set') {
          await duplicateAdSet(node.resourceId)
        } else if (node.type === 'ad-campaign') {
          await duplicateAdCampaign(node.resourceId)
        } else {
          return
        }
        void loadArtifacts(true)
      } catch (err) {
        console.error('Failed to duplicate artifact:', err)
        toast.error(STUDIO_INLINE_ERRORS.DUPLICATE_ARTIFACT)
      }
    },
    [loadArtifacts],
  )

  const handleCloneToAdSet = useCallback(
    async (node: TreeNode, targetAdSetId: string) => {
      if (!node.resourceId) return
      setMenuOpenId(null)
      try {
        await cloneAdToAdSet(node.resourceId, targetAdSetId)
        toast.success('Ad cloned to the selected ad set.')
        void loadArtifacts(true)
      } catch (err) {
        console.error('Failed to clone ad:', err)
        toast.error('Failed to clone ad. Please try again.')
      }
    },
    [loadArtifacts],
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteModalNode) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      if (deleteModalNode.type === 'page' && deleteModalNode.funnelId && deleteModalNode.pageId) {
        await deleteFunnelPage(deleteModalNode.funnelId, deleteModalNode.pageId)
        setArtifacts((prev) => ({
          ...prev,
          funnels: prev.funnels.map((f) =>
            f.id === deleteModalNode.funnelId
              ? {
                  ...f,
                  pages: (f.pages ?? []).filter(
                    (p) => (p as { id: string }).id !== deleteModalNode.pageId,
                  ),
                }
              : f,
          ),
        }))
      } else if (deleteModalNode.type === 'funnel' && deleteModalNode.resourceId) {
        await deleteFunnel(deleteModalNode.resourceId)
        setArtifacts((prev) => ({
          ...prev,
          funnels: prev.funnels.filter((f) => f.id !== deleteModalNode.resourceId),
        }))
      } else if (deleteModalNode.type === 'offer' && deleteModalNode.resourceId) {
        await deleteOffer(deleteModalNode.resourceId)
        setArtifacts((prev) => ({
          ...prev,
          offers: prev.offers.filter((o) => o.id !== deleteModalNode.resourceId),
        }))
      } else if (deleteModalNode.type === 'sequence' && deleteModalNode.resourceId) {
        await deleteSequence(deleteModalNode.resourceId, sequenceDeleteMode)
        setArtifacts((prev) => ({
          ...prev,
          sequences: prev.sequences.filter((s) => s.id !== deleteModalNode.resourceId),
        }))
      } else if (deleteModalNode.type === 'presentation' && deleteModalNode.resourceId) {
        await deletePresentation(deleteModalNode.resourceId)
        setArtifacts((prev) => ({
          ...prev,
          presentations: prev.presentations.filter((p) => p.id !== deleteModalNode.resourceId),
        }))
      } else if (deleteModalNode.type === 'avatar' && deleteModalNode.resourceId) {
        await deleteAvatar(deleteModalNode.resourceId)
        setArtifacts((prev) => ({
          ...prev,
          avatars: prev.avatars.filter((a) => a.id !== deleteModalNode.resourceId),
        }))
      } else if (deleteModalNode.type === 'ad' && deleteModalNode.resourceId) {
        await deleteAd(deleteModalNode.resourceId)
        setArtifacts((prev) => ({
          ...prev,
          ads: prev.ads.filter((a) => a.id !== deleteModalNode.resourceId),
          adCampaigns: prev.adCampaigns.map((c) => ({
            ...c,
            ad_sets: (c.ad_sets ?? []).map((s) => ({
              ...s,
              ads: (s.ads ?? []).filter((a) => a.id !== deleteModalNode.resourceId),
            })),
          })),
        }))
      } else if (deleteModalNode.id === 'ungrouped-ads') {
        await deleteUngroupedAds(campaignId)
        setArtifacts((prev) => ({
          ...prev,
          ads: prev.ads.filter((a) => a.ad_set_id),
        }))
      } else if (deleteModalNode.type === 'ad-campaign' && deleteModalNode.resourceId) {
        await deleteAdCampaign(deleteModalNode.resourceId, campaignDeleteMode)
        setArtifacts((prev) => {
          const camp = prev.adCampaigns.find((c) => c.id === deleteModalNode.resourceId)
          if (campaignDeleteMode === 'delete_all') {
            const deletedAdIds = new Set<string>()
            if (camp) {
              for (const s of camp.ad_sets ?? []) {
                for (const a of s.ads ?? []) deletedAdIds.add(a.id)
              }
            }
            return {
              ...prev,
              adCampaigns: prev.adCampaigns.filter((c) => c.id !== deleteModalNode.resourceId),
              ads:
                deletedAdIds.size > 0 ? prev.ads.filter((a) => !deletedAdIds.has(a.id)) : prev.ads,
            }
          }
          const orphanedAds: typeof prev.ads = []
          if (camp) {
            for (const s of camp.ad_sets ?? []) {
              for (const a of s.ads ?? []) {
                orphanedAds.push({ ...a, ad_set_id: null })
              }
            }
          }
          return {
            ...prev,
            adCampaigns: prev.adCampaigns.filter((c) => c.id !== deleteModalNode.resourceId),
            ads: [...prev.ads, ...orphanedAds],
          }
        })
      } else if (deleteModalNode.type === 'ad-set' && deleteModalNode.resourceId) {
        const mode = deleteModalNode.isPublishedToMeta ? 'delete_all' : adSetDeleteMode
        await deleteAdSet(deleteModalNode.resourceId, mode)
        setArtifacts((prev) => {
          const adSetId = deleteModalNode.resourceId!
          const camp = prev.adCampaigns.find((c) => (c.ad_sets ?? []).some((s) => s.id === adSetId))
          const deletedAdIds = new Set<string>()
          if (mode === 'delete_all' && camp) {
            const set = (camp.ad_sets ?? []).find((s) => s.id === adSetId)
            for (const a of set?.ads ?? []) deletedAdIds.add(a.id)
          }
          return {
            ...prev,
            adCampaigns: prev.adCampaigns.map((c) => ({
              ...c,
              ad_sets: (c.ad_sets ?? []).filter((s) => s.id !== adSetId),
            })),
            ads:
              mode === 'keep_ads'
                ? prev.ads.map((a) => (a.ad_set_id === adSetId ? { ...a, ad_set_id: null } : a))
                : prev.ads.filter((a) => !deletedAdIds.has(a.id)),
          }
        })
      } else if (deleteModalNode.type === 'social-post' && deleteModalNode.resourceId) {
        await deleteSocialPost(deleteModalNode.resourceId)
        setArtifacts((prev) => ({
          ...prev,
          socialPosts: prev.socialPosts.filter((p) => p.id !== deleteModalNode.resourceId),
        }))
      }
      setDeleteModalNode(null)
      setDeleteError(null)
      if (selectedId === deleteModalNode.id) {
        setSelectedId(null)
        setSelectedResource(null)
      }
      await loadArtifacts(true)
    } catch (err) {
      console.error('Failed to delete artifact:', err)
      const rawMessage = err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.DELETE_ARTIFACT
      const shouldAppendPauseHint =
        (deleteModalNode.type === 'ad' ||
          deleteModalNode.type === 'ad-set' ||
          deleteModalNode.type === 'ad-campaign') &&
        /pause/i.test(rawMessage)
      setDeleteError(
        shouldAppendPauseHint
          ? `${rawMessage} Turn it off in settings, then try deleting again.`
          : rawMessage,
      )
    } finally {
      setIsDeleting(false)
    }
  }, [
    deleteModalNode,
    selectedId,
    sequenceDeleteMode,
    campaignDeleteMode,
    adSetDeleteMode,
    campaignId,
    loadArtifacts,
    setArtifacts,
    setSelectedId,
    setSelectedResource,
  ])

  const toggleBulkSelectMode = useCallback(() => {
    setBulkSelectMode((prev) => {
      if (prev) setBulkSelectedNodes(new Map())
      return !prev
    })
  }, [])

  const toggleBulkSelectNode = useCallback((node: TreeNode) => {
    setBulkSelectedNodes((prev) => {
      const next = new Map(prev)
      if (next.has(node.id)) next.delete(node.id)
      else next.set(node.id, node)
      return next
    })
  }, [])

  const handleBulkDelete = useCallback(() => {
    if (bulkSelectedNodes.size === 0) return
    setBulkDeleteError(null)
    setShowBulkDeleteModal(true)
  }, [bulkSelectedNodes.size])

  const handleConfirmBulkDelete = useCallback(async () => {
    if (bulkSelectedNodes.size === 0) return
    setIsBulkDeleting(true)
    setBulkDeleteError(null)

    const nodes = Array.from(bulkSelectedNodes.values())
    const typeDepth: Record<string, number> = {
      page: 0,
      'sequence-email': 0,
      ad: 1,
      'ad-set': 2,
      'ad-campaign': 3,
      funnel: 4,
      offer: 4,
      sequence: 4,
      presentation: 4,
      avatar: 4,
      'social-post': 4,
    }
    nodes.sort((a, b) => (typeDepth[a.type] ?? 99) - (typeDepth[b.type] ?? 99))

    const errors: string[] = []
    for (const node of nodes) {
      try {
        if (node.type === 'page' && node.funnelId && node.pageId) {
          await deleteFunnelPage(node.funnelId, node.pageId)
        } else if (node.type === 'funnel' && node.resourceId) {
          await deleteFunnel(node.resourceId)
        } else if (node.type === 'offer' && node.resourceId) {
          await deleteOffer(node.resourceId)
        } else if (node.type === 'sequence' && node.resourceId) {
          await deleteSequence(node.resourceId, 'keep_unsent')
        } else if (node.type === 'presentation' && node.resourceId) {
          await deletePresentation(node.resourceId)
        } else if (node.type === 'avatar' && node.resourceId) {
          await deleteAvatar(node.resourceId)
        } else if (node.type === 'ad' && node.resourceId) {
          await deleteAd(node.resourceId)
        } else if (node.type === 'ad-campaign' && node.resourceId) {
          await deleteAdCampaign(node.resourceId, 'keep_ads')
        } else if (node.type === 'ad-set' && node.resourceId) {
          await deleteAdSet(node.resourceId)
        } else if (node.type === 'social-post' && node.resourceId) {
          await deleteSocialPost(node.resourceId)
        }
      } catch (err) {
        errors.push(`${node.label}: ${err instanceof Error ? err.message : 'Failed'}`)
      }
    }

    await loadArtifacts(true)

    if (errors.length > 0) {
      setBulkDeleteError(`Failed to delete: ${errors.join(', ')}`)
    } else {
      setShowBulkDeleteModal(false)
      setBulkSelectMode(false)
      setBulkSelectedNodes(new Map())
    }

    if (selectedId && bulkSelectedNodes.has(selectedId)) {
      setSelectedId(null)
      setSelectedResource(null)
    }

    setIsBulkDeleting(false)
  }, [bulkSelectedNodes, selectedId, loadArtifacts, setSelectedId, setSelectedResource])

  const handleBulkDuplicate = useCallback(async () => {
    if (bulkSelectedNodes.size === 0) return
    const nodes = Array.from(bulkSelectedNodes.values())
    const errors: string[] = []
    let count = 0
    for (const node of nodes) {
      if (!node.resourceId) continue
      try {
        if (node.type === 'ad') {
          await duplicateAd(node.resourceId)
          count++
        } else if (node.type === 'ad-set') {
          await duplicateAdSet(node.resourceId)
          count++
        } else if (node.type === 'ad-campaign') {
          await duplicateAdCampaign(node.resourceId)
          count++
        }
      } catch (err) {
        errors.push(`${node.label}: ${err instanceof Error ? err.message : 'Failed'}`)
      }
    }
    await loadArtifacts(true)
    if (errors.length > 0) {
      toast.error(`Failed to duplicate: ${errors.join(', ')}`)
    } else if (count > 0) {
      toast.success(`Duplicated ${count} item${count > 1 ? 's' : ''}`)
    }
    setBulkSelectMode(false)
    setBulkSelectedNodes(new Map())
  }, [bulkSelectedNodes, loadArtifacts])

  const handleBulkMoveToCampaign = useCallback(
    async (targetCampaignId: string) => {
      if (bulkSelectedNodes.size === 0) return
      const nodes = Array.from(bulkSelectedNodes.values())
      const errors: string[] = []
      let count = 0
      for (const node of nodes) {
        const table = ARTIFACT_TABLE_MAP[node.type]
        const id = node.resourceId
        if (!table || !id) continue
        try {
          await moveArtifactToCampaign(table, id, targetCampaignId)
          count++
        } catch (err) {
          errors.push(`${node.label}: ${err instanceof Error ? err.message : 'Failed'}`)
        }
      }
      await loadArtifacts(true)
      if (errors.length > 0) {
        toast.error(`Failed to move: ${errors.join(', ')}`)
      } else if (count > 0) {
        toast.success(`Moved ${count} item${count > 1 ? 's' : ''} to campaign`)
      }
      setBulkSelectMode(false)
      setBulkSelectedNodes(new Map())
    },
    [bulkSelectedNodes, loadArtifacts],
  )

  const exitBulkSelect = useCallback(() => {
    setBulkSelectMode(false)
    setBulkSelectedNodes(new Map())
    setShowBulkDeleteModal(false)
    setBulkDeleteError(null)
  }, [])

  return {
    addLoading,
    pendingAdd,
    editingFolderId,
    menuOpenId,
    setMenuOpenId,
    deleteModalNode,
    setDeleteModalNode,
    isDeleting,
    deleteError,
    sequenceDeleteMode,
    setSequenceDeleteMode,
    campaignDeleteMode,
    setCampaignDeleteMode,
    adSetDeleteMode,
    setAdSetDeleteMode,
    draggingType,
    setDraggingType,
    handleStartAdd,
    handleCancelAdd,
    handleConfirmAdd,
    handleReorderPages,
    handleReorderEmails,
    handleMovePageToFunnel,
    handleMoveSequenceEmailToSequence,
    handleEditFolder,
    handleConfirmEdit,
    handleCancelEdit,
    handleMoveToCampaign,
    handleDeleteFolder,
    handleDuplicateFolder,
    handleCloneToAdSet,
    handleConfirmDelete,
    bulkSelectMode,
    bulkSelectedIds,
    bulkSelectedCount: bulkSelectedNodes.size,
    toggleBulkSelectMode,
    toggleBulkSelectNode,
    handleBulkDelete,
    handleBulkDuplicate,
    handleBulkMoveToCampaign,
    handleConfirmBulkDelete,
    showBulkDeleteModal,
    setShowBulkDeleteModal,
    isBulkDeleting,
    bulkDeleteError,
    exitBulkSelect,
  }
}
