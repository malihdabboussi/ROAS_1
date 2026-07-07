'use client'

import { ChevronUp, Globe, MoreHorizontal } from 'lucide-react'
import { stripCopyFromAdHeadline } from '@/features/studio/utils/ad-headline'
import { AdPreviewAvatar } from './ad-preview-avatar'
import { CreativeMedia, DropOverlay, UploadingOverlay } from './ad-preview-creative-media'
import type { AdFormatPreviewSharedProps } from './ad-preview.types'
import { EditableAdText } from './editable-ad-text'
import { useDropZone } from './use-ad-drop-zone'

export function AdPreviewFbStory({
  ad,
  pageDisplay,
  onFieldChange,
  onEditingChange,
  onImageDropped,
}: AdFormatPreviewSharedProps) {
  const name = pageDisplay.fbName
  const { dragOver, uploading, handlers } = useDropZone('story', onImageDropped, ad)
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ aspectRatio: '9 / 16' }}
      {...handlers}
    >
      <CreativeMedia ad={ad} placement="story" />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
        <div className="p-3 pt-2">
          <div className="mb-2 flex gap-[3px]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-[2px] flex-1 rounded-full ${i === 1 ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <AdPreviewAvatar
              letter={name.slice(0, 1)}
              size={32}
              imageUrl={pageDisplay.pictureUrl}
            />
            <span className="text-[13px] font-semibold text-white drop-shadow-sm">{name}</span>
            <span className="text-[12px] text-white/60">
              Sponsored · <Globe className="inline h-3 w-3" />
            </span>
            <MoreHorizontal className="ml-auto h-5 w-5 text-white/80" />
          </div>
        </div>
        <div className="pointer-events-auto bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pb-5 pt-16">
          <EditableAdText
            value={stripCopyFromAdHeadline(ad.headline)}
            field="headline"
            onFieldChange={onFieldChange}
            onEditingChange={onEditingChange}
            darkBg
            className="mb-3 line-clamp-2 text-[14px] leading-snug text-white drop-shadow"
          />
          <div className="flex items-center justify-center">
            <a
              href={ad.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-[14px] font-semibold text-[#050505]"
            >
              <ChevronUp className="h-4 w-4" />
              {ad.cta_text || 'Learn More'}
            </a>
          </div>
        </div>
      </div>
      {dragOver && <DropOverlay />}
      {uploading && <UploadingOverlay />}
    </div>
  )
}
