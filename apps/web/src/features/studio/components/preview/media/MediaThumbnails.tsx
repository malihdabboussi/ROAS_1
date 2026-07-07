'use client'

import { File, FileText } from 'lucide-react'
import { extractMarkdownFromDocumentContent } from '@/features/studio/lib/document-content-markdown'
import type { MediaAsset } from '@/lib/services/media-api'
import type { ConversationDocument } from '../../../types'
import { DOC_TYPE_ICONS } from './media-tab.constants'
import { isImageFileUrl, isImageMime, isPdfFileUrl } from './media-tab.utils'

export function MediaFileListThumbnail({ asset }: { asset: MediaAsset }) {
  const url = asset.public_url ?? ''
  const showImageThumb =
    url &&
    (isImageMime(asset.mime_type) || (asset.asset_type === 'document' && isImageFileUrl(url)))
  if (showImageThumb) {
    return (
      <div className="bg-[var(--color-muted)]/30 relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
        <img
          src={url}
          alt=""
          className="pointer-events-none h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }
  const isPdf = asset.mime_type === 'application/pdf'
  if (isPdf && url) {
    return (
      <div className="bg-[var(--color-muted)]/30 relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
        <iframe
          src={url}
          title={asset.name ?? 'PDF'}
          className="pointer-events-none h-full w-full border-0"
          loading="lazy"
        />
      </div>
    )
  }
  return (
    <div className="bg-[var(--color-muted)]/30 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded">
      <File className="text-muted-foreground h-4 w-4" />
    </div>
  )
}

export function DocThumbnail({ doc }: { doc: ConversationDocument }) {
  const fileUrl = doc.content?.file_url
  if (fileUrl) {
    const isPdf =
      doc.document_type === 'pdf' ||
      isPdfFileUrl(fileUrl) ||
      doc.content?.type === 'application/pdf'
    if (isPdf) {
      return (
        <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-red-500/10">
          <iframe
            src={fileUrl}
            title={doc.title ?? 'PDF'}
            className="pointer-events-none h-full w-full border-0"
            loading="lazy"
          />
        </div>
      )
    }
    const isImg =
      doc.document_type === 'image_upload' ||
      isImageMime(typeof doc.content?.type === 'string' ? doc.content.type : undefined) ||
      isImageFileUrl(fileUrl)
    if (isImg) {
      return (
        <div className="bg-[var(--color-muted)]/30 relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
          <img
            src={fileUrl}
            alt=""
            className="pointer-events-none h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )
    }
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-red-500/10">
        <FileText className="h-4 w-4 text-red-400" />
      </div>
    )
  }

  const text = extractMarkdownFromDocumentContent(doc.content)
  if (text) {
    return (
      <div className="bg-[var(--color-muted)]/30 h-8 w-8 flex-shrink-0 overflow-hidden rounded p-0.5">
        <p className="text-muted-foreground line-clamp-3 text-[5px] leading-[6px]">{text}</p>
      </div>
    )
  }

  if (doc.content && Object.keys(doc.content).length > 0) {
    return (
      <div className="bg-[var(--color-muted)]/30 h-8 w-8 flex-shrink-0 overflow-hidden rounded p-0.5">
        <p className="text-muted-foreground line-clamp-3 font-mono text-[5px] leading-[6px]">
          {JSON.stringify(doc.content, null, 1).slice(0, 80)}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-muted)]/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded">
      {DOC_TYPE_ICONS[doc.document_type] ?? <FileText className="h-3.5 w-3.5" />}
    </div>
  )
}
