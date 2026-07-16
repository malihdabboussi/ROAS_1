'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { ArrowUp, ChevronDown, Download, ExternalLink, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import {
  MEDIA_TOAST_ERRORS,
  MEDIA_TOAST_SUCCESS,
} from '@/lib/config/media-toast-errors.config'
import {
  connectComposioIntegration,
  subscribeIntegrationOAuthEvents,
} from '@/lib/integrations'
import {
  ASPECT_RATIO_MENU_WIDTH,
  AspectRatioMenuOption,
  CHATGPT_STYLE_ASPECT_OPTIONS,
  type ChatGptStyleAspectRatio,
} from '@/components/media/aspect-ratio-menu'
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

function downloadAsset(asset: MediaAsset) {
  if (typeof window === 'undefined' || !asset.public_url) return
  const a = document.createElement('a')
  a.href = asset.public_url
  a.download = asset.original_filename || asset.name || ''
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
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
  const [editPrompt, setEditPrompt] = useState('')
  const [aspectOpen, setAspectOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [canvaOpening, setCanvaOpening] = useState(false)
  const aspectBtnRef = useRef<HTMLButtonElement>(null)
  const aspectMenuRef = useRef<HTMLDivElement>(null)
  const [aspectCoords, setAspectCoords] = useState<{ top: number; left: number } | null>(null)
  const pendingCanvaRetryRef = useRef(false)
  const openInCanvaRef = useRef<(() => Promise<void>) | null>(null)

  useLayoutEffect(() => {
    if (!aspectOpen || !aspectBtnRef.current) {
      setAspectCoords(null)
      return
    }
    const rect = aspectBtnRef.current.getBoundingClientRect()
    setAspectCoords({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - ASPECT_RATIO_MENU_WIDTH),
    })
  }, [aspectOpen])

  useEffect(() => {
    if (!aspectOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (aspectBtnRef.current?.contains(t)) return
      if (aspectMenuRef.current?.contains(t)) return
      setAspectOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [aspectOpen])

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
      space_id: spaceId,
      asset_type: 'image',
      limit: 40,
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
  }, [spaceId, asset.id])

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

  const seedEdit = useCallback(
    (content: string) => {
      const doc = assetDocument(asset)
      setSending(true)
      try {
        seedComposer({
          content,
          documents: doc ? [doc] : undefined,
          workContext: {
            surface: 'spaces',
            spaceId,
            campaignId,
          },
          railIntent: 'new',
        })
        setEditPrompt('')
      } finally {
        setSending(false)
      }
    },
    [asset, campaignId, seedComposer, spaceId],
  )

  const openInChat = useCallback(() => {
    const doc = assetDocument(asset)
    if (!doc) return
    const conversationId = asset.conversation_id?.trim() || undefined
    setSending(true)
    try {
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
    } finally {
      setSending(false)
    }
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

  const submitEdits = useCallback(() => {
    const prompt = editPrompt.trim()
    if (!prompt || sending) return
    seedEdit(
      [
        `Edit this attached image using edit_image with parent_image_asset_id ${asset.id}.`,
        `Edits: ${prompt}`,
        `Pass space_id "${spaceId}" so the result is saved into this space's media library.`,
        campaignId ? `campaign_id: ${campaignId}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }, [asset.id, campaignId, editPrompt, seedEdit, sending, spaceId])

  const regenerateAspect = useCallback(
    (ratio: ChatGptStyleAspectRatio) => {
      setAspectOpen(false)
      seedEdit(
        [
          `Regenerate the attached image at aspect ratio ${ratio}.`,
          `Use edit_image with parent_image_asset_id ${asset.id} and aspect_ratio ${ratio}.`,
          `Preserve the subject and composition as much as possible.`,
          `Pass space_id "${spaceId}" so the new version is saved into this space's media library.`,
          campaignId ? `campaign_id: ${campaignId}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      )
    },
    [asset.id, campaignId, seedEdit, spaceId],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitEdits()
    }
  }

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
                  active ? 'border-primary ring-primary/30 ring-2' : 'hover:border-muted-foreground/50',
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
        <div className="gap-spacing-2 px-spacing-4 py-spacing-3 relative z-dropdown flex shrink-0 flex-wrap items-center justify-end">
          <div className="relative">
            <button
              ref={aspectBtnRef}
              type="button"
              onClick={() => setAspectOpen((v) => !v)}
              className="body-3 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 inline-flex h-8 items-center border px-spacing-3"
            >
              Aspect ratio
              <ChevronDown className="icon-sm text-muted-foreground" />
            </button>
            {aspectOpen && aspectCoords && typeof document !== 'undefined'
              ? createPortal(
                  <div
                    ref={aspectMenuRef}
                    data-dropdown
                    className="z-dropdown fixed"
                    style={{
                      top: aspectCoords.top,
                      left: aspectCoords.left,
                      width: ASPECT_RATIO_MENU_WIDTH,
                    }}
                  >
                    <div className="dropdown-menu-solid p-spacing-2">
                      <p className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1">
                        Generate this image with a different aspect ratio
                      </p>
                      <div className="flex flex-col gap-spacing-1">
                        {CHATGPT_STYLE_ASPECT_OPTIONS.map((opt) => (
                          <AspectRatioMenuOption
                            key={opt.ratio}
                            ratio={opt.ratio}
                            label={opt.label}
                            onSelect={() => regenerateAspect(opt.ratio)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>,
                  document.body,
                )
              : null}
          </div>

          <button
            type="button"
            onClick={openInChat}
            className="body-3 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 inline-flex h-8 items-center border px-spacing-3"
          >
            <MessageSquare className="icon-sm" />
            Show in chat
          </button>

          {!isVideo ? (
            <button
              type="button"
              disabled={canvaOpening}
              onClick={() => void openInCanva()}
              className="body-3 text-foreground hover:bg-hover-subtle border-border gap-spacing-1 rounded-spacing-2 inline-flex h-8 items-center border px-spacing-3 disabled:opacity-50"
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
            onClick={() => downloadAsset(asset)}
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

        {!isVideo ? (
          <div className="home-dashboard-v4 relative shrink-0 overflow-hidden border-t border-border">
            <div className="home-dashboard-v4-hero-glow" aria-hidden />
            <div className="home-dashboard-v4-hero-grid" aria-hidden />
            <div className="home-dashboard-v4-column home-dashboard-v4-column-media-composer">
              <div className="home-composer-v4-shell relative">
                <div className="relative flex-1 px-spacing-2 pt-3">
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    onKeyDown={onKeyDown}
                    disabled={sending}
                    placeholder="Describe edits…"
                    rows={2}
                    className="body-2 text-foreground placeholder:text-muted-foreground w-full resize-none bg-transparent outline-none disabled:opacity-50"
                  />
                </div>
                <div className="home-composer-v4-standard-footer flex w-full items-center justify-end px-spacing-2 py-spacing-2">
                  <button
                    type="button"
                    disabled={!editPrompt.trim() || sending}
                    onClick={submitEdits}
                    className={cn(
                      'hd4-send-btn shrink-0',
                      editPrompt.trim() && !sending
                        ? 'hd4-send-btn-active'
                        : 'hd4-send-btn-idle opacity-50',
                    )}
                    aria-label="Send message"
                  >
                    {sending ? (
                      <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
                    ) : (
                      <ArrowUp className="icon-sm" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
