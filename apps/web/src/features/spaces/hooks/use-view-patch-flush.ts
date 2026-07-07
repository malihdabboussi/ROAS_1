import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS } from '../config/spaces-customize-view.config'
import { updateSpace } from '../services/spaces.service'
import type { Space } from '../types'
import type { SpaceSchema, ViewDef } from '../types/space-schema'

export function useViewPatchFlush(opts: {
  customizePanelTargetView: ViewDef | null
  activeView: ViewDef | null
  activeSchema: SpaceSchema | undefined
  activeSpace: Space | null
  isTeamSpace: boolean
  patchViewOverride: (viewId: string, patch: Partial<ViewDef>) => Promise<void>
  patchActiveSpaceSchema: (patch: Partial<SpaceSchema> | SpaceSchema) => void
  refresh: () => Promise<void>
  applySessionDraft: (viewId: string, patch: Partial<ViewDef>) => void
  clearSessionDraft: (viewId: string) => void
  sessionViewDrafts: Record<string, Partial<ViewDef>>
}) {
  const {
    customizePanelTargetView,
    activeView,
    activeSchema,
    activeSpace,
    isTeamSpace,
    patchViewOverride,
    patchActiveSpaceSchema,
    refresh,
    applySessionDraft,
    clearSessionDraft,
    sessionViewDrafts,
  } = opts

  const customizeFlushCtxRef = useRef({
    activeSchema,
    activeSpace,
    activeView: (customizePanelTargetView ?? activeView) as ViewDef | null,
    isTeamSpace,
  })

  useEffect(() => {
    customizeFlushCtxRef.current = {
      activeSchema,
      activeSpace,
      activeView: customizePanelTargetView ?? activeView,
      isTeamSpace,
    }
  }, [activeSchema, activeSpace, customizePanelTargetView, activeView, isTeamSpace])

  const viewPatchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingViewPatchRef = useRef<Partial<ViewDef> | null>(null)
  const viewPatchFlushPromiseRef = useRef<Promise<void> | null>(null)
  const viewPatchFlushResolveRef = useRef<(() => void) | null>(null)

  const patchTargetRef = useRef<ViewDef | null>(customizePanelTargetView)
  patchTargetRef.current = customizePanelTargetView

  const activeSchemaRef = useRef(activeSchema)
  activeSchemaRef.current = activeSchema
  const activeSpaceRef = useRef(activeSpace)
  activeSpaceRef.current = activeSpace
  const sessionDraftsRef = useRef(sessionViewDrafts)
  sessionDraftsRef.current = sessionViewDrafts

  const flushPendingViewPatch = useCallback(async () => {
    if (viewPatchDebounceTimerRef.current) {
      clearTimeout(viewPatchDebounceTimerRef.current)
      viewPatchDebounceTimerRef.current = null
    }
    const patch = pendingViewPatchRef.current
    pendingViewPatchRef.current = null

    const resolveFlushWaiters = () => {
      viewPatchFlushResolveRef.current?.()
      viewPatchFlushPromiseRef.current = null
      viewPatchFlushResolveRef.current = null
    }

    try {
      if (!patch || Object.keys(patch).length === 0) return

      const {
        activeSchema: schema,
        activeSpace: space,
        activeView: view,
        isTeamSpace: team,
      } = customizeFlushCtxRef.current
      if (!schema || !space || !view) return

      try {
        if (team) {
          await patchViewOverride(view.id, patch)
        } else {
          const next = { ...view, ...patch }
          const nextViews = schema.views.map((v) => (v.id === next.id ? next : v))
          const nextSchema = { ...schema, views: nextViews }
          patchActiveSpaceSchema(nextSchema)
          await updateSpace(space.id, { schema: nextSchema })
        }
      } catch {
        toast.error(SPACES_CUSTOMIZE_VIEW_TOAST_ERRORS.VIEW_SAVE_FAILED.userMessage)
        await refresh()
      }
    } finally {
      resolveFlushWaiters()
    }
  }, [patchViewOverride, patchActiveSpaceSchema, refresh])

  useEffect(
    () => () => {
      void flushPendingViewPatch()
    },
    [flushPendingViewPatch],
  )

  const handleViewPatch = useCallback(
    async (patch: Partial<ViewDef>): Promise<void> => {
      const patchTargetView = patchTargetRef.current
      const schema = activeSchemaRef.current
      const space = activeSpaceRef.current
      if (!patchTargetView || !schema || !space) return
      const isAutosaveToggle = 'autosave_for_me' in patch

      if (patchTargetView.autosave_for_me === false && !isAutosaveToggle) {
        applySessionDraft(patchTargetView.id, patch)
        return
      }

      if (isAutosaveToggle && patch.autosave_for_me === true) {
        const draft = sessionDraftsRef.current[patchTargetView.id]
        if (draft && Object.keys(draft).length > 0) {
          const combined = { ...draft, ...patch }
          clearSessionDraft(patchTargetView.id)
          pendingViewPatchRef.current = { ...(pendingViewPatchRef.current ?? {}), ...combined }
        } else {
          pendingViewPatchRef.current = { ...(pendingViewPatchRef.current ?? {}), ...patch }
        }
      } else {
        pendingViewPatchRef.current = { ...(pendingViewPatchRef.current ?? {}), ...patch }
      }

      const pending = pendingViewPatchRef.current ?? {}
      const touchesTabIdentity = 'name' in pending || 'icon' in pending || 'icon_color' in pending

      if (!viewPatchFlushPromiseRef.current) {
        viewPatchFlushPromiseRef.current = new Promise<void>((resolve) => {
          viewPatchFlushResolveRef.current = resolve
        })
      }
      const flushWait = viewPatchFlushPromiseRef.current

      if (viewPatchDebounceTimerRef.current) clearTimeout(viewPatchDebounceTimerRef.current)
      viewPatchDebounceTimerRef.current = null

      if (touchesTabIdentity) {
        void flushPendingViewPatch()
      } else {
        viewPatchDebounceTimerRef.current = setTimeout(() => {
          void flushPendingViewPatch()
        }, 600)
      }
      return flushWait
    },
    [applySessionDraft, clearSessionDraft, flushPendingViewPatch],
  )

  return {
    customizeFlushCtxRef,
    flushPendingViewPatch,
    handleViewPatch,
    pendingViewPatchRef,
    clearSessionDraft,
  }
}
