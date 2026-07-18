'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, type MutableRefObject } from 'react'
import { artifactTypeToSpaceViewType } from '../lib/artifact-type-to-space-view-type'
import { useSpacesStore } from '../store/use-spaces-store'
import type { SpaceItem } from '../types'

export type InlineArtifactOpenDetail = {
  artifactType?: string
  artifactId?: string
  documentId?: string
  name?: string
  spaceId?: string
  spaceItemId?: string
}

type UseSpaceOpenInlineArtifactEventArgs = {
  activeSpaceId: string | null
  items: SpaceItem[]
  urlSpaceItemDeepLinkRef: MutableRefObject<string | null>
  focusTaskCapableViewIfNeeded: (spaceId: string) => void
  openSpaceItemModal: (item: SpaceItem) => void
  setActiveSpace: (spaceId: string) => void
  setActiveView: (viewId: string) => void
  setArtifactQuery: (id: string | null) => void
  setArtifactPreviewSelection: (selection: null) => void
  setDocEditorItem: (item: SpaceItem | null) => void
  setSelectedItem: (item: SpaceItem | null) => void
  refresh: () => Promise<void>
}

export function useSpaceOpenInlineArtifactEvent({
  activeSpaceId,
  items,
  urlSpaceItemDeepLinkRef,
  focusTaskCapableViewIfNeeded,
  openSpaceItemModal,
  setActiveSpace,
  setActiveView,
  setArtifactQuery,
  setArtifactPreviewSelection,
  setDocEditorItem,
  setSelectedItem,
  refresh,
}: UseSpaceOpenInlineArtifactEventArgs) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const handleOpenInlineArtifact = (event: Event) => {
      const detail = (event as CustomEvent<InlineArtifactOpenDetail>).detail
      if (!detail?.artifactType || !detail?.artifactId) return

      const targetSpaceId =
        typeof detail.spaceId === 'string' && detail.spaceId.trim()
          ? detail.spaceId.trim()
          : activeSpaceId

      if (detail.artifactType === 'task') {
        if (!targetSpaceId) return
        if (targetSpaceId !== activeSpaceId) {
          setActiveSpace(targetSpaceId)
        }
        urlSpaceItemDeepLinkRef.current = null
        const item =
          targetSpaceId === activeSpaceId ? items.find((row) => row.id === detail.artifactId) : null
        if (item) {
          const vt = (item.custom_data as Record<string, unknown> | undefined)?._view_type
          if (vt === 'doc') {
            setSelectedItem(null)
            setDocEditorItem(item)
          } else {
            setDocEditorItem(null)
            focusTaskCapableViewIfNeeded(targetSpaceId)
            openSpaceItemModal(item)
          }
        } else {
          focusTaskCapableViewIfNeeded(targetSpaceId)
        }
        const p = new URLSearchParams(searchParams.toString())
        p.set('space', targetSpaceId)
        p.set('item', detail.artifactId)
        const qs = p.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        return
      }

      const viewType = artifactTypeToSpaceViewType(detail.artifactType)
      if (!viewType) return
      const isSpaceDoc =
        detail.artifactType === 'space_doc' ||
        detail.artifactType === 'visual-doc' ||
        (detail.artifactType === 'document' && typeof detail.spaceItemId === 'string')
      const targetItemId =
        typeof detail.spaceItemId === 'string' && detail.spaceItemId.trim()
          ? detail.spaceItemId.trim()
          : isSpaceDoc
            ? detail.artifactId
            : null

      if (targetSpaceId && targetSpaceId !== activeSpaceId) {
        setActiveSpace(targetSpaceId)
      }

      if (isSpaceDoc && targetSpaceId && targetItemId) {
        setArtifactPreviewSelection(null)
        setArtifactQuery(null)
        const item =
          targetSpaceId === activeSpaceId ? items.find((i) => i.id === targetItemId) : null
        if (
          item &&
          (item.custom_data as Record<string, unknown> | undefined)?._view_type === 'doc'
        ) {
          setSelectedItem(null)
          setDocEditorItem(item)
        }
        const p = new URLSearchParams(searchParams.toString())
        p.set('space', targetSpaceId)
        p.set('item', targetItemId)
        const qs = p.toString()
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }

      const focusMatchingView = () => {
        const currentSchema = useSpacesStore
          .getState()
          .spaces.find((space) => space.id === targetSpaceId)?.schema
        const target = currentSchema?.views?.find((view) => view.type === viewType)
        if (target) {
          setActiveView(target.id)
          return true
        }
        return false
      }

      if (!isSpaceDoc) {
        setArtifactPreviewSelection(null)
        setArtifactQuery(detail.artifactId)
      }
      window.dispatchEvent(
        new CustomEvent('space:artifact-focus', {
          detail: {
            type: detail.artifactType,
            id: detail.artifactId,
            name: detail.name ?? 'Artifact',
          },
        }),
      )

      const _focusedNow = focusMatchingView()
      if (_focusedNow) return
      void refresh().then(() => {
        retryTimer = setTimeout(() => {
          focusMatchingView()
        }, 200)
      })
    }

    window.addEventListener('vibey-open-artifact', handleOpenInlineArtifact as EventListener)
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('vibey-open-artifact', handleOpenInlineArtifact as EventListener)
    }
  }, [
    activeSpaceId,
    focusTaskCapableViewIfNeeded,
    items,
    openSpaceItemModal,
    pathname,
    refresh,
    router,
    searchParams,
    setActiveSpace,
    setActiveView,
    setArtifactQuery,
    setDocEditorItem,
    setSelectedItem,
    setArtifactPreviewSelection,
    urlSpaceItemDeepLinkRef,
  ])
}
