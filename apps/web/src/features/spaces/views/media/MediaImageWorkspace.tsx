'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, ExternalLink, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { MediaImageEditComposer } from '@/components/media'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { MEDIA_TOAST_ERRORS, MEDIA_TOAST_SUCCESS } from '@/lib/config/media-toast-errors.config'
import { connectComposioIntegration, subscribeIntegrationOAuthEvents } from '@/lib/integrations'
import { listAssets, openMediaAssetInCanva, type MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'
import { useMediaDetailQuery } from '../../components/media/use-media-detail-query'

function assetDocument(asset: MediaAsset): DocumentAttachment | null {
  if (!asset.public_url) return null
  return {
    filename: asset.original_filename || asset.name || 'image',
    type: asset.asset_type === 'video' ? 'video' : 'image',
    fileUrl: asset.public_url,
    mediaAssetId: asset.id,
    mimeType: asset.mime_type,
  }
}

async function downloadAsset(asset: MediaAsset) {
  if (typeof window === 'undefined' || !asset.public_url) return
  const response = await fetch(asset.public_url)
  if (!response.ok) throw new Error('download failed')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = asset.original_filename || asset.name || 'image'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function MediaImageWorkspace({
  asset,
  spaceId,
  campaignId,
}: {
  asset: MediaAsset
  spaceId: string
  campaignId: string | null
}) {
  const { setMediaQuery } = useMediaDetailQuery()
  const seedComposer = useGlobalChatStore((s) => s.seedComposer)
  const [history, setHistory] = useState<MediaAsset[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [canvaOpening, setCanvaOpening] = useState(false)
  const pendingCanvaRetryRef = useRef(false)
  const openInCanvaRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    return subscribeIntegrationOAuthEvents((event) => {
      if (event.type !== 'connected') return
      const id = (event.integrationId ?? '').trim().toLowerCase()
      if (id && id !== 'canva') return
      if (!pendingCanvaRetryRef.current) return
      pendingCanvaRetryRef.current = false
      toast.success(MEDIA_TOAST_SUCCESS.CANVA_CONNECTED.userMessage)
      void openInCanvaRef.current?.()
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    setHistoryLoading(true)
    void listAssets({
      asset_type: 'image',
      limit: 40,
      ...(asset.conversation_id
        ? { conversation_id: asset.conversation_id }
        : { space_id: spaceId }),
    })
      .then((res) => {
        if (cancelled) return
        const rows = res.assets.filter((a) => {
          const cat = (a.category ?? '').toLowerCase()
          const src = (a.source ?? '').toLowerCase()
          const tags = a.tags ?? []
          return (
            src === 'generated' ||
            cat.includes('ai-generated') ||
            cat === 'generated' ||
            tags.some((t) => t.includes('ai-generated') || t.includes('ai-edited'))
          )
        })
        setHistory(rows.length > 0 ? rows : res.assets.filter((a) => a.asset_type === 'image'))
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [spaceId, asset.id, asset.conversation_id])

  const historyItems = useMemo(() => {
    const seen = new Set<string>()
    const rows: MediaAsset[] = []
    for (const row of [asset, ...history]) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      rows.push(row)
    }
    return rows
  }, [asset, history])

  const openInChat = useCallback(() => {
    const doc = assetDocument(asset)
    if (!doc) return
    const conversationId = asset.conversation_id?.trim() || undefined
    seedComposer({
      content: '',
      documents: [doc],
      conversationId,
      seedMode: 'attach',
      workContext: {
        surface: 'spaces',
        spaceId,
        campaignId,
      },
    })
  }, [asset, campaignId, seedComposer, spaceId])

  const isVideo = asset.asset_type === 'video'

  const openInCanva = useCallback(async () => {
    if (canvaOpening || isVideo) return
    setCanvaOpening(true)
    try {
      const res = await openMediaAssetInCanva(asset.id)
      if (!res.success) {
        if (res.code === 'NOT_CONNECTED') {
          toast.message(MEDIA_TOAST_ERRORS.CANVA_CONNECT_STARTING.userMessage)
          pendingCanvaRetryRef.current = true
          try {
            const connectResult = await connectComposioIntegration('canva')
            if (connectResult.status === 'already_connected') {
              const retry = await openMediaAssetInCanva(asset.id)
              if (retry.success) {
                pendingCanvaRetryRef.current = false
                toast.success(MEDIA_TOAST_SUCCESS.CANVA_CONNECTED.userMessage)
                window.open(retry.edit_url, '_blank', 'noopener,noreferrer')
                return
              }
              // Reuse claimed connected but handoff still can't see the row — force OAuth.
              await connectComposioIntegration('canva', { forceNew: true })
              return
            }
            // OAuth popup/tab opened — retry after BroadcastChannel connected event.
          } catch (err) {
            pendingCanvaRetryRef.current = false
            toast.error(
              err instanceof Error
                ? err.message
                : MEDIA_TOAST_ERRORS.CANVA_CONNECT_FAILED.userMessage,
            )
          }
          return
        }
        toast.error(res.error || MEDIA_TOAST_ERRORS.CANVA_HANDOFF_FAILED.userMessage)
        return
      }
      toast.success(MEDIA_TOAST_SUCCESS.CANVA_OPENING.userMessage)
      window.open(res.edit_url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : MEDIA_TOAST_ERRORS.CANVA_HANDOFF_FAILED.userMessage,
      )
    } finally {
      setCanvaOpening(false)
    }
  }, [asset.id, canvaOpening, isVideo])

  openInCanvaRef.current = openInCanva

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <aside className="border-border gap-spacing-2 p-spacing-2 flex w-20 shrink-0 flex-col overflow-y-auto border-r">
        <p className="typo-caption text-muted-foreground px-spacing-1">History</p>
        {historyLoading ? (
          <div className="py-spacing-4 flex justify-center">
            <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
          </div>
        ) : (
          historyItems.map((row) => {
            const active = row.id === asset.id
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setMediaQuery(row.id)}
                className={cn(
                  'rounded-spacing-2 border-border relative aspect-square w-full overflow-hidden border',
                  active
                    ? 'border-primary ring-primary/30 ring-2'
                    : 'hover:border-muted-foreground/50',
                )}
                aria-label={row.name}
              >
                {row.public_url ? (
                  <img src={row.public_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="bg-muted block h-full w-full" />
                )}
              </button>
            )
          })
        )}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="gap-spacing-2 px-spacing-4 py-spacing-3 z-dropdown relative flex shrink-0 flex-wrap items-center justify-end">
          <button
            type="button"
            onClick={openInChat}
            className="body-3 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 px-spacing-3 inline-flex h-8 items-center border"
          >
            <MessageSquare className="icon-sm" />
            Show in chat
          </button>

          {!isVideo ? (
            <button
              type="button"
              disabled={canvaOpening}
              onClick={() => void openInCanva()}
              className="body-3 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 px-spacing-3 inline-flex h-8 items-center border disabled:opacity-50"
            >
              {canvaOpening ? (
                <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
              ) : (
                <ExternalLink className="icon-sm" />
              )}
              Open in Canva
            </button>
          ) : null}

          <button
            type="button"
            disabled={!asset.public_url}
            onClick={() => {
              void downloadAsset(asset).catch(() =>
                toast.error(MEDIA_TOAST_ERRORS.DOWNLOAD_FAILED.userMessage),
              )
            }}
            className="btn-icon-glass text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Download"
          >
            <Download className="icon-sm" />
          </button>
        </div>

        <div className="px-spacing-4 min-h-0 flex-1 overflow-y-auto">
          <div className="bg-muted/10 border-border rounded-spacing-3 p-spacing-4 mx-auto flex min-h-[280px] max-w-4xl items-center justify-center border">
            {isVideo && asset.public_url ? (
              <video
                src={asset.public_url}
                controls
                className="rounded-spacing-2 max-h-[60vh] w-full"
              />
            ) : asset.public_url ? (
              <img
                src={asset.public_url}
                alt=""
                className="rounded-spacing-2 max-h-[60vh] w-full object-contain"
              />
            ) : (
              <span className="body-3 text-muted-foreground">No preview</span>
            )}
          </div>
        </div>

        {!isVideo && asset.public_url ? (
          <MediaImageEditComposer
            assetId={asset.id}
            assetUrl={asset.public_url}
            spaceId={spaceId}
            campaignId={campaignId}
            conversationId={asset.conversation_id}
            onGenerated={({ assetId }) => setMediaQuery(assetId)}
          />
        ) : null}
      </div>
    </div>
  )
}
