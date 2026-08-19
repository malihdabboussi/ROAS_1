import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { updateSpace } from '../services/spaces.service'
import { useSpacesStore } from '../store/use-spaces-store'
import type { Space } from '../types'
import type { SpaceSchema, ViewDef } from '../types/space-schema'

/**
 * View tab strip ordering + mutations shared by `SpaceItemsContainer`:
 * embed-aware ordering (leading view, pinned-first, surface-default pins),
 * add/reorder handlers, and the breadcrumb move/copy-to-campaign actions.
 */
export function useViewStripActions(opts: {
  embedLeadingViewId: string | null
  embedDefaultPinnedViewIds: string[] | undefined
  visibleViews: ViewDef[]
  activeSchema: SpaceSchema | undefined
  activeSpace: Space | null
  patchActiveSpaceSchema: (schema: SpaceSchema) => void
  setActiveView: (id: string) => void
}) {
  const {
    embedLeadingViewId,
    embedDefaultPinnedViewIds,
    visibleViews,
    activeSchema,
    activeSpace,
    patchActiveSpaceSchema,
    setActiveView,
  } = opts

  const orderedVisibleViews = useMemo(() => {
    const leadingId = embedLeadingViewId
    const surfaceDefaults = embedDefaultPinnedViewIds ?? []
    // Surface defaults only apply until the user pins/unpins/reorders themselves.
    const userHasPinPreference = visibleViews.some((view) => view.pinned_to_start !== undefined)
    const applyDefaults = surfaceDefaults.length > 0 && !userHasPinPreference
    if (!leadingId && !applyDefaults) return visibleViews
    const isPinned = (view: ViewDef) =>
      (view.pinned_to_start ?? false) || (applyDefaults && surfaceDefaults.includes(view.id))
    const rank = (view: ViewDef) => (view.id === leadingId ? 0 : isPinned(view) ? 1 : 2)
    const ordered = [...visibleViews].sort((left, right) => rank(left) - rank(right))
    if (!applyDefaults) return ordered
    return ordered.map((view) =>
      view.id !== leadingId && isPinned(view) && !view.pinned_to_start
        ? { ...view, pinned_to_start: true }
        : view,
    )
  }, [embedDefaultPinnedViewIds, embedLeadingViewId, visibleViews])

  const handleAddView = useCallback(
    async (newView: ViewDef) => {
      if (!activeSchema || !activeSpace) return
      const nextSchema = { ...activeSchema, views: [...activeSchema.views, newView] }
      patchActiveSpaceSchema(nextSchema)
      await updateSpace(activeSpace.id, { schema: nextSchema })
      setActiveView(newView.id)
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, setActiveView],
  )

  const handleReorderViews = useCallback(
    async (reorderedVisible: ViewDef[]) => {
      if (!activeSchema || !activeSpace || reorderedVisible.length === 0) return
      const visibleIds = new Set(visibleViews.map((v) => v.id))
      const hiddenViews = activeSchema.views.filter((v) => !visibleIds.has(v.id))
      const cleared = reorderedVisible.map((v) => ({ ...v, pinned_to_start: false }))
      const nextSchema = { ...activeSchema, views: [...cleared, ...hiddenViews] }
      patchActiveSpaceSchema(nextSchema)
      await updateSpace(activeSpace.id, { schema: nextSchema })
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, visibleViews],
  )

  const handleMoveSpaceToCampaign = useCallback(
    async (cid: string | null) => {
      if (!activeSpace) return
      if ((activeSpace.campaign_id ?? null) === cid) return
      try {
        await updateSpace(activeSpace.id, { campaign_id: cid })
        useSpacesStore.setState((s) => ({
          spaces: s.spaces.map((sp) =>
            sp.id === activeSpace.id ? { ...sp, campaign_id: cid } : sp,
          ),
        }))
        toast.success('Moved space')
      } catch {
        toast.error('Failed to move space')
      }
    },
    [activeSpace],
  )

  const handleCopySpaceToCampaign = useCallback(
    async (cid: string | null) => {
      if (!activeSpace) return
      try {
        const dup = await useSpacesStore.getState().createSpace(`${activeSpace.title} (copy)`)
        if (cid !== null) await updateSpace(dup.id, { campaign_id: cid })
        useSpacesStore.setState((s) => ({
          spaces: s.spaces.map((sp) =>
            sp.id === dup.id ? { ...sp, campaign_id: cid ?? null } : sp,
          ),
        }))
        toast.success(`Copied as "${dup.title}"`)
      } catch {
        toast.error('Failed to copy space')
      }
    },
    [activeSpace],
  )

  return {
    orderedVisibleViews,
    handleAddView,
    handleReorderViews,
    handleMoveSpaceToCampaign,
    handleCopySpaceToCampaign,
  }
}
