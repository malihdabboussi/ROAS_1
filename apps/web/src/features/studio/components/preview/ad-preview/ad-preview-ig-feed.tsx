'use client'

import { useState } from 'react'
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Pencil, Send } from 'lucide-react'
import { AdPreviewAvatar } from './ad-preview-avatar'
import { CreativeMedia, DropOverlay, UploadingOverlay } from './ad-preview-creative-media'
import type { AdFormatPreviewSharedProps } from './ad-preview.types'
import { formatAdText } from './ad-preview.utils'
import { EditableAdText } from './editable-ad-text'
import { useDropZone } from './use-ad-drop-zone'

export function AdPreviewIgFeed({
  ad,
  pageDisplay,
  onFieldChange,
  onEditingChange,
  onImageDropped,
}: AdFormatPreviewSharedProps) {
  const username = pageDisplay.igName
  const [expanded, setExpanded] = useState(false)
  const [editingPrimaryText, setEditingPrimaryText] = useState(false)
  const text = formatAdText(ad.primary_text)
  const canExpand = text.length > 80
  const shown = expanded || !canExpand ? text : text.slice(0, 80)
  const { dragOver, uploading, handlers } = useDropZone('feed', onImageDropped, ad)

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-[#dbdbdb] bg-white"
      {...handlers}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <AdPreviewAvatar
          letter={username.slice(0, 1)}
          size={32}
          ring
          imageUrl={pageDisplay.pictureUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-[#262626]">{username}</span>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0095f6] text-white">
              <svg
                viewBox="0 0 24 24"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M5 12l5 5L19 7" />
              </svg>
            </span>
          </div>
          <span className="text-[12px] text-[#8e8e8e]">Sponsored</span>
        </div>
        <MoreHorizontal className="h-5 w-5 text-[#262626]" />
      </div>
      <div className="relative">
        <CreativeMedia ad={ad} placement="feed" />
        {ad.ad_format !== 'CAROUSEL' && (
          <div className="absolute bottom-0 left-0 right-0">
            <a
              href={ad.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between bg-white px-4 py-2.5"
            >
              <span className="text-[14px] font-semibold text-[#0095f6]">
                {ad.cta_text || 'Shop now'}
              </span>
              <span className="text-[18px] text-[#0095f6]">›</span>
            </a>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 text-[#262626]" strokeWidth={1.5} />
          <MessageCircle className="h-6 w-6 text-[#262626]" strokeWidth={1.5} />
          <Send className="h-5 w-5 text-[#262626]" strokeWidth={1.5} />
        </div>
        <Bookmark className="h-6 w-6 text-[#262626]" strokeWidth={1.5} />
      </div>
      <div className="px-3">
        <span className="text-[14px] font-semibold text-[#262626]">1,515 likes</span>
      </div>
      <div className="px-3 pb-3 pt-1">
        {editingPrimaryText ? (
          <div className="text-[14px] leading-[18px] text-[#262626]">
            <span className="font-semibold">{username}</span>{' '}
            <EditableAdText
              value={text}
              field="primary_text"
              onFieldChange={onFieldChange}
              multiline
              autoFocus
              onEditEnd={() => setEditingPrimaryText(false)}
              onEditingChange={onEditingChange}
              className="mt-1 whitespace-pre-line text-[14px] leading-[18px] text-[#262626]"
            />
          </div>
        ) : (
          <div
            className={`group/edit relative ${onFieldChange ? 'cursor-text' : ''}`}
            onClick={() => {
              if (!onFieldChange) return
              setEditingPrimaryText(true)
              onEditingChange?.(true)
            }}
          >
            {onFieldChange && (
              <div className="pointer-events-none absolute -right-1 -top-1 z-10 rounded-full bg-amber-500/80 p-0.5 text-white opacity-0 shadow-sm transition-opacity group-hover/edit:opacity-100">
                <Pencil className="h-2.5 w-2.5" />
              </div>
            )}
            <p
              className={`whitespace-pre-line text-[14px] leading-[18px] text-[#262626] ${onFieldChange ? 'rounded-sm ring-1 ring-transparent transition-all group-hover/edit:ring-amber-400/40' : ''}`}
            >
              <span className="font-semibold">{username}</span> {shown}
              {canExpand && !expanded && (
                <>
                  {' ... '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpanded(true)
                    }}
                    className="text-[#8e8e8e]"
                  >
                    more
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </div>
      {dragOver && <DropOverlay />}
      {uploading && <UploadingOverlay />}
    </div>
  )
}
