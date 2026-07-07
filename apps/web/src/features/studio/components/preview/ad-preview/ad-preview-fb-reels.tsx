'use client'

import { Heart, MessageCircle, MoreHorizontal, Music, Send } from 'lucide-react'
import { AdPreviewAvatar } from './ad-preview-avatar'
import { CreativeMedia, DropOverlay, UploadingOverlay } from './ad-preview-creative-media'
import type { AdFormatPreviewSharedProps } from './ad-preview.types'
import { EditableAdText } from './editable-ad-text'
import { useDropZone } from './use-ad-drop-zone'

export function AdPreviewFbReels({
  ad,
  pageDisplay,
  onFieldChange,
  onEditingChange,
  onImageDropped,
}: AdFormatPreviewSharedProps) {
  const name = pageDisplay.fbName
  const { dragOver, uploading, handlers } = useDropZone('reels', onImageDropped, ad)
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: '9 / 16' }}
      {...handlers}
    >
      <CreativeMedia ad={ad} placement="reels" />
      <div className="pointer-events-none absolute inset-0 flex">
        <div className="pointer-events-auto flex flex-1 flex-col justify-end pb-5 pl-4 pr-14">
          <div className="mb-2 flex items-center gap-2">
            <AdPreviewAvatar
              letter={name.slice(0, 1)}
              size={28}
              imageUrl={pageDisplay.pictureUrl}
            />
            <span className="text-[13px] font-semibold text-white drop-shadow-sm">{name}</span>
            <span className="text-[11px] text-white/60">Sponsored</span>
          </div>
          <EditableAdText
            value={ad.primary_text}
            field="primary_text"
            onFieldChange={onFieldChange}
            onEditingChange={onEditingChange}
            multiline
            darkBg
            className="mb-2 line-clamp-2 text-[13px] leading-snug text-white drop-shadow"
          />
          <a
            href={ad.destination_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 flex w-fit items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            {ad.cta_text || 'Learn More'} <span className="text-[14px]">›</span>
          </a>
          <div className="flex items-center gap-2">
            <Music className="h-3 w-3 text-white/60" />
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-1/3 rounded-full bg-white/60" />
            </div>
          </div>
        </div>
        <div className="pointer-events-auto flex w-12 flex-col items-center justify-end gap-5 pb-6 pr-2">
          <div className="flex flex-col items-center gap-1">
            <Heart className="h-7 w-7 text-white" strokeWidth={1.5} />
            <span className="text-[11px] text-white">1.2K</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="h-7 w-7 text-white" strokeWidth={1.5} />
            <span className="text-[11px] text-white">48</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Send className="h-6 w-6 text-white" strokeWidth={1.5} />
            <span className="text-[11px] text-white">Share</span>
          </div>
          <MoreHorizontal className="h-6 w-6 text-white" />
        </div>
      </div>
      {dragOver && <DropOverlay />}
      {uploading && <UploadingOverlay />}
    </div>
  )
}
