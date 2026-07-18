'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { MissionsViewHandle } from '../components/MissionsView'
import { buildMissionsViewForSchema } from '../lib/build-missions-view-for-schema'
import { updateSpace } from '../services/spaces.service'
import { useSpacesStore } from '../store/use-spaces-store'
import type { Space } from '../types'
import type { SpaceSchema, ViewDef } from '../types/space-schema'

type OpenMissionsViewDetail = {
  spaceId?: unknown
  openCapture?: unknown
  openPlaybook?: unknown
}

type UseSpaceMissionsViewFocusArgs = {
  activeSpace: Space | null
  activeSchema: SpaceSchema | null
  activeView: ViewDef | null
  activeSpaceId: string | null
  patchSchema: (s: SpaceSchema | Partial<SpaceSchema>) => void
  setActiveView: (viewId: string) => void
}

export function useSpaceMissionsViewFocus({
  activeSpace,
  activeSchema,
  activeView,
  activeSpaceId,
  patchSchema,
  setActiveView,
}: UseSpaceMissionsViewFocusArgs) {
  const missionsViewRef = useRef<MissionsViewHandle | null>(null)
  const pendingMissionCaptureOpenRef = useRef(false)
  const pendingPlaybookOpenRef = useRef(false)

  const focusMissionsView = useCallback(
    async (options?: { openCapture?: boolean; openPlaybook?: boolean }) => {
      if (!activeSpace || !activeSchema) return
      if (options?.openCapture) pendingMissionCaptureOpenRef.current = true
      if (options?.openPlaybook) pendingPlaybookOpenRef.current = true

      const existingMissionsView = activeSchema.views.find((view) => view.type === 'missions')
      if (existingMissionsView) {
        setActiveView(existingMissionsView.id)
        return
      }

      const newView = buildMissionsViewForSchema(activeSchema.views)
      const nextSchema = { ...activeSchema, views: [...activeSchema.views, newView] }
      patchSchema(nextSchema)
      await updateSpace(activeSpace.id, { schema: nextSchema })
      setActiveView(newView.id)
    },
    [activeSchema, activeSpace, patchSchema, setActiveView],
  )

  useEffect(() => {
    const handleOpenMissionsView = (event: Event) => {
      const detail = (event as CustomEvent<OpenMissionsViewDetail>).detail
      if (typeof detail?.spaceId === 'string' && detail.spaceId !== activeSpaceId) return
      void focusMissionsView({
        openCapture: detail?.openCapture === true,
        openPlaybook: detail?.openPlaybook === true,
      })
    }
    window.addEventListener('space:open-missions-view', handleOpenMissionsView as EventListener)
    return () =>
      window.removeEventListener(
        'space:open-missions-view',
        handleOpenMissionsView as EventListener,
      )
  }, [activeSpaceId, focusMissionsView])

  useEffect(() => {
    if (!pendingMissionCaptureOpenRef.current || activeView?.type !== 'missions') return
    let attempts = 0
    const timer = window.setInterval(() => {
      const handle = missionsViewRef.current
      attempts += 1
      if (!handle && attempts < 20) return
      window.clearInterval(timer)
      if (!handle) return
      pendingMissionCaptureOpenRef.current = false
      handle.openNewMissionCapture()
    }, 50)
    return () => window.clearInterval(timer)
  }, [activeView?.id, activeView?.type])

  useEffect(() => {
    if (!pendingPlaybookOpenRef.current || activeView?.type !== 'missions') return
    let attempts = 0
    const timer = window.setInterval(() => {
      const handle = missionsViewRef.current
      attempts += 1
      if (!handle && attempts < 20) return
      window.clearInterval(timer)
      if (!handle) return
      pendingPlaybookOpenRef.current = false
      handle.openStartPlaybook()
    }, 50)
    return () => window.clearInterval(timer)
  }, [activeView?.id, activeView?.type])

  return { missionsViewRef, focusMissionsView }
}

export function useSpaceFocusViewTypeEvent(
  activeSpaceId: string | null,
  setActiveView: (viewId: string) => void,
) {
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const handleFocusViewType = (event: Event) => {
      const viewType = (event as CustomEvent).detail?.view_type
      if (typeof viewType !== 'string') return
      const focusMatchingView = () => {
        const currentSchema = useSpacesStore
          .getState()
          .spaces.find((space) => space.id === activeSpaceId)?.schema
        const target = currentSchema?.views?.find((view) => view.type === viewType)
        if (target) {
          setActiveView(target.id)
          return true
        }
        return false
      }
      retryTimer = setTimeout(() => {
        if (focusMatchingView()) return
        void useSpacesStore
          .getState()
          .refresh()
          .then(() => {
            retryTimer = setTimeout(focusMatchingView, 200)
          })
      }, 200)
    }
    window.addEventListener('space:focus-view-type', handleFocusViewType as EventListener)
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('space:focus-view-type', handleFocusViewType as EventListener)
    }
  }, [activeSpaceId, setActiveView])
}
