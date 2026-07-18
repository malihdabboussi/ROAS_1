'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Download, MessageSquare } from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import {
  AspectRatioMenuOption,
  CHATGPT_STYLE_ASPECT_OPTIONS,
  type ChatGptStyleAspectRatio,
} from '@/components/media/aspect-ratio-menu'
import { isShellWorkspaceRoute } from '@/components/shell/shell-route-policy'
import { ShellArtifactViewerPanel } from '@/components/shell/ShellArtifactViewerPanel'
import { useShellStore } from '@/components/shell/use-shell-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { listAssets, type MediaAsset } from '@/lib/services/media-api'
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
  const [aspectOpen, setAspectOpen] = useState(false)
  const aspectRef = useRef<HTMLDivElement | null>(null)

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
      const attachment = targetAttachment(target)
      if (!attachment) return
      openChat()
      seedComposer({
        content,
        documents: [attachment],
        seedMode,
        railIntent: 'new',
        workContext: {
          surface: target.spaceId ? 'spaces' : 'general',
          spaceId: target.spaceId || undefined,
          campaignId: target.campaignId || undefined,
        },
      })
    },
    [openChat, seedComposer, target],
  )

  useEffect(() => {
    if (!target.spaceId || target.type !== 'image') {
      setHistory([])
      return
    }
    let cancelled = false
    void listAssets({ space_id: target.spaceId, asset_type: 'image', limit: 40 })
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
  }, [target.spaceId, target.type])

  useEffect(() => {
    if (!aspectOpen) return
    const onDown = (event: MouseEvent) => {
      if (!aspectRef.current?.contains(event.target as Node)) setAspectOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [aspectOpen])

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

  const changeAspectRatio = useCallback(
    (ratio: ChatGptStyleAspectRatio) => {
      setAspectOpen(false)
      seedFreshChat(
        [
          `Regenerate the attached image at aspect ratio ${ratio}.`,
          target.mediaAssetId
            ? `Use edit_image with parent_image_asset_id ${target.mediaAssetId} and aspect_ratio ${ratio}.`
            : null,
          'Preserve the subject and composition as much as possible.',
        ]
          .filter(Boolean)
          .join('\n'),
      )
    },
    [seedFreshChat, target.mediaAssetId],
  )

  const actions = (
    <>
      {target.type === 'image' ? (
        <div ref={aspectRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAspectOpen((open) => !open)}
            className="body-4 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 px-spacing-2 flex h-7 items-center border"
          >
            Aspect ratio
            <ChevronDown className="h-3 w-3" />
          </button>
          {aspectOpen ? (
            <div className="dropdown-menu-solid p-spacing-2 gap-spacing-1 z-dropdown absolute left-0 top-8 flex min-w-64 flex-col">
              {CHATGPT_STYLE_ASPECT_OPTIONS.map((option) => (
                <AspectRatioMenuOption
                  key={option.ratio}
                  ratio={option.ratio}
                  label={option.label}
                  onSelect={() => changeAspectRatio(option.ratio)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        onClick={editInChat}
        className="chip-glass-green body-4 gap-spacing-1 px-spacing-2 flex h-7 items-center font-semibold"
      >
        <MessageSquare className="h-3 w-3" />
        Edit in chat
      </button>
      {target.fileUrl ? (
        <a
          href={target.fileUrl}
          download={target.fileName || target.title}
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
    <ShellArtifactViewerPanel target={target} actions={actions}>
      <div className="p-spacing-4 gap-spacing-4 flex min-h-full flex-col">
        <div className="border-border surface-card rounded-spacing-3 shadow-1 flex min-h-72 items-center justify-center overflow-hidden border">
          {target.type === 'video' && target.fileUrl ? (
            <video src={target.fileUrl} controls className="max-h-full w-full object-contain" />
          ) : target.type === 'audio' && target.fileUrl ? (
            <audio src={target.fileUrl} controls className="mx-spacing-4 w-full" />
          ) : target.fileUrl ? (
            <img
              src={target.fileUrl}
              alt={target.title}
              className="max-h-full w-full object-contain"
            />
          ) : (
            <p className="body-3 text-muted-foreground">No preview available</p>
          )}
        </div>

        {target.type === 'image' && historyItems.length > 0 ? (
          <div>
            <p className="typo-caption text-muted-foreground mb-spacing-2 uppercase tracking-wide">
              History
            </p>
            <div className="gap-spacing-2 scrollbar-hide flex overflow-x-auto">
              {historyItems.map((asset) => {
                const active = asset.id === target.mediaAssetId
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      openArtifactViewer({
                        ...target,
                        id: asset.id,
                        mediaAssetId: asset.id,
                        title: asset.name || target.title,
                        fileName: asset.original_filename || asset.name || target.fileName,
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
    </ShellArtifactViewerPanel>
  )
}
