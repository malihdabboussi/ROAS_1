'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewBody } from '@/components/deliverables/DeliverablePreviewBody'
import { useDeliverableEntityContent } from '@/components/deliverables/use-deliverable-entity-content'
import { ShellArtifactViewerPanel } from '@/components/shell/ShellArtifactViewerPanel'
import { useShellStore } from '@/components/shell/use-shell-store'
import { SpaceDocEditorPanelAdapter } from '@/components/spaces/SpaceDocEditorPanelAdapter'
import { SHELL_ARTIFACT_OPEN_EVENT, type ShellArtifactViewerTarget } from '@/lib/artifacts'
import {
  VIBEY_OPEN_MEDIA_EVENT,
  type VibeyOpenMediaDetail,
} from '@/lib/media/open-media-asset-in-app'
import type { MissionDeliverable } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { ShellMediaArtifactViewer } from './ShellMediaArtifactViewer'

function targetToDeliverable(target: ShellArtifactViewerTarget): MissionDeliverable {
  return {
    id: target.id,
    mission_id: '',
    campaign_id: target.campaignId || null,
    user_id: '',
    agent_key: 'unknown',
    type: target.type,
    title: target.title,
    content: target.content || null,
    file_url: target.fileUrl || null,
    file_name: target.fileName || target.title,
    file_size: null,
    mime_type: target.mimeType || null,
    metadata: {
      ...(target.spaceId ? { spaceId: target.spaceId } : {}),
      ...(target.entityTable === 'space_items' ? { spaceItemId: target.entityId } : {}),
      ...(target.internalUrl ? { internalUrl: target.internalUrl } : {}),
    },
    entity_id: target.entityId || null,
    entity_table: target.entityTable || null,
    source: 'chat',
    created_at: new Date().toISOString(),
  }
}

function ShellDocumentArtifactViewer({ target }: { target: ShellArtifactViewerTarget }) {
  const deliverable = useMemo(() => targetToDeliverable(target), [target])
  const contentRef = useRef<HTMLDivElement | null>(null)
  const { effectiveContent, entityContentLoading, isEntityType, isTextContent } =
    useDeliverableEntityContent(deliverable)
  const paper = target.type === 'doc' || target.type === 'text'

  return (
    <ShellArtifactViewerPanel target={target}>
      <div
        className={cn(
          'mx-auto min-h-full w-full',
          paper &&
            'surface-card border-border rounded-spacing-3 my-spacing-4 p-spacing-6 shadow-1 max-w-md border',
          !paper && 'p-spacing-4',
        )}
      >
        <DeliverablePreviewBody
          contentRef={contentRef}
          deliverable={deliverable}
          entityContentLoading={entityContentLoading}
          isEntityType={isEntityType}
          isTextContent={isTextContent}
          effectiveContent={effectiveContent}
          viewMode="wide"
          fallbackSpaceId={target.spaceId}
          spaceDocActionTarget={null}
          renderEntityPreview={renderDeliverableEntityPreview}
        />
      </div>
    </ShellArtifactViewerPanel>
  )
}

function ShellSpaceDocumentArtifactViewer({ target }: { target: ShellArtifactViewerTarget }) {
  const close = useShellStore((state) => state.closeArtifactViewer)

  return (
    <ShellArtifactViewerPanel target={target} bodyClassName="overflow-hidden">
      <SpaceDocEditorPanelAdapter target={target} onClose={close} />
    </ShellArtifactViewerPanel>
  )
}

export function ShellArtifactViewerAdapter() {
  const pathname = usePathname() || '/home'
  const target = useShellStore((s) => s.artifactViewer.target)
  const openArtifactViewer = useShellStore((s) => s.openArtifactViewer)
  const closeArtifactViewer = useShellStore((s) => s.closeArtifactViewer)
  const previousPathRef = useRef(pathname)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<ShellArtifactViewerTarget>).detail
      if (detail?.id && detail.title) openArtifactViewer(detail)
    }
    window.addEventListener(SHELL_ARTIFACT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(SHELL_ARTIFACT_OPEN_EVENT, onOpen)
  }, [openArtifactViewer])

  useEffect(() => {
    const onOpenMedia = (event: Event) => {
      const mediaEvent = event as CustomEvent<VibeyOpenMediaDetail>
      const detail = mediaEvent.detail
      if (!detail?.mediaAssetId) return
      queueMicrotask(() => {
        if (mediaEvent.defaultPrevented) return
        openArtifactViewer({
          id: detail.mediaAssetId,
          mediaAssetId: detail.mediaAssetId,
          title: detail.title?.trim() || 'Generated image',
          type: 'image',
          spaceId: detail.spaceId,
        })
      })
    }
    window.addEventListener(VIBEY_OPEN_MEDIA_EVENT, onOpenMedia)
    return () => window.removeEventListener(VIBEY_OPEN_MEDIA_EVENT, onOpenMedia)
  }, [openArtifactViewer])

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname
      closeArtifactViewer()
    }
  }, [closeArtifactViewer, pathname])

  if (!target) return null
  if (target.type === 'image' || target.type === 'video' || target.type === 'audio') {
    return <ShellMediaArtifactViewer target={target} />
  }
  if (target.type === 'doc' && target.entityTable === 'space_items') {
    return <ShellSpaceDocumentArtifactViewer target={target} />
  }
  return <ShellDocumentArtifactViewer target={target} />
}
