'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { MediaImageEditComposerView, useMediaImageEditController } from '@/components/media'
import { isShellWorkspaceRoute } from '@/components/shell/shell-route-policy'
import { ShellArtifactViewerPanel } from '@/components/shell/ShellArtifactViewerPanel'
import { useShellOpenIn } from '@/components/shell/ShellOpenInProvider'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { getAsset, type MediaAsset } from '@/lib/services/media-api'
import { ShellMediaHistoryRail } from './ShellMediaHistoryRail'
import {
  downloadMediaTarget,
  ShellMediaActionsMenu,
  ShellMediaAspectRatioAction,
} from './ShellMediaImageActions'

function targetAttachment(target: ShellArtifactViewerTarget): DocumentAttachment | null {
  if (!target.fileUrl) return null
  return {
    filename: target.fileName || target.title,
    type: target.type === 'video' ? 'video' : target.type === 'audio' ? 'audio' : 'image',
    fileUrl: target.fileUrl,
    mediaAssetId: target.mediaAssetId || undefined,
    mimeType: target.mimeType || undefined,
  }
}

export function ShellMediaArtifactViewer({ target }: { target: ShellArtifactViewerTarget }) {
  const pathname = usePathname() || '/home'
  const router = useRouter()
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const openChatDrawer = useShellStore((state) => state.openChatDrawer)
  const closeArtifactViewer = useShellStore((state) => state.closeArtifactViewer)
  const openArtifactViewer = useShellStore((state) => state.openArtifactViewer)
  const { targets: openTargets, setFocusMedia } = useShellOpenIn()
  const [resolvedAsset, setResolvedAsset] = useState<MediaAsset | null>(null)

  const activeTarget = useMemo<ShellArtifactViewerTarget>(() => {
    if (!resolvedAsset) return target
    return {
      ...target,
      id: resolvedAsset.id,
      mediaAssetId: resolvedAsset.id,
      title: resolvedAsset.name || target.title,
      fileName: resolvedAsset.original_filename || resolvedAsset.name || target.fileName,
      fileUrl: resolvedAsset.public_url,
      mimeType: resolvedAsset.mime_type,
      spaceId: resolvedAsset.space_id || target.spaceId,
      campaignId: resolvedAsset.campaign_id || target.campaignId,
      conversationId: resolvedAsset.conversation_id || target.conversationId,
    }
  }, [resolvedAsset, target])

  useEffect(() => {
    if (!target.mediaAssetId) {
      setResolvedAsset(null)
      return
    }
    setResolvedAsset(null)
    let cancelled = false
    void getAsset(target.mediaAssetId)
      .then((asset) => {
        if (!cancelled) setResolvedAsset(asset)
      })
      .catch(() => {
        if (!cancelled) setResolvedAsset(null)
      })
    return () => {
      cancelled = true
    }
  }, [target.mediaAssetId])

  const editor = useMediaImageEditController({
    assetId: activeTarget.type === 'image' ? activeTarget.mediaAssetId : null,
    assetUrl: activeTarget.type === 'image' ? activeTarget.fileUrl : null,
    spaceId: activeTarget.spaceId,
    campaignId: activeTarget.campaignId,
    conversationId: activeTarget.conversationId,
    onGenerated: ({ assetId, url }) =>
      openArtifactViewer({
        ...activeTarget,
        id: assetId,
        mediaAssetId: assetId,
        fileUrl: url,
        title: 'Edited image',
      }),
  })

  useEffect(() => {
    setFocusMedia(
      activeTarget.mediaAssetId && activeTarget.fileUrl
        ? {
            id: activeTarget.mediaAssetId,
            url: activeTarget.fileUrl,
            canvaSupported: activeTarget.type === 'image',
          }
        : null,
    )
    return () => setFocusMedia(null)
  }, [activeTarget.fileUrl, activeTarget.mediaAssetId, activeTarget.type, setFocusMedia])

  const openInChat = useCallback(() => {
    const attachment = targetAttachment(activeTarget)
    if (!attachment) return
    const conversationId = activeTarget.conversationId || undefined
    seedComposer({
      content: '',
      documents: [attachment],
      conversationId,
      seedMode: 'attach',
      workContext: {
        surface: activeTarget.spaceId ? 'spaces' : 'general',
        spaceId: activeTarget.spaceId || undefined,
        campaignId: activeTarget.campaignId || undefined,
      },
    })
    closeArtifactViewer()
    if (isShellWorkspaceRoute(pathname)) {
      openChatDrawer(conversationId ?? null)
      return
    }
    router.push(
      conversationId ? `/home?conv=${encodeURIComponent(conversationId)}` : '/home?chat=new',
    )
  }, [activeTarget, closeArtifactViewer, openChatDrawer, pathname, router, seedComposer])

  const canvaTarget = openTargets.find((entry) => entry.id === 'canva')
  const actions = (
    <>
      {activeTarget.type === 'image' ? <ShellMediaAspectRatioAction editor={editor} /> : null}
      <button
        type="button"
        disabled={!activeTarget.fileUrl}
        onClick={() => {
          void downloadMediaTarget(activeTarget).catch(() =>
            toast.error(MEDIA_TOAST_ERRORS.DOWNLOAD_FAILED.userMessage),
          )
        }}
        className="btn-icon-bare disabled:opacity-50"
        aria-label="Download image"
      >
        <Download className="icon-sm" />
      </button>
      <ShellMediaActionsMenu
        target={activeTarget}
        onOpenChat={openInChat}
        onOpenCanva={
          canvaTarget?.onSelect
            ? () => {
                void canvaTarget.onSelect?.()
              }
            : undefined
        }
      />
    </>
  )

  return (
    <ShellArtifactViewerPanel
      target={activeTarget}
      actions={actions}
      bodyClassName="overflow-hidden"
      showOpenTargets={false}
    >
      <div className="flex h-full min-h-0">
        {activeTarget.type === 'image' ? (
          <ShellMediaHistoryRail
            activeAssetId={activeTarget.mediaAssetId}
            conversationId={target.conversationId}
            resolvedAsset={resolvedAsset}
            spaceId={target.spaceId}
            onSelect={(asset) =>
              openArtifactViewer({
                ...activeTarget,
                id: asset.id,
                mediaAssetId: asset.id,
                title: asset.name || activeTarget.title,
                fileName: asset.original_filename || asset.name || activeTarget.fileName,
                fileUrl: asset.public_url,
                mimeType: asset.mime_type,
                conversationId: asset.conversation_id || activeTarget.conversationId,
              })
            }
          />
        ) : null}

        <div className="relative flex min-h-0 min-w-0 flex-1">
          <div className="p-spacing-6 pb-spacing-24 flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
            {activeTarget.type === 'video' && activeTarget.fileUrl ? (
              <video
                src={activeTarget.fileUrl}
                controls
                className="max-h-full max-w-full object-contain"
              />
            ) : activeTarget.type === 'audio' && activeTarget.fileUrl ? (
              <audio src={activeTarget.fileUrl} controls className="w-full" />
            ) : activeTarget.fileUrl ? (
              <img
                src={activeTarget.fileUrl}
                alt={activeTarget.title}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p className="body-3 text-muted-foreground">No preview available</p>
            )}
          </div>
          {activeTarget.type === 'image' && activeTarget.mediaAssetId && activeTarget.fileUrl ? (
            <MediaImageEditComposerView
              editor={editor}
              campaignId={activeTarget.campaignId}
              floating
            />
          ) : null}
        </div>
      </div>
    </ShellArtifactViewerPanel>
  )
}
