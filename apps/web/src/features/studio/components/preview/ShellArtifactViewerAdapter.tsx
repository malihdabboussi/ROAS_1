'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'
import { renderDeliverableEntityPreview } from '@/components/deliverables/deliverable-entity-preview-renderer'
import { DeliverablePreviewBody } from '@/components/deliverables/DeliverablePreviewBody'
import { FunnelFullPreview } from '@/components/deliverables/FunnelFullPreview'
import { PresentationFullPreview } from '@/components/deliverables/PresentationFullPreview'
import { useDeliverableEntityContent } from '@/components/deliverables/use-deliverable-entity-content'
import { ShellArtifactViewerPanel } from '@/components/shell/ShellArtifactViewerPanel'
import { ShellCodeArtifactViewer } from '@/components/shell/ShellCodeArtifactViewer'
import { ShellMissionArtifactViewerAdapter } from '@/components/shell/ShellMissionArtifactViewerAdapter'
import { ShellTaskArtifactViewerAdapter } from '@/components/shell/ShellTaskArtifactViewerAdapter'
import { useShellStore } from '@/components/shell/use-shell-store'
import { SpaceDocEditorPanelAdapter } from '@/components/spaces/SpaceDocEditorPanelAdapter'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { SHELL_ARTIFACT_OPEN_EVENT, type ShellArtifactViewerTarget } from '@/lib/artifacts'
import { isShellCodeArtifactTarget } from '@/lib/chat/chat-code-artifact'
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
    <ShellArtifactViewerPanel target={target} bodyClassName={paper ? undefined : 'overflow-hidden'}>
      <div
        className={cn(
          'min-h-full w-full',
          paper && 'p-spacing-6 mx-auto max-w-3xl',
          !paper && 'flex min-h-0 flex-1 flex-col overflow-hidden',
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
  const router = useRouter()
  const target = useShellStore((s) => s.artifactViewer.target)
  const openArtifactViewer = useShellStore((s) => s.openArtifactViewer)
  const closeArtifactViewer = useShellStore((s) => s.closeArtifactViewer)
  const previousPathRef = useRef(pathname)

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<ShellArtifactViewerTarget>).detail
      if (!detail?.id || !detail.title) return
      const conversationId =
        detail.conversationId ??
        useChatStore.getState().activeConversationId ??
        useShellStore.getState().chatDrawer.conversationId
      openArtifactViewer(detail, conversationId)
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
        const mediaType =
          detail.kind === 'video' || detail.kind === 'audio' || detail.kind === 'image'
            ? detail.kind
            : 'image'
        const fallbackTitle =
          mediaType === 'video'
            ? 'Generated video'
            : mediaType === 'audio'
              ? 'Generated audio'
              : 'Generated image'
        const conversationId =
          useChatStore.getState().activeConversationId ??
          useShellStore.getState().chatDrawer.conversationId
        openArtifactViewer(
          {
            id: detail.mediaAssetId,
            mediaAssetId: detail.mediaAssetId,
            title: detail.title?.trim() || fallbackTitle,
            type: mediaType,
            fileUrl: detail.fileUrl ?? undefined,
            mimeType: detail.mimeType ?? undefined,
            spaceId: detail.spaceId,
          },
          conversationId,
        )
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

  useEffect(() => {
    if (target?.type !== 'flow') return
    const entityId = target.entityId || target.id
    const internalUrl = target.internalUrl || `/flows?flow_id=${encodeURIComponent(entityId)}`
    closeArtifactViewer()
    router.push(internalUrl)
  }, [closeArtifactViewer, router, target])

  if (!target) return null
  if (isShellCodeArtifactTarget(target)) {
    return <ShellCodeArtifactViewer target={target} />
  }
  if (target.type === 'funnel' || target.type === 'website') {
    return (
      <ShellArtifactViewerPanel target={target} bodyClassName="overflow-hidden">
        <FunnelFullPreview funnelId={target.entityId || target.id} />
      </ShellArtifactViewerPanel>
    )
  }
  if (target.type === 'presentation') {
    return (
      <ShellArtifactViewerPanel target={target} bodyClassName="overflow-hidden">
        <PresentationFullPreview
          presentationId={target.entityId || target.id}
          name={target.title}
        />
      </ShellArtifactViewerPanel>
    )
  }
  if (target.type === 'mission') return <ShellMissionArtifactViewerAdapter target={target} />
  if (target.type === 'flow') return null
  if (target.type === 'image' || target.type === 'video' || target.type === 'audio') {
    return <ShellMediaArtifactViewer target={target} />
  }
  if (
    (target.type === 'doc' || target.type === 'visual_doc' || target.type === 'custom_object') &&
    target.entityTable === 'space_items'
  ) {
    return <ShellSpaceDocumentArtifactViewer target={target} />
  }
  if (target.type === 'task' && target.entityTable === 'space_items') {
    return <ShellTaskArtifactViewerAdapter target={target} />
  }
  return <ShellDocumentArtifactViewer target={target} />
}
