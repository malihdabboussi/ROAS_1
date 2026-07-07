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

  const handleViewPinToStart = useCallback(
    async (pinned: boolean) => {
      if (!customizePanelTargetView || !activeSchema || !activeSpace) return
      const orgView = activeSchema.views.find((v) => v.id === customizePanelTargetView.id)
      if (!orgView) return
      const nextSchema = pinned
        ? {
            ...activeSchema,
            views: [
              { ...orgView, pinned_to_start: true },
              ...activeSchema.views
                .filter((v) => v.id !== orgView.id)
                .map((v) => ({ ...v, pinned_to_start: false })),
            ],
          }
        : {
            ...activeSchema,
            views: activeSchema.views.map((v) =>
              v.id === orgView.id ? { ...v, pinned_to_start: false } : v,
            ),
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
    [customizePanelTargetView, activeSchema, activeSpace, patchActiveSpaceSchema, refresh],
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
    handleDeleteActiveView,
  }
}
