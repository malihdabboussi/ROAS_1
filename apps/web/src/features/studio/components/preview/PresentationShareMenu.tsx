'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Copy, ExternalLink, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { backendPost } from '@/lib/api/backend-client'
import { ConnectCustomDomainModal } from './ConnectCustomDomainModal'

interface PresentationShareMenuProps {
  presentationId: string
  status: 'draft' | 'generated' | 'published'
  publishedUrl: string | null
  open: boolean
  copied: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (
    newStatus: 'draft' | 'generated' | 'published',
    newPublishedUrl: string | null,
  ) => void
  onCopy: (text: string) => Promise<void>
}

interface PublishResult {
  status: string
  slug: string
  published_url: string
}

interface UnpublishResult {
  status: string
}

interface ConnectPresentationDomainResult {
  success: boolean
  published_url?: string | null
}

export function PresentationShareMenu({
  presentationId,
  status,
  publishedUrl,
  open,
  copied,
  onOpenChange,
  onStatusChange,
  onCopy,
}: PresentationShareMenuProps) {
  const [publishing, setPublishing] = useState(false)
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const shareBtnRef = useRef<HTMLButtonElement>(null)
  const isPublished = status === 'published'

  useEffect(() => {
    if (!open || !shareBtnRef.current) return
    const rect = shareBtnRef.current.getBoundingClientRect()
    const width = 320
    const padding = 8
    const unclampedLeft = rect.right - width
    const maxLeft = Math.max(padding, window.innerWidth - width - padding)
    const left = Math.min(Math.max(unclampedLeft, padding), maxLeft)
    setPosition({ top: rect.bottom + 4, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-lm-dropdown]') && !shareBtnRef.current?.contains(target)) {
        onOpenChange(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onOpenChange])

  const ensurePublished = useCallback(async (): Promise<string | null> => {
    setPublishing(true)
    try {
      const result = await backendPost<PublishResult>(
        `/api/presentations/${presentationId}/publish`,
        {},
      )
      onStatusChange(
        (result.status as 'draft' | 'generated' | 'published') ?? 'published',
        result.published_url,
      )
      return result.published_url
    } catch (err) {
      console.error('Failed to publish presentation:', err)
      toast.error(STUDIO_INLINE_ERRORS.PUBLISH_PRESENTATION)
      return null
    } finally {
      setPublishing(false)
    }
  }, [presentationId, onStatusChange])

  const handleUnpublish = useCallback(async () => {
    setPublishing(true)
    try {
      const result = await backendPost<UnpublishResult>(
        `/api/presentations/${presentationId}/unpublish`,
        {},
      )
      onStatusChange(
        (result.status as 'draft' | 'generated' | 'published') ?? 'draft',
        publishedUrl,
      )
    } catch (err) {
      console.error('Failed to unpublish presentation:', err)
      toast.error(STUDIO_INLINE_ERRORS.UNPUBLISH_PRESENTATION)
    } finally {
      setPublishing(false)
    }
  }, [presentationId, onStatusChange, publishedUrl])

  const handlePresent = useCallback(async () => {
    onOpenChange(false)
    const url = await ensurePublished()
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }, [ensurePublished, onOpenChange])

  return (
    <>
      <div className="relative">
        <button
          ref={shareBtnRef}
          type="button"
          onClick={() => onOpenChange(!open)}
          disabled={publishing}
          className={`h-spacing-8 rounded-spacing-2 gap-spacing-2 px-spacing-2 flex items-center transition-all disabled:opacity-50 ${
            isPublished ? 'chip-glass-neutral' : 'chip-glass-green'
          }`}
        >
          {publishing ? (
            <Loader2 className="icon-sm animate-spin" />
          ) : (
            <Globe className="icon-sm" />
          )}
          <span className="body-3 font-medium">
            {publishing ? 'Publishing...' : isPublished ? 'Published' : 'Share'}
          </span>
          <ChevronDown className="icon-sm" />
        </button>

        {open
          ? createPortal(
              <div
                data-lm-dropdown
                className="surface-card border-border z-dropdown rounded-spacing-3 p-spacing-2 fixed w-80 border shadow-lg"
                style={{ top: position.top, left: position.left }}
              >
                {!isPublished ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await ensurePublished()
                        onOpenChange(false)
                      }}
                      disabled={publishing}
                      className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                    >
                      <Globe className="icon-md" />
                      <span>Publish</span>
                    </button>
                    <div className="border-border my-spacing-1 border-t" />
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={handlePresent}
                  disabled={publishing}
                  className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                >
                  <ExternalLink className="icon-md" />
                  <span>Present (open in new tab)</span>
                </button>

                {isPublished ? (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      setDomainModalOpen(true)
                    }}
                    disabled={publishing}
                    className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                  >
                    <Globe className="icon-md" />
                    <span>Connect custom domain</span>
                  </button>
                ) : null}

                {isPublished ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleUnpublish()
                      onOpenChange(false)
                    }}
                    disabled={publishing}
                    className="body-3 text-destructive hover:bg-destructive/10 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                  >
                    <Globe className="icon-md" />
                    <span>Unpublish</span>
                  </button>
                ) : null}

                {publishedUrl ? (
                  <>
                    <div className="border-border my-spacing-1 border-t" />
                    <div className="px-spacing-3 py-spacing-2">
                      <div className="gap-spacing-1 flex items-center">
                        <input
                          aria-label="Published presentation URL"
                          readOnly
                          value={publishedUrl}
                          onFocus={(event) => event.currentTarget.select()}
                          className="h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 body-2 text-foreground w-full border outline-none"
                        />
                        <button
                          type="button"
                          aria-label={copied ? 'Copied' : 'Copy published presentation URL'}
                          onClick={async () => {
                            await onCopy(publishedUrl)
                          }}
                          data-tooltip="Copy"
                          data-side="bottom"
                          className="tooltip h-spacing-8 text-muted-foreground hover:text-foreground rounded-spacing-2 inline-flex aspect-square shrink-0 items-center justify-center transition-colors"
                        >
                          {copied ? (
                            <Check className="icon-md text-success" />
                          ) : (
                            <Copy className="icon-md" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>,
              document.body,
            )
          : null}
      </div>

      <ConnectCustomDomainModal
        open={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
        title="Connect custom domain"
        onConnect={async (domainId) => {
          const result = await backendPost<ConnectPresentationDomainResult>(
            '/api/domains/connect-presentation',
            {
              domain_id: domainId,
              presentation_id: presentationId,
            },
          )
          onStatusChange(status, result.published_url ?? publishedUrl)
          setDomainModalOpen(false)
        }}
      />
    </>
  )
}
