'use client'

import { useState } from 'react'
import { Globe, MessageCircle, MoreHorizontal, Pencil, Share2, ThumbsUp, X } from 'lucide-react'
import { stripCopyFromAdHeadline } from '@/features/studio/utils/ad-headline'
import { AdPreviewAvatar } from './ad-preview-avatar'
import { CreativeMedia, DropOverlay, UploadingOverlay } from './ad-preview-creative-media'
import type { AdFormatPreviewSharedProps } from './ad-preview.types'
import { displayLinkUppercase, formatAdText } from './ad-preview.utils'
import { EditableAdText } from './editable-ad-text'
import { useDropZone } from './use-ad-drop-zone'

export function AdPreviewFbFeed({
  ad,
  pageDisplay,
  onFieldChange,
  onEditingChange,
  onImageDropped,
}: AdFormatPreviewSharedProps) {
  const name = pageDisplay.fbName
  const linkLabel = displayLinkUppercase(ad)
  const [expanded, setExpanded] = useState(false)
  const [editingPrimaryText, setEditingPrimaryText] = useState(false)
  const text = formatAdText(ad.primary_text)
  const canExpand = text.length > 125
  const shown = expanded || !canExpand ? text : text.slice(0, 125)
  const { dragOver, uploading, handlers } = useDropZone('feed', onImageDropped, ad)

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-[#ccd0d5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
      {...handlers}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <AdPreviewAvatar letter={name.slice(0, 1)} size={40} imageUrl={pageDisplay.pictureUrl} />
        <div className="min-w-0 flex-1">
          <span className="text-[15px] font-semibold text-[#050505]">{name}</span>
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-[#65676b]">Sponsored</span>
            <span className="text-[13px] text-[#65676b]">·</span>
            <Globe className="h-3 w-3 text-[#65676b]" />
          </div>
        </div>
        <MoreHorizontal className="h-6 w-6 text-[#65676b]" />
        <X className="h-6 w-6 text-[#65676b]" />
      </div>
      <div className="px-4 pb-3">
        {editingPrimaryText ? (
          <EditableAdText
            value={text}
            field="primary_text"
            onFieldChange={onFieldChange}
            multiline
            autoFocus
            onEditEnd={() => setEditingPrimaryText(false)}
            onEditingChange={onEditingChange}
            className="whitespace-pre-line text-[15px] leading-[20px] text-[#050505]"
          />
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
              className={`whitespace-pre-line text-[15px] leading-[20px] text-[#050505] ${onFieldChange ? 'rounded-sm ring-1 ring-transparent transition-all group-hover/edit:ring-amber-400/40' : ''}`}
            >
              {shown}
              {canExpand && !expanded && (
                <>
                  {' ... '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpanded(true)
                    }}
                    className="font-semibold text-[#050505] hover:underline"
                  >
                    See more
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </div>
      <CreativeMedia ad={ad} placement="feed" />
      {ad.ad_format !== 'CAROUSEL' && (
        <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] uppercase text-[#65676b]">{linkLabel}</p>
            <EditableAdText
              value={formatAdText(stripCopyFromAdHeadline(ad.headline))}
              field="headline"
              onFieldChange={onFieldChange}
              onEditingChange={onEditingChange}
              className="mt-0.5 text-[15px] font-bold leading-tight text-[#050505]"
            />
          </div>
          <a
            href={ad.destination_url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-learn-more ml-3 flex-shrink-0 rounded-md bg-[#e4e6eb] px-4 py-2 text-[15px] font-semibold hover:bg-[#d8dadf]"
          >
            {ad.cta_text || 'Learn more'}
          </a>
        </div>
      )}
      <div className="px-4">
        <div className="flex items-center gap-1.5 py-2">
          <ThumbsUp className="h-[18px] w-[18px] fill-[#1877f2] text-[#1877f2]" />
          <span className="text-[15px] text-[#65676b]">39</span>
        </div>
        <div className="flex items-center border-t border-[#ccd0d5]">
          {(
            [
              ['Like', ThumbsUp],
              ['Comment', MessageCircle],
              ['Share', Share2],
            ] as [string, typeof ThumbsUp][]
          ).map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              className="flex flex-1 items-center justify-center gap-2 py-2.5 text-[#65676b] hover:bg-[#f0f2f5]"
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[15px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {dragOver && <DropOverlay />}
      {uploading && <UploadingOverlay />}
    </div>
  )
}
