'use client'

import { useEffect, useState } from 'react'
import { FileText, Image as ImageIcon, Video } from 'lucide-react'
import { ARTIFACT_CHAT_PREVIEW_PANE_PX } from '@/lib/chat/artifact-preview-layout'
import { getAsset, type MediaAsset } from '@/lib/services/media-api'

interface KnowledgeSourceMediaPreviewProps {
  assetId: string
  name: string
  onOpen?: () => void
}

export function KnowledgeSourceMediaPreview({
  assetId,
  name,
  onOpen,
}: KnowledgeSourceMediaPreviewProps) {
  const [asset, setAsset] = useState<MediaAsset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAsset(assetId)
      .then((row) => {
        if (!cancelled) setAsset(row)
      })
      .catch(() => {
        if (!cancelled) setAsset(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assetId])

  const url = asset?.public_url?.trim() || null
  const mime = asset?.mime_type ?? ''
  const isVideo = mime.startsWith('video/') || asset?.asset_type === 'video'
  const isImage = mime.startsWith('image/') || asset?.asset_type === 'image'

  const pane = (() => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <ImageIcon className="icon-lg text-muted-foreground animate-pulse" />
        </div>
      )
    }
    if (url && isVideo) {
      return <video src={url} muted playsInline controls className="h-full w-full object-contain" />
    }
    if (url && isImage) {
      return <img src={url} alt="" className="h-full w-full object-cover" />
    }
    if (url) {
      return (
        <div className="gap-spacing-2 px-spacing-3 flex h-full flex-col items-center justify-center">
          <FileText className="icon-lg text-muted-foreground" />
          <span className="typo-caption text-muted-foreground truncate">{asset?.name ?? name}</span>
        </div>
      )
    }
    return (
      <div className="flex h-full items-center justify-center">
        <Video className="icon-lg text-muted-foreground" />
      </div>
    )
  })()

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="card-glass hover:bg-hover-subtle w-full overflow-hidden rounded-xl text-left transition-all disabled:cursor-default disabled:hover:bg-transparent"
    >
      <div
        className="border-border bg-muted relative overflow-hidden border-b"
        style={{ height: ARTIFACT_CHAT_PREVIEW_PANE_PX }}
      >
        {pane}
      </div>
      <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
        <ImageIcon className="icon-sm text-muted-foreground shrink-0" />
        <span className="body-3 text-foreground min-w-0 truncate font-medium">{name}</span>
      </div>
    </button>
  )
}
