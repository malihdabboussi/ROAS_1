'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import {
  buildImageMarkupPrompt,
  closestImageAspectRatio,
  MediaImageEditComposerView,
  MediaImageMarkupCanvas,
  useMediaImageEditController,
  type ImageMarkupAnnotation,
} from '@/components/media'
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
  ShellMediaMarkupAction,
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

function mediaTypeFromAsset(
  assetType: string | null | undefined,
  fallback: ShellArtifactViewerTarget['type'],
): ShellArtifactViewerTarget['type'] {
  if (assetType === 'video' || assetType === 'audio' || assetType === 'image') return assetType
  return fallback
}

function viewerTargetFromAsset(
  base: ShellArtifactViewerTarget,
  asset: MediaAsset,
): ShellArtifactViewerTarget {
  return {
    ...base,
    id: asset.id,
    mediaAssetId: asset.id,
    title: asset.name || base.title,
    fileName: asset.original_filename || asset.name || base.fileName,
    fileUrl: asset.public_url,
    mimeType: asset.mime_type,
    type: mediaTypeFromAsset(asset.asset_type, base.type),
    spaceId: asset.space_id || base.spaceId,
    campaignId: asset.campaign_id || base.campaignId,
    conversationId: asset.conversation_id || base.conversationId,
  }
}

export function ShellMediaArtifactViewer({ target }: { target: ShellArtifactViewerTarget }) {
  const seedComposer = useGlobalChatStore((state) => state.seedComposer)
  const openArtifactViewer = useShellStore((state) => state.openArtifactViewer)
  const { targets: openTargets, setFocusMedia } = useShellOpenIn()
  const [resolvedAsset, setResolvedAsset] = useState<MediaAsset | null>(null)
  const [markupActive, setMarkupActive] = useState(false)

  const activeTarget = useMemo<ShellArtifactViewerTarget>(() => {
    if (!resolvedAsset) return target
    return viewerTargetFromAsset(target, resolvedAsset)
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
    onGenerated: ({ assetId, url }) => {
      setMarkupActive(false)
      openArtifactViewer({
        ...activeTarget,
        id: assetId,
        mediaAssetId: assetId,
        fileUrl: url,
        title: 'Edited image',
      })
    },
  })

  const applyMarkup = useCallback(
    (annotations: ImageMarkupAnnotation[]) => {
      const prompt = buildImageMarkupPrompt(annotations, editor.prompt)
      if (!prompt) return
      void editor.generate({ prompt })
    },
    [editor.generate, editor.prompt],
  )

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

  const addToChat = useCallback(() => {
    const attachment = targetAttachment(activeTarget)
    if (!attachment) return
    seedComposer({
      content: '',
      documents: [attachment],
      seedMode: 'attach',
      workContext: {
        surface: activeTarget.spaceId ? 'spaces' : 'general',
        spaceId: activeTarget.spaceId || undefined,
        campaignId: activeTarget.campaignId || undefined,
      },
    })
  }, [activeTarget, seedComposer])

  const canvaTarget = openTargets.find((entry) => entry.id === 'canva')
  const actions = (
    <>
      {activeTarget.type === 'image' ? <ShellMediaAspectRatioAction editor={editor} /> : null}
      {activeTarget.type === 'image' ? (
        <ShellMediaMarkupAction
          active={markupActive}
          disabled={!activeTarget.fileUrl || editor.isGenerating}
          onToggle={() => setMarkupActive((active) => !active)}
        />
      ) : null}
      <button
        type="button"
        disabled={!activeTarget.fileUrl}
        onClick={addToChat}
        className="button-compact button-glass-neutral gap-spacing-1 disabled:opacity-50"
        aria-label="Add image to chat"
      >
        <MessageSquare className="icon-sm" />
        Add to chat
      </button>
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
        {activeTarget.type === 'image' || activeTarget.type === 'video' ? (
          <ShellMediaHistoryRail
            activeAssetId={activeTarget.mediaAssetId}
            conversationId={activeTarget.conversationId}
            resolvedAsset={resolvedAsset}
            spaceId={activeTarget.spaceId}
            onSelect={(asset) => openArtifactViewer(viewerTargetFromAsset(activeTarget, asset))}
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
              <MediaImageMarkupCanvas
                src={activeTarget.fileUrl}
                alt={activeTarget.title}
                active={markupActive}
                applying={editor.isGenerating}
                onApply={applyMarkup}
                onImageDimensions={(width, height) => {
                  const sourceRatio = closestImageAspectRatio(width, height)
                  if (
                    sourceRatio &&
                    editor.supportedAspectRatios.includes(
                      sourceRatio as (typeof editor.supportedAspectRatios)[number],
                    )
                  ) {
                    editor.setAspectRatio(
                      sourceRatio as (typeof editor.supportedAspectRatios)[number],
                    )
                  }
                }}
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
