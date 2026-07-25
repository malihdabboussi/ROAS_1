'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, MessageSquare } from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { MediaImageEditComposer } from '@/components/media'
import { isShellWorkspaceRoute } from '@/components/shell/shell-route-policy'
import { ShellArtifactViewerPanel } from '@/components/shell/ShellArtifactViewerPanel'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { getAsset, listAssets, type MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'

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
  const seedComposer = useGlobalChatStore((s) => s.seedComposer)
  const openFreshChatDrawer = useShellStore((s) => s.openFreshChatDrawer)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const openArtifactViewer = useShellStore((s) => s.openArtifactViewer)
  const [history, setHistory] = useState<MediaAsset[]>([])
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

  const openChat = useCallback(() => {
    if (isShellWorkspaceRoute(pathname)) {
      openFreshChatDrawer()
      return
    }
    requestNewChat()
    router.push('/home?chat=new')
  }, [openFreshChatDrawer, pathname, requestNewChat, router])

  const seedFreshChat = useCallback(
    (content: string, seedMode?: 'attach') => {
      const attachment = targetAttachment(activeTarget)
      if (!attachment) return
      openChat()
      seedComposer({
        content,
        documents: [attachment],
        seedMode,
        railIntent: 'new',
        workContext: {
          surface: activeTarget.spaceId ? 'spaces' : 'general',
          spaceId: activeTarget.spaceId || undefined,
          campaignId: activeTarget.campaignId || undefined,
        },
      })
    },
    [activeTarget, openChat, seedComposer],
  )

  useEffect(() => {
    if (!activeTarget.spaceId || activeTarget.type !== 'image') {
      setHistory([])
      return
    }
    let cancelled = false
    void listAssets({ space_id: activeTarget.spaceId, asset_type: 'image', limit: 40 })
      .then((result) => {
        if (cancelled) return
        const generated = result.assets.filter((asset) => {
          const category = (asset.category ?? '').toLowerCase()
          const source = (asset.source ?? '').toLowerCase()
          return (
            source === 'generated' ||
            category.includes('ai-generated') ||
            category === 'generated' ||
            asset.tags.some((tag) => tag.includes('ai-generated') || tag.includes('ai-edited'))
          )
        })
        setHistory(generated.length > 0 ? generated : result.assets)
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
    return () => {
      cancelled = true
    }
  }, [activeTarget.mediaAssetId, activeTarget.spaceId, activeTarget.type])

  const historyItems = useMemo(() => {
    const seen = new Set<string>()
    return history.filter((asset) => {
      if (seen.has(asset.id) || !asset.public_url) return false
      seen.add(asset.id)
      return true
    })
  }, [history])

  const editInChat = useCallback(() => {
    seedFreshChat('', 'attach')
  }, [seedFreshChat])

  const actions = (
    <>
      <button
        type="button"
        onClick={editInChat}
        className="chip-glass-green body-4 gap-spacing-1 px-spacing-2 flex h-7 items-center font-semibold"
      >
        <MessageSquare className="h-3 w-3" />
        Edit in chat
      </button>
      {activeTarget.fileUrl ? (
        <a
          href={activeTarget.fileUrl}
          download={activeTarget.fileName || activeTarget.title}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download artifact"
          className="btn-icon-glass text-muted-foreground hover:text-foreground h-7 w-7"
        >
          <Download className="icon-sm" />
        </a>
      ) : null}
    </>
  )

  return (
    <ShellArtifactViewerPanel target={activeTarget} actions={actions}>
      <div className="flex min-h-full flex-col">
        <div className="p-spacing-4 gap-spacing-4 flex min-h-0 flex-1 flex-col">
          <div className="border-border surface-card rounded-spacing-3 shadow-1 flex min-h-72 items-center justify-center overflow-hidden border">
            {activeTarget.type === 'video' && activeTarget.fileUrl ? (
              <video
                src={activeTarget.fileUrl}
                controls
                className="max-h-full w-full object-contain"
              />
            ) : activeTarget.type === 'audio' && activeTarget.fileUrl ? (
              <audio src={activeTarget.fileUrl} controls className="mx-spacing-4 w-full" />
            ) : activeTarget.fileUrl ? (
              <img
                src={activeTarget.fileUrl}
                alt={activeTarget.title}
                className="max-h-full w-full object-contain"
              />
            ) : (
              <p className="body-3 text-muted-foreground">No preview available</p>
            )}
          </div>

          {activeTarget.type === 'image' && historyItems.length > 0 ? (
            <div>
              <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wide">
                History
              </p>
              <div className="gap-spacing-2 scrollbar-hide flex overflow-x-auto">
                {historyItems.map((asset) => {
                  const active = asset.id === activeTarget.mediaAssetId
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() =>
                        openArtifactViewer({
                          ...activeTarget,
                          id: asset.id,
                          mediaAssetId: asset.id,
                          title: asset.name || activeTarget.title,
                          fileName: asset.original_filename || asset.name || activeTarget.fileName,
                          fileUrl: asset.public_url,
                          mimeType: asset.mime_type,
                        })
                      }
                      className={cn(
                        'border-border rounded-spacing-2 h-14 w-14 shrink-0 overflow-hidden border',
                        active && 'border-primary ring-primary/30 ring-2',
                      )}
                      aria-label={`Open ${asset.name}`}
                    >
                      <img src={asset.public_url!} alt="" className="h-full w-full object-cover" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
        {activeTarget.type === 'image' && activeTarget.mediaAssetId && activeTarget.fileUrl ? (
          <MediaImageEditComposer
            assetId={activeTarget.mediaAssetId}
            assetUrl={activeTarget.fileUrl}
            spaceId={activeTarget.spaceId}
            campaignId={activeTarget.campaignId}
            onGenerated={({ assetId, url }) =>
              openArtifactViewer({
                ...activeTarget,
                id: assetId,
                mediaAssetId: assetId,
                fileUrl: url,
                title: 'Edited image',
              })
            }
          />
        ) : null}
      </div>
    </ShellArtifactViewerPanel>
  )
}
