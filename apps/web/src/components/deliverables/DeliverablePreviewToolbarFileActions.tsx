'use client'

import { Check, ClipboardCopy, Download } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { MissionDeliverable } from '@/lib/missions'

function deliverableDownloadLabel(deliverable: MissionDeliverable): string {
  const fileUrl = deliverable.file_url ?? ''
  if (
    deliverable.mime_type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    deliverable.file_name?.toLowerCase().endsWith('.docx') === true ||
    fileUrl.toLowerCase().includes('.docx')
  ) {
    return 'Download document'
  }
  if (
    deliverable.type === 'avatar' ||
    deliverable.type === 'image' ||
    deliverable.mime_type?.toLowerCase().startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(fileUrl)
  ) {
    return 'Download image'
  }
  if (
    deliverable.type === 'video' ||
    deliverable.mime_type?.toLowerCase().startsWith('video/') ||
    /\.(mp4|webm|mov)(\?|$)/i.test(fileUrl)
  ) {
    return 'Download video'
  }
  return 'Download'
}

export function DeliverablePreviewToolbarFileActions({
  deliverable,
  copied,
  setCopied,
}: {
  deliverable: MissionDeliverable
  copied: boolean
  setCopied: (v: boolean) => void
}) {
  if (!deliverable.file_url) return null

  return (
    <>
      <Tooltip label={copied ? 'Copied!' : 'Copy link'} side="top">
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(deliverable.file_url!)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="btn-icon-bare"
        >
          {copied ? (
            <Check className="icon-sm text-primary" />
          ) : (
            <ClipboardCopy className="icon-sm" />
          )}
        </button>
      </Tooltip>
      <Tooltip label={deliverableDownloadLabel(deliverable)} side="top">
        <a
          href={deliverable.file_url}
          target="_blank"
          rel="noopener noreferrer"
          download={deliverable.file_name ?? deliverable.title ?? ''}
          className="btn-icon-bare"
        >
          <Download className="icon-sm" />
        </a>
      </Tooltip>
    </>
  )
}
