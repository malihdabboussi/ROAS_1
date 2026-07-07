'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Monitor,
  Settings,
  Smartphone,
  Tablet,
} from 'lucide-react'
import { toast } from 'sonner'
import { FunnelStatusGlassCapsule } from '@/components/artifacts'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { backendPost } from '@/lib/api/backend-client'
import { useFunnelFullModeStore } from '../../store/use-funnel-full-mode-store'
import { ConnectCustomDomainModal } from './ConnectCustomDomainModal'
import { PresentationEditModeToolbar } from './PresentationEditModeToolbar'

// ============================================================================
// Types
// ============================================================================

export type ViewportSize = 'desktop' | 'tablet' | 'mobile'

interface FunnelToolbarPage {
  id: string
  name: string
  slug?: string
  path?: string
  page_type: string
}

interface FunnelToolbarProps {
  funnelId: string
  funnelName: string
  status: string
  slug: string
  publishedUrl?: string | null
  onStatusChange: (newStatus: string, newSlug: string, newPublishedUrl?: string) => void
  viewport: ViewportSize
  onViewportChange: (v: ViewportSize) => void
  pages?: FunnelToolbarPage[]
  currentPageId?: string | null
  onPageChange?: (pageId: string) => void
  /** When true, omit the funnel settings shortcut (e.g. Spaces artifact preview). */
  hideFunnelSettingsButton?: boolean
  /** Prepended before funnel name (e.g. Spaces deep-work Back). */
  leadingChrome?: ReactNode
  /**
   * Placed immediately after Publish (before the divider + viewport picker), e.g. Spaces “open full view”.
   */
  publishAdjacentChrome?: ReactNode
  /** Far right — close preview, deep-work extras (after viewport). */
  trailingChrome?: ReactNode
  /** Sits immediately to the left of the Publish button (e.g. Spaces funnel options menu). */
  publishLeadingChrome?: ReactNode
  /** Spaces deep-work: edit modes in toolbar for HTML bundle funnels. */
  funnelFullMode?: boolean
  /** Hide center page path dropdown (deep-work uses Pages rail or is redundant). */
  hidePagePicker?: boolean
  /** Undo/redo controls for durable funnel history. */
  historyChrome?: ReactNode
}

interface ConnectFunnelDomainResult {
  success: boolean
  published_url?: string | null
}

// ============================================================================
// Constants
// ============================================================================

const COMPACT_BREAKPOINT = 580

const VIEWPORT_OPTIONS: { id: ViewportSize; label: string; icon: typeof Monitor }[] = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
]

// ============================================================================
// FunnelToolbar
// ============================================================================

function getPagePath(page: FunnelToolbarPage): string {
  if (page.path && page.path !== '') return page.path
  if (page.page_type === 'home' || !page.slug || page.slug === 'home') return '/'
  return `/${page.slug}`
}

