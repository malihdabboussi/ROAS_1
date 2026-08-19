import { useCallback, type MutableRefObject, type RefObject } from 'react'
import { toast } from 'sonner'
import {
  SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS,
  SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS,
} from '../config/spaces-customize-view.config'
import { saveViewForEveryone, updateSpace } from '../services/spaces.service'
import type { Space } from '../types'
import type { SpaceSchema, ViewDef } from '../types/space-schema'

export function useCustomizeViewActions(opts: {
  customizePanelTargetView: ViewDef | null
  activeSchema: SpaceSchema | undefined
  activeSpace: Space | null
  activeViewId: string | null
  activeView: ViewDef | null
  canSaveForEveryone: boolean
  customizeFlushCtxRef: RefObject<{
    activeSchema: SpaceSchema | undefined
    activeSpace: Space | null
    activeView: ViewDef | null
    isTeamSpace: boolean
  }>
  patchActiveSpaceSchema: (patch: Partial<SpaceSchema> | SpaceSchema) => void
  refresh: () => Promise<void>
  resetViewOverride: (viewId: string) => Promise<void>
  sessionViewDrafts: Record<string, Partial<ViewDef>>
  setActiveView: (id: string) => void
  clearSessionDraft: (viewId: string) => void
  pendingViewPatchRef: MutableRefObject<Partial<ViewDef> | null>
  flushPendingViewPatch: () => Promise<void>
  closeCustomizePanel: () => void
  handleViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  /** Surface-default pins (e.g. Meetings pins Agenda) — materialized on the first explicit pin action. */
  defaultPinnedViewIds?: string[]
}) {
  const {
    customizePanelTargetView,
    activeSchema,
    activeSpace,
    activeViewId,
    activeView,
    canSaveForEveryone,
    customizeFlushCtxRef,
    patchActiveSpaceSchema,
    refresh,
    resetViewOverride,
    sessionViewDrafts,
    setActiveView,
    clearSessionDraft,
    pendingViewPatchRef,
    flushPendingViewPatch,
    closeCustomizePanel,
    handleViewPatch,
    defaultPinnedViewIds,
  } = opts

  const handleSaveForEveryone = useCallback(async () => {
    if (!customizePanelTargetView || !activeSpace || !canSaveForEveryone) return
    try {
      await saveViewForEveryone(
        activeSpace.id,
        customizePanelTargetView.id,
        customizePanelTargetView as unknown as Record<string, unknown>,
      )
      await refresh()
      toast.success(SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.SAVE_FOR_EVERYONE.userMessage)
    } catch {
      toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.SAVE_FOR_EVERYONE_FAILED.userMessage)
    }
  }, [customizePanelTargetView, activeSpace, canSaveForEveryone, refresh])

  const handleResetViewToDefault = useCallback(async () => {
    if (!customizePanelTargetView || !activeSpace) return
    try {
      await resetViewOverride(customizePanelTargetView.id)
      toast.success(SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.RESET_TO_DEFAULT.userMessage)
    } catch {
      toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.RESET_FAILED.userMessage)
    }
  }, [customizePanelTargetView, activeSpace, resetViewOverride])

  const handleSaveViewDraft = useCallback(async () => {
    if (!customizePanelTargetView || !activeSchema || !activeSpace) return
    const draft = sessionViewDrafts[customizePanelTargetView.id]
    if (!draft || Object.keys(draft).length === 0) return
    clearSessionDraft(customizePanelTargetView.id)
    pendingViewPatchRef.current = { ...(pendingViewPatchRef.current ?? {}), ...draft }
    await flushPendingViewPatch()
    toast.success(SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.VIEW_SAVED.userMessage)
  }, [
    customizePanelTargetView,
    activeSchema,
    activeSpace,
    sessionViewDrafts,
    clearSessionDraft,
    pendingViewPatchRef,
    flushPendingViewPatch,
  ])

  const handleEnableAutosaveAndFlush = useCallback(() => {
    if (!customizePanelTargetView) return
    void handleViewPatch({ autosave_for_me: true })
  }, [customizePanelTargetView, handleViewPatch])

  const handleSaveAsNewView = useCallback(async () => {
    if (!customizePanelTargetView || !activeSchema || !activeSpace) return
    const suffix = `${customizePanelTargetView.name} (copy)`
    const newId = `${customizePanelTargetView.id}_${Date.now()}`
    const clone: ViewDef = {
      ...customizePanelTargetView,
      id: newId,
      name: suffix,
      pinned_to_start: false,
    }
    const nextSchema = { ...activeSchema, views: [...activeSchema.views, clone] }
    patchActiveSpaceSchema(nextSchema)
    try {
      await updateSpace(activeSpace.id, { schema: nextSchema })
      clearSessionDraft(customizePanelTargetView.id)
      setActiveView(newId)
      toast.success(SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.VIEW_SAVED_AS_NEW.userMessage)
    } catch {
      toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.SAVE_AS_NEW_VIEW_FAILED.userMessage)
      await refresh()
    }
  }, [
    customizePanelTargetView,
    activeSchema,
    activeSpace,
    patchActiveSpaceSchema,
    clearSessionDraft,
    setActiveView,
    refresh,
  ])

  const handleRevertViewDraft = useCallback(() => {
    if (!customizePanelTargetView) return
    clearSessionDraft(customizePanelTargetView.id)
    toast.success(SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.VIEW_REVERTED.userMessage)
  }, [clearSessionDraft, customizePanelTargetView])

  const handleTogglePinViewById = useCallback(
    async (viewId: string, pinned: boolean) => {
      if (!activeSchema || !activeSpace) return
      const orgView = activeSchema.views.find((v) => v.id === viewId)
      if (!orgView) return
      // Until the user has expressed a pin preference, surface defaults count as pinned —
      // materialize them so the first explicit pin doesn't silently drop them.
      const applyDefaults =
        (defaultPinnedViewIds?.length ?? 0) > 0 &&
        activeSchema.views.every((v) => v.pinned_to_start === undefined)
      // Pinned views always sort to the start of the tab strip (stable within groups).
      const flagged = activeSchema.views.map((v) =>
        v.id === viewId
          ? { ...v, pinned_to_start: pinned }
          : applyDefaults && defaultPinnedViewIds!.includes(v.id)
            ? { ...v, pinned_to_start: true }
            : v,
      )
      const nextSchema = {
        ...activeSchema,
        views: [
          ...flagged.filter((v) => v.pinned_to_start),
          ...flagged.filter((v) => !v.pinned_to_start),
        ],
      }
      patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(activeSpace.id, { schema: nextSchema })
        toast.success(
          pinned
            ? SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.VIEW_PINNED.userMessage
            : SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.VIEW_UNPINNED.userMessage,
        )
      } catch {
        await refresh()
        toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.PIN_FAILED.userMessage)
      }
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, refresh],
  )

  const handleViewPinToStart = useCallback(
    async (pinned: boolean) => {
      if (!customizePanelTargetView) return
      await handleTogglePinViewById(customizePanelTargetView.id, pinned)
    },
    [customizePanelTargetView, handleTogglePinViewById],
  )

  const handleDuplicateViewById = useCallback(
    async (viewId: string) => {
      if (!activeSchema || !activeSpace) return
      const sourceIdx = activeSchema.views.findIndex((v) => v.id === viewId)
      const source = activeSchema.views[sourceIdx]
      if (!source) return
      const newId = `${source.id}_${Date.now()}`
      const clone: ViewDef = {
        ...source,
        id: newId,
        name: `${source.name} (copy)`,
        pinned_to_start: false,
      }
      const nextViews = [...activeSchema.views]
      nextViews.splice(sourceIdx + 1, 0, clone)
      const nextSchema = { ...activeSchema, views: nextViews }
      patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(activeSpace.id, { schema: nextSchema })
        setActiveView(newId)
        toast.success(SPACES_CUSTOMIZE_VIEW_TOAST_SUCCESS.VIEW_DUPLICATED.userMessage)
      } catch {
        await refresh()
        toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.DUPLICATE_FAILED.userMessage)
      }
    },
    [activeSchema, activeSpace, patchActiveSpaceSchema, refresh, setActiveView],
  )

  const handleDeleteViewById = useCallback(
    async (viewId: string) => {
      if (!activeSchema || !activeSpace) return
      if (activeSchema.views.length <= 1) return
      const nextViews = activeSchema.views.filter((v) => v.id !== viewId)
      const nextSchema = { ...activeSchema, views: nextViews }
      patchActiveSpaceSchema(nextSchema)
      try {
        await updateSpace(activeSpace.id, { schema: nextSchema })
      } catch {
        await refresh()
        toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.VIEW_SAVE_FAILED.userMessage)
        return
      }
      if (viewId === activeViewId) {
        const nextId = nextViews[0]?.id
        if (nextId) setActiveView(nextId)
      }
    },
    [activeSchema, activeSpace, activeViewId, patchActiveSpaceSchema, refresh, setActiveView],
  )

  const handleDeleteActiveView = useCallback(async () => {
    const victim = customizeFlushCtxRef.current.activeView ?? customizePanelTargetView ?? activeView
    if (!victim || !activeSchema || !activeSpace) return
    if (activeSchema.views.length <= 1) return
    const deletedId = victim.id
    const wasViewportTab = deletedId === activeViewId

    closeCustomizePanel()

    const nextViews = activeSchema.views.filter((v) => v.id !== deletedId)
    const nextSchema = { ...activeSchema, views: nextViews }
    patchActiveSpaceSchema(nextSchema)
    try {
      await updateSpace(activeSpace.id, { schema: nextSchema })
    } catch {
      await refresh()
      toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.VIEW_SAVE_FAILED.userMessage)
      return
    }
    if (wasViewportTab) {
      const nextId = nextViews[0]?.id
      if (nextId) setActiveView(nextId)
    }
  }, [
    customizeFlushCtxRef,
    customizePanelTargetView,
    activeView,
    activeSchema,
    activeSpace,
    activeViewId,
    closeCustomizePanel,
    patchActiveSpaceSchema,
    refresh,
    setActiveView,
  ])

  return {
    handleSaveForEveryone,
    handleResetViewToDefault,
    handleSaveViewDraft,
    handleEnableAutosaveAndFlush,
    handleSaveAsNewView,
    handleRevertViewDraft,
    handleViewPinToStart,
    handleTogglePinViewById,
    handleDuplicateViewById,
    handleDeleteViewById,
    handleDeleteActiveView,
  }
}
