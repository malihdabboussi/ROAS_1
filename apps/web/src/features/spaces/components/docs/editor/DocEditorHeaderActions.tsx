'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ClipboardCopy, Share2 } from 'lucide-react'
import type { GoogleDriveFile } from '@/lib/services/google-drive-api'
import { htmlToPlainTextPreview } from '../../space-item-values'
import { DocEditorExportDropdown } from './DocEditorExportDropdown'

export function DocEditorHeaderActions({
  title,
  getDocBody,
  visualHtml,
  campaignId,
  customData,
  onGoogleDocCreated,
  onShare,
  googleActionTarget,
}: {
  title: string
  getDocBody: () => string
  visualHtml?: string | null
  campaignId?: string | null
  customData?: Record<string, unknown> | null
  onGoogleDocCreated?: (file: GoogleDriveFile) => void | Promise<void>
  onShare?: () => void
  googleActionTarget?: HTMLElement | null
}) {
  const [localGoogleActionTarget, setLocalGoogleActionTarget] = useState<HTMLDivElement | null>(
    null,
  )
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    },
    [],
  )

  const copyDocument = useCallback(async () => {
    const text = htmlToPlainTextPreview(getDocBody())
    if (!text || copied) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }, [copied, getDocBody])

  return (
    <div className="gap-spacing-2 flex shrink-0 items-center">
      {googleActionTarget ? null : (
        <div ref={setLocalGoogleActionTarget} className="flex shrink-0 items-center" />
      )}
      <div className="flex shrink-0 items-stretch">
        <button
          type="button"
          onClick={() => void copyDocument()}
          className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center whitespace-nowrap rounded-r-none"
          aria-label="Copy document"
        >
          {copied ? (
            <Check className="icon-sm text-primary shrink-0" />
          ) : (
            <ClipboardCopy className="icon-sm shrink-0" />
          )}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
        <DocEditorExportDropdown
          title={title}
          getDocBody={getDocBody}
          visualHtml={visualHtml}
          campaignId={campaignId}
          customData={customData}
          onGoogleDocCreated={onGoogleDocCreated}
          googleActionTarget={googleActionTarget ?? localGoogleActionTarget}
          triggerIcon="chevron"
          buttonClassName="button-glass-neutral px-spacing-2 py-spacing-2 rounded-l-none border-l-0"
        />
      </div>
      {onShare ? (
        <button
          type="button"
          onClick={onShare}
          className="btn-icon-bare"
          aria-label="Share document"
        >
          <Share2 className="icon-sm" />
        </button>
      ) : null}
    </div>
  )
}