export function FunnelToolbar({
  funnelId,
  funnelName,
  status,
  slug,
  publishedUrl,
  onStatusChange,
  viewport,
  onViewportChange,
  pages,
  currentPageId,
  onPageChange,
  hideFunnelSettingsButton = false,
  leadingChrome,
  publishAdjacentChrome,
  trailingChrome,
  publishLeadingChrome,
  funnelFullMode = false,
  hidePagePicker = false,
  historyChrome,
}: FunnelToolbarProps) {
  const [publishing, setPublishing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [publishDropdownOpen, setPublishDropdownOpen] = useState(false)
  const [domainModalOpen, setDomainModalOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const publishBtnRef = useRef<HTMLButtonElement>(null)
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false)
  const [pageDropdownPosition, setPageDropdownPosition] = useState({ top: 0, left: 0 })
  const pageBtnRef = useRef<HTMLButtonElement>(null)
  const [viewportDropdownOpen, setViewportDropdownOpen] = useState(false)
  const [viewportDropdownPos, setViewportDropdownPos] = useState({ top: 0, left: 0 })
  const viewportBtnRef = useRef<HTMLButtonElement>(null)

  const toolbarRef = useRef<HTMLDivElement>(null)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const el = toolbarRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setIsCompact(w < COMPACT_BREAKPOINT)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isPublished = status === 'published'

  useEffect(() => {
    if (publishDropdownOpen && publishBtnRef.current) {
      const rect = publishBtnRef.current.getBoundingClientRect()
      const width = 320
      const padding = 8
      const unclampedLeft = rect.right - width
      const maxLeft = Math.max(padding, window.innerWidth - width - padding)
      const left = Math.min(Math.max(unclampedLeft, padding), maxLeft)
      setDropdownPosition({ top: rect.bottom + 4, left })
    }
  }, [publishDropdownOpen])

  useEffect(() => {
    if (!publishDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-publish-dropdown]') && !publishBtnRef.current?.contains(target)) {
        setPublishDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [publishDropdownOpen])

  const PAGE_DROPDOWN_WIDTH = 200
  useEffect(() => {
    if (pageDropdownOpen && pageBtnRef.current) {
      const rect = pageBtnRef.current.getBoundingClientRect()
      const left = Math.max(8, rect.left + rect.width / 2 - PAGE_DROPDOWN_WIDTH / 2)
      setPageDropdownPosition({ top: rect.bottom + 4, left })
    }
  }, [pageDropdownOpen])

  useEffect(() => {
    if (!pageDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-page-dropdown]') && !pageBtnRef.current?.contains(target)) {
        setPageDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pageDropdownOpen])

  const VIEWPORT_DROPDOWN_WIDTH = 200
  useEffect(() => {
    if (viewportDropdownOpen && viewportBtnRef.current) {
      const rect = viewportBtnRef.current.getBoundingClientRect()
      const left = Math.max(8, rect.left + rect.width / 2 - VIEWPORT_DROPDOWN_WIDTH / 2)
      setViewportDropdownPos({ top: rect.bottom + 4, left })
    }
  }, [viewportDropdownOpen])

  useEffect(() => {
    if (!viewportDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('[data-viewport-dropdown]') &&
        !viewportBtnRef.current?.contains(target)
      ) {
        setViewportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [viewportDropdownOpen])

  const currentPage = pages?.find((p) => p.id === currentPageId) ?? pages?.[0]
  const currentPagePath = currentPage ? getPagePath(currentPage) : '/'

  const liveUrl = publishedUrl || (slug ? `https://vibeyfunnels.com/${slug}` : null)

  const handlePublish = useCallback(async () => {
    setPublishing(true)
    try {
      const result = await backendPost<{ status: string; slug: string; url?: string }>(
        `/api/funnels/${funnelId}/publish`,
        {},
      )
      onStatusChange(result.status ?? 'published', result.slug ?? slug, result.url)
    } catch (err) {
      console.error('Failed to publish funnel:', err)
      toast.error(STUDIO_INLINE_ERRORS.PUBLISH_FUNNEL)
    } finally {
      setPublishing(false)
    }
  }, [funnelId, slug, onStatusChange])

  const handleUnpublish = useCallback(async () => {
    setPublishing(true)
    try {
      const result = await backendPost<{ status: string; slug: string }>(
        `/api/funnels/${funnelId}/unpublish`,
        {},
      )
      onStatusChange(result.status ?? 'draft', result.slug ?? slug, undefined)
    } catch (err) {
      console.error('Failed to unpublish funnel:', err)
      toast.error(STUDIO_INLINE_ERRORS.UNPUBLISH_FUNNEL)
    } finally {
      setPublishing(false)
    }
  }, [funnelId, slug, onStatusChange])

  const handleCopyUrl = useCallback(async () => {
    if (!liveUrl) return
    try {
      await navigator.clipboard.writeText(liveUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = liveUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [liveUrl])

  const ActiveViewportIcon = VIEWPORT_OPTIONS.find((o) => o.id === viewport)?.icon ?? Monitor
  const activeViewportLabel = VIEWPORT_OPTIONS.find((o) => o.id === viewport)?.label ?? 'Desktop'

  const showFullModeChrome = funnelFullMode
  const showPagePicker = !hidePagePicker && !showFullModeChrome
  const useCompactToolbarLayout = showFullModeChrome || hidePagePicker
  const fullModeEditMode = useFunnelFullModeStore((s) => s.mode)
  const fullModePagesOpen = useFunnelFullModeStore((s) => s.pagesOpen)
  const setFullModeEditMode = useFunnelFullModeStore((s) => s.setMode)
  const toggleFullModePages = useFunnelFullModeStore((s) => s.togglePages)

  useEffect(() => {
    if (!showPagePicker) setPageDropdownOpen(false)
  }, [showPagePicker])

  return (
    <>
      <div
        ref={toolbarRef}
        className={
          useCompactToolbarLayout
            ? 'group/funnel-toolbar flex min-w-0 shrink-0 items-center gap-2 px-3 py-2'
            : 'group/funnel-toolbar grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 px-3 py-2'
        }
      >
        <div
          className={
            useCompactToolbarLayout
              ? 'flex min-w-0 flex-1 items-center gap-2 overflow-hidden'
              : 'flex min-w-0 max-w-full items-center gap-2 justify-self-start overflow-hidden'
          }
        >
          {leadingChrome}
          <span className="body-3 min-w-0 flex-1 truncate font-medium text-[var(--color-foreground)]">
            {funnelName}
          </span>
          <FunnelStatusGlassCapsule status={status} hoverVariant="funnel-toolbar" />
        </div>

        {showPagePicker && pages && pages.length > 0 ? (
          <div className="flex justify-center justify-self-center">
            <div className="relative">
              <button
                ref={pageBtnRef}
                type="button"
                onClick={() => setPageDropdownOpen((o) => !o)}
                className="chip-glass-neutral rounded-spacing-2 flex min-w-[140px] cursor-pointer items-center justify-between gap-1.5 px-2.5 py-1"
              >
                <span className="body-3 font-medium text-[var(--color-foreground)]">
                  {currentPagePath}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              </button>
              {pageDropdownOpen &&
                createPortal(
                  <div
                    data-page-dropdown
                    className="surface-card border-border z-dropdown rounded-spacing-3 fixed min-w-[200px] border p-1 shadow-lg"
                    style={{
                      top: pageDropdownPosition.top,
                      left: pageDropdownPosition.left,
                    }}
                  >
                    {pages.map((page) => {
                      const path = getPagePath(page)
                      const isActive = page.id === currentPageId
                      return (
                        <button
                          key={page.id}
                          type="button"
                          onClick={() => {
                            onPageChange?.(page.id)
                            setPageDropdownOpen(false)
                          }}
                          className={`body-3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors ${
                            isActive
                              ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
                              : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]'
                          }`}
                        >
                          <span className="min-w-0 truncate font-mono">{path}</span>
                          <span className="min-w-0 flex-1 truncate text-[var(--color-muted-foreground)]">
                            {page.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>,
                  document.body,
                )}
            </div>
          </div>
        ) : null}

        <div
          className={
            useCompactToolbarLayout
              ? 'flex min-w-0 shrink-0 flex-nowrap items-center justify-end gap-1'
              : 'flex min-w-0 flex-nowrap items-center justify-end gap-1 justify-self-end'
          }
        >
          {showFullModeChrome ? (
            <>
              <PresentationEditModeToolbar
                mode={fullModeEditMode}
                thumbnailsOpen={fullModePagesOpen}
                onModeChange={setFullModeEditMode}
                onToggleThumbnails={toggleFullModePages}
                thumbnailsToggleLabel="Pages"
              />
              <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            </>
          ) : null}
          {historyChrome ? (
            <>
              {historyChrome}
              <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
            </>
          ) : null}
          <div className="relative shrink-0">
            <button
              ref={viewportBtnRef}
              type="button"
              onClick={() => setViewportDropdownOpen((o) => !o)}
              data-tooltip={activeViewportLabel}
              data-side="bottom"
              className="tooltip inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
              aria-label={`Preview size: ${activeViewportLabel}`}
              aria-expanded={viewportDropdownOpen}
              aria-haspopup="listbox"
            >
              <ActiveViewportIcon className="h-3.5 w-3.5 shrink-0" />
            </button>
            {viewportDropdownOpen &&
              createPortal(
                <div
                  data-viewport-dropdown
                  className="surface-card border-border z-dropdown rounded-spacing-3 fixed border p-1 shadow-lg"
                  style={{
                    top: viewportDropdownPos.top,
                    left: viewportDropdownPos.left,
                    width: VIEWPORT_DROPDOWN_WIDTH,
                  }}
                >
                  {VIEWPORT_OPTIONS.map((opt) => {
                    const isActive = opt.id === viewport
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onViewportChange(opt.id)
                          setViewportDropdownOpen(false)
                        }}
                        className={`body-3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors ${
                          isActive
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
                            : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]'
                        }`}
                      >
                        <opt.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>,
                document.body,
              )}
          </div>

          {trailingChrome}

          {publishAdjacentChrome ? (
            <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />
          ) : null}
          {publishAdjacentChrome}

          {publishLeadingChrome}

          {/* Publish (+ settings): rightmost */}
          <div className="relative flex items-stretch gap-1">
            <button
              ref={publishBtnRef}
              type="button"
              onClick={() => setPublishDropdownOpen((o) => !o)}
              disabled={publishing}
              data-tooltip={
                isCompact
                  ? publishing
                    ? 'Processing...'
                    : isPublished
                      ? 'Published'
                      : 'Publish'
                  : undefined
              }
              data-side={isCompact ? 'bottom' : undefined}
              className={`${isCompact ? 'tooltip' : ''} chip-glass-green rounded-spacing-2 flex items-center gap-1.5 px-2.5 transition-all disabled:opacity-50 ${
                isCompact ? 'h-7' : 'h-spacing-8'
              }`}
            >
              {publishing ? (
                <Loader2
                  className={`shrink-0 animate-spin ${isCompact ? 'h-3.5 w-3.5' : 'icon-sm'}`}
                />
              ) : (
                <Globe className={`shrink-0 ${isCompact ? 'h-3.5 w-3.5' : 'icon-sm'}`} />
              )}
              {!isCompact && (
                <>
                  <span className="body-3 font-medium">
                    {publishing ? 'Processing...' : isPublished ? 'Published' : 'Publish'}
                  </span>
                  <ChevronDown className="icon-sm shrink-0" />
                </>
              )}
            </button>
            {!hideFunnelSettingsButton ? (
              <button
                type="button"
                data-tooltip="Funnel settings"
                data-side="bottom-right"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('navigate-settings-section', {
                      detail: { section: 'funnel' as const, funnelId },
                    }),
                  )
                }
                className="tooltip chip-glass-neutral rounded-spacing-2 inline-flex h-7 w-7 shrink-0 items-center justify-center"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
              </button>
            ) : null}
            {publishDropdownOpen &&
              createPortal(
                <div
                  data-publish-dropdown
                  className="surface-card border-border z-dropdown fixed w-[320px] rounded-lg border p-2 shadow-lg"
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                  }}
                >
                  {!isPublished ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handlePublish()
                        setPublishDropdownOpen(false)
                      }}
                      disabled={publishing}
                      className="body-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] disabled:opacity-50"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Publish</span>
                    </button>
                  ) : (
                    <>
                      {liveUrl && (
                        <>
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                readOnly
                                value={liveUrl}
                                onFocus={(e) => e.currentTarget.select()}
                                className="h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 body-2 text-foreground w-full border outline-none"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleCopyUrl()
                                  setTimeout(() => setPublishDropdownOpen(false), 800)
                                }}
                                data-tooltip="Copy"
                                data-side="bottom"
                                className="tooltip rounded-spacing-2 flex-shrink-0 p-2 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                              >
                                {copied ? (
                                  <Check className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                              <a
                                href={liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setPublishDropdownOpen(false)}
                                data-tooltip="Open"
                                data-side="bottom"
                                className="tooltip rounded-spacing-2 flex-shrink-0 p-2 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </div>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPublishDropdownOpen(false)
                          setDomainModalOpen(true)
                        }}
                        disabled={publishing}
                        className="body-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)] disabled:opacity-50"
                      >
                        <Globe className="h-4 w-4" />
                        <span>Connect custom domain</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleUnpublish()
                          setPublishDropdownOpen(false)
                        }}
                        disabled={publishing}
                        className="body-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Globe className="h-4 w-4" />
                        <span>Unpublish</span>
                      </button>
                    </>
                  )}
                </div>,
                document.body,
              )}
          </div>
        </div>
      </div>

      <ConnectCustomDomainModal
        open={domainModalOpen}
        onClose={() => setDomainModalOpen(false)}
        title="Connect custom domain"
        onConnect={async (domainId) => {
          const result = await backendPost<ConnectFunnelDomainResult>(
            '/api/domains/connect-funnel',
            {
              domain_id: domainId,
              funnel_id: funnelId,
            },
          )
          onStatusChange(status, slug, result.published_url ?? publishedUrl ?? undefined)
          setDomainModalOpen(false)
        }}
      />
    </>
  )
}
