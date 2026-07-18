'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import {
  VIBEY_OPEN_MEDIA_EVENT,
  type VibeyOpenMediaDetail,
} from '@/lib/media/open-media-asset-in-app'
import { useSpacesStore } from '../store/use-spaces-store'

type UseSpaceOpenMediaEventArgs = {
  activeSpaceId: string | null
  setActiveSpace: (spaceId: string) => void
  setActiveView: (viewId: string) => void
  setMediaDeepDetail: (detail: { id: string; title: string } | null) => void
  setMediaDetailQuery: (id: string | null) => void
  refresh: () => Promise<void>
}

export function useSpaceOpenMediaEvent({
  activeSpaceId,
  setActiveSpace,
  setActiveView,
  setMediaDeepDetail,
  setMediaDetailQuery,
  refresh,
}: UseSpaceOpenMediaEventArgs) {
  const pendingMediaOpenRef = useRef<{ id: string; title: string } | null>(null)

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const handleOpenMedia = (event: Event) => {
      const detail = (event as CustomEvent<VibeyOpenMediaDetail>).detail
      const mediaAssetId = detail?.mediaAssetId?.trim()
      if (!mediaAssetId) return

      const targetSpaceId =
        typeof detail.spaceId === 'string' && detail.spaceId.trim()
          ? detail.spaceId.trim()
          : activeSpaceId
      if (targetSpaceId && targetSpaceId !== activeSpaceId) {
        setActiveSpace(targetSpaceId)
      }

      const title = detail.title?.trim() || 'Generated image'
      const spacesState = useSpacesStore.getState()
      const currentSchema = spacesState.spaces.find(
        (space) => space.id === (targetSpaceId || activeSpaceId),
      )?.schema
      const mediaView = currentSchema?.views?.find((view) => view.type === 'media')
      const alreadyOnMedia = Boolean(mediaView) && spacesState.activeViewId === mediaView?.id

      setMediaDeepDetail({ id: mediaAssetId, title })

      if (alreadyOnMedia) {
        pendingMediaOpenRef.current = null
        setMediaDetailQuery(mediaAssetId)
        return
      }

      pendingMediaOpenRef.current = { id: mediaAssetId, title }

      if (mediaView) {
        setActiveView(mediaView.id)
        return
      }
      void refresh().then(() => {
        retryTimer = setTimeout(() => {
          const schema = useSpacesStore
            .getState()
            .spaces.find((space) => space.id === (targetSpaceId || activeSpaceId))?.schema
          const target = schema?.views?.find((view) => view.type === 'media')
          if (target) setActiveView(target.id)
        }, 200)
      })
    }

    window.addEventListener(VIBEY_OPEN_MEDIA_EVENT, handleOpenMedia as EventListener)
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener(VIBEY_OPEN_MEDIA_EVENT, handleOpenMedia as EventListener)
    }
  }, [
    activeSpaceId,
    refresh,
    setActiveSpace,
    setActiveView,
    setMediaDeepDetail,
    setMediaDetailQuery,
  ])

  return { pendingMediaOpenRef }
}

export function useSpacePendingMediaQueryApply(
  isMediaView: boolean,
  pendingMediaOpenRef: MutableRefObject<{ id: string; title: string } | null>,
  setMediaDeepDetail: (detail: { id: string; title: string } | null) => void,
  setMediaDetailQuery: (id: string | null) => void,
) {
  useEffect(() => {
    if (!isMediaView) return
    const pending = pendingMediaOpenRef.current
    if (!pending) return
    pendingMediaOpenRef.current = null
    setMediaDeepDetail(pending)
    setMediaDetailQuery(pending.id)
  }, [isMediaView, pendingMediaOpenRef, setMediaDeepDetail, setMediaDetailQuery])
}

export function useSpaceMediaDeepDetailClear(
  mediaDetailId: string | null,
  pendingMediaOpenRef: MutableRefObject<{ id: string; title: string } | null>,
  setMediaDeepDetail: (detail: { id: string; title: string } | null) => void,
) {
  useEffect(() => {
    if (mediaDetailId) return
    if (pendingMediaOpenRef.current) return
    setMediaDeepDetail(null)
  }, [mediaDetailId, pendingMediaOpenRef, setMediaDeepDetail])
}
