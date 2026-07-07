'use client'

import {
  Component,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AlertCircle, Download, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { createTsxRunnerScope } from '@/features/studio/lib/tsx-runner-scope'
import { useSelfHealingPreview } from '@/features/studio/lib/use-self-healing-preview'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'
import { downloadCSS, downloadHTML } from '../../utils/artifact-export'

// ============================================================================
// Types
// ============================================================================

export type ViewportSize = 'desktop' | 'tablet' | 'mobile'

interface SandpackPreviewProps {
  /** The TSX source code for the funnel page */
  code: string
  /** Optional CSS to include */
  css?: string
  /** Extra npm dependencies (name → version) */
  dependencies?: Record<string, string>
  /** Display name shown in toolbar */
  fileName?: string
  /** When 'presentation', UI renders slide scroller from iframe sections (not from generated code) */
  variant?: 'default' | 'presentation'
  /** Hide toolbar (fileName + viewport + download) — use when FunnelToolbar is shown above */
  hideDownload?: boolean
  /** Controlled viewport when hideDownload (from FunnelToolbar) */
  viewport?: ViewportSize
  /** Viewport change handler when controlled */
  onViewportChange?: (v: ViewportSize) => void
  /** Optional contract metadata from API preview normalization */
  contract?: {
    normalization_applied: string[]
    recovery_applied: string[]
    used_fallback: boolean
  }
}

const SAFE_FALLBACK_FUNNEL_TSX = `export default function FunnelPage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', background: '#0f1116', color: '#e5e7eb' }}>
      <section style={{ maxWidth: '720px', width: '100%', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', background: 'rgba(255,255,255,0.04)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>We are fixing this funnel page</h1>
        <p style={{ margin: 0, opacity: 0.86 }}>
          The generated code was invalid, so preview switched to a safe fallback.
          Regenerate the page to continue.
        </p>
      </section>
    </main>
  )
}`

function looksLikeInvalidGeneratedTsx(code: string): boolean {
  const source = code.trim()
  if (!source) return true
  if (/^@import\s+url\(/i.test(source)) return true
  if (/^(?::root|html|body|\.[\w-]+|#[\w-]+)\s*\{/.test(source)) return true
  if (/<style[\s>]/i.test(source)) return true
  if (/--[\w-]+\s*:\s*[^;]+;/.test(source) && !/export\s+default/.test(source)) return true
  const hasComponentSignature =
    /\bexport\s+default\b/.test(source) ||
    /\bfunction\s+[A-Z][A-Za-z0-9_]*\s*\(/.test(source) ||
    /\bconst\s+[A-Z][A-Za-z0-9_]*\s*=/.test(source)
  if (!hasComponentSignature) return true
  return false
}

export function shouldUseSafeFallbackCode(
  code: string,
  _contract?: {
    normalization_applied: string[]
    recovery_applied: string[]
    used_fallback: boolean
  },
): boolean {
  return looksLikeInvalidGeneratedTsx(code)
}

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

// ============================================================================
// Error Boundary
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class SandpackErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
            <AlertCircle className="h-8 w-8 text-red-400/60" />
            <p className="body-3 text-[var(--color-muted-foreground)]">Preview failed to render</p>
            <p className="typo-caption text-[var(--color-muted-foreground)]/60 max-w-md text-center">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
          </div>
        )
      )
    }
    return this.props.children
  }
}

// ============================================================================
// Presentation slide nav — UI-based, reads sections from iframe (not from skill)
// ============================================================================

function PresentationSlideNav({ iframeRef }: { iframeRef: RefObject<HTMLIFrameElement | null> }) {
  const [slideCount, setSlideCount] = useState(0)
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc?.body) return
    const sections = [...doc.body.querySelectorAll<HTMLElement>('section')]
    setSlideCount(sections.length)
    if (sections.length < 2) return

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio <= 0.5) return
          const idx = sections.indexOf(entry.target as HTMLElement)
          if (idx >= 0) setCurrentSlide(idx)
        })
      },
      { threshold: [0.5], root: doc.scrollingElement as Element | null },
    )

    sections.forEach((section) => io.observe(section))
    return () => io.disconnect()
  }, [iframeRef, slideCount])

  const scrollToSlide = useCallback(
    (i: number) => {
      const doc = iframeRef.current?.contentDocument
      if (!doc?.body) return
      const sections = doc.body.querySelectorAll<HTMLElement>('section')
      const el = sections[i]
      if (el) {
        setCurrentSlide(i)
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    },
    [iframeRef],
  )

  if (slideCount < 2) return null

  return (
    <nav
      className="absolute right-3 top-1/2 z-50 flex -translate-y-1/2 flex-col gap-2"
      aria-label="Slide navigation"
    >
      {[...Array(slideCount)].map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => scrollToSlide(i)}
          className={`h-3 w-3 rounded-full transition-colors ${
            i === currentSlide
              ? 'w-4 bg-[var(--color-primary)]'
              : 'bg-[var(--color-foreground)]/20 hover:bg-[var(--color-foreground)]/40 w-3'
          }`}
          aria-label={`Go to slide ${i + 1}`}
        />
      ))}
    </nav>
  )
}

// ============================================================================
// Component
// ============================================================================

export function SandpackPreview({
  code,
  css,
  dependencies,
  fileName,
  variant = 'default',
  hideDownload = false,
  viewport: controlledViewport,
  onViewportChange,
  contract,
}: SandpackPreviewProps) {
  const [internalViewport, setInternalViewport] = useState<ViewportSize>('desktop')
  const viewport = controlledViewport ?? internalViewport
  const setViewport = onViewportChange ?? setInternalViewport
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const runnerRootRef = useRef<Root | null>(null)
  const [iframeReady, setIframeReady] = useState(false)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const scope = useMemo(() => createTsxRunnerScope(dependencies), [dependencies])
  const repairServiceUnavailableRef = useRef(false)
  const repairServiceWarnedRef = useRef(false)
  const shouldFallback = useCallback(
    (candidate: string) => shouldUseSafeFallbackCode(candidate, contract),
    [contract],
  )
  const repairCode = useCallback(
    async (brokenCode: string, error: string) => {
      if (contract?.used_fallback) return null
      if (repairServiceUnavailableRef.current) return null
      try {
        const res = await fetch('/api/tsx-repair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: brokenCode, error }),
        })
        if (!res.ok) {
          if (res.status === 503) {
            repairServiceUnavailableRef.current = true
            if (!repairServiceWarnedRef.current) {
              repairServiceWarnedRef.current = true
              console.warn(
                '[tsx-repair] Service unavailable, disabling further repair calls for this preview',
              )
            }
          }
          return null
        }
        const json = (await res.json()) as { code?: unknown; disabled?: unknown }
        if (json.disabled === true) {
          repairServiceUnavailableRef.current = true
          return null
        }
        return typeof json.code === 'string' ? json.code : null
      } catch {
        return null
      }
    },
    [contract?.used_fallback],
  )
  const { resolvedCode, status } = useSelfHealingPreview({
    code,
    shouldFallback,
    fallbackCode: SAFE_FALLBACK_FUNNEL_TSX,
    maxAttempts: 3,
    repairCode,
  })
  const { element, error } = useEsbuildRunner({ code: resolvedCode, scope })
  const iframeDoc = useMemo(
    () => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style id="vibey-preview-user-css"></style>
  <style>
    html, body, #vibey-preview-root { margin: 0; padding: 0; width: 100%; min-height: 100%; }
    body { overflow: auto; }
  </style>
  <script>
    document.addEventListener('click', function(e) {
      var a = e.target && e.target.closest && e.target.closest('a');
      if (!a || !a.href) return;
      try {
        var href = a.getAttribute('href') || '';
        var url = new URL(a.href, a.baseURI || document.baseURI);
        if (url.origin === window.location.origin || href.charAt(0) === '/') {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (_) {
        e.preventDefault();
      }
    }, true);
  </script>
</head>
<body>
  <div id="vibey-preview-root"></div>
</body>
</html>`,
    [],
  )
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const href = iframe.contentWindow?.location?.href ?? ''
    if (!href.startsWith('about:srcdoc')) {
      setIframeReady(false)
      iframe.srcdoc = iframeDoc
      return
    }
    setIframeReady(true)
  }, [iframeDoc])

  useEffect(() => {
    setRuntimeError(typeof error === 'string' ? error : null)
  }, [error])

  useEffect(() => {
    const canRenderPreview = status === 'ready' || status === 'fallback'
    if (!canRenderPreview || !iframeReady) return
    const doc = iframeRef.current?.contentDocument
    if (!doc) return

    const styleEl = doc.getElementById('vibey-preview-user-css')
    if (styleEl) styleEl.textContent = css ?? ''

    const mountEl = doc.getElementById('vibey-preview-root')
    if (!mountEl) return

    if (!runnerRootRef.current) {
      runnerRootRef.current = createRoot(mountEl)
    }
    runnerRootRef.current.render(<Fragment>{element}</Fragment>)
  }, [css, element, iframeReady, status])

  useEffect(() => {
    const holder = runnerRootRef
    return () => {
      const root = holder.current
      holder.current = null
      if (!root) return
      queueMicrotask(() => {
        root.unmount()
      })
    }
  }, [])

  const handleDownload = useCallback(
    async (type: 'tsx' | 'css' | 'html' | 'pdf') => {
      const title = fileName || 'funnel-page'
      try {
        if (type === 'tsx') {
          const blob = new Blob([resolvedCode], { type: 'text/plain' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${title.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.tsx`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          console.log(`Downloaded ${a.download}`)
        } else if (type === 'css' && css) {
          downloadCSS(css, title)
          console.log(`Downloaded ${title}.css`)
        } else if (type === 'html') {
          const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <title>${fileName || 'Funnel Page'}</title>
  <style>${css || ''}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    ${resolvedCode}
  </script>
</body>
</html>`
          downloadHTML(standalone, title)
          console.log(`Downloaded ${title}.html`)
        } else if (type === 'pdf') {
          const body = iframeRef.current?.contentDocument?.body ?? null
          if (!body) {
            console.error('Preview iframe not ready for PDF export')
            return
          }
          const html2pdf = (await import('html2pdf.js')).default
          const slug = title.toLowerCase().replace(/[^a-z0-9-]/g, '-')
          await html2pdf()
            .set({
              margin: 0,
              filename: `${slug}.pdf`,
              image: { type: 'png', quality: 1 },
              html2canvas: { scale: 2 },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            })
            ['from'](body)
            .save()
          console.log(`Downloaded ${title.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.pdf`)
        }
        setDownloadMenuOpen(false)
      } catch (err) {
        console.error('Download failed:', err)
        toast.error(STUDIO_INLINE_ERRORS.DOWNLOAD_FAILED)
      }
    },
    [resolvedCode, css, fileName],
  )
  const handleViewport = useCallback((v: ViewportSize) => setViewport(v), [setViewport])

  const previewShellRounding =
    variant === 'presentation' && hideDownload ? 'rounded-2xl' : 'rounded-tl-2xl'

  return (
    <SandpackErrorBoundary>
      <div
        className={`flex h-full flex-col overflow-hidden ${previewShellRounding} ${hideDownload ? 'min-h-0' : ''}`}
      >
        {!hideDownload && (
          <div className="border-b-glass flex items-center justify-between px-3 py-2">
            <span className="body-3 truncate font-medium text-[var(--color-foreground)]">
              {fileName ?? 'Preview'}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <ViewportButton
                  active={viewport === 'desktop'}
                  onClick={() => handleViewport('desktop')}
                  title="Desktop"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </ViewportButton>
                <ViewportButton
                  active={viewport === 'tablet'}
                  onClick={() => handleViewport('tablet')}
                  title="Tablet"
                >
                  <Tablet className="h-3.5 w-3.5" />
                </ViewportButton>
                <ViewportButton
                  active={viewport === 'mobile'}
                  onClick={() => handleViewport('mobile')}
                  title="Mobile"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </ViewportButton>
              </div>
              <div className="relative">
                <button
                  onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
                  className="flex items-center justify-center rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
                  title="Download code"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                {downloadMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => setDownloadMenuOpen(false)}
                    />
                    <div className="dropdown-glass absolute right-0 top-full z-[70] mt-1 min-w-[140px] py-1">
                      <button
                        onClick={() => handleDownload('tsx')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      >
                        <span>Download TSX</span>
                      </button>
                      {css && (
                        <button
                          onClick={() => handleDownload('css')}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                        >
                          <span>Download CSS</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload('html')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      >
                        <span>Download HTML</span>
                      </button>
                      <button
                        onClick={() => handleDownload('pdf')}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
                      >
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sandpack Preview — full width/height when hideDownload */}
        <div
          ref={previewContainerRef}
          className={`relative flex-1 overflow-hidden ${hideDownload ? 'min-h-0 w-full' : ''}`}
        >
          <div className="absolute inset-0 flex flex-col">
            <div
              className={`relative flex h-full flex-1 overflow-hidden ${
                viewport !== 'desktop'
                  ? 'rounded-2xl border border-[var(--color-border)]'
                  : variant === 'presentation' && hideDownload
                    ? 'rounded-2xl'
                    : ''
              }`}
              style={{
                width: VIEWPORT_WIDTHS[viewport],
                maxWidth: '100%',
                ...(viewport !== 'desktop' ? { margin: '0 auto' } : {}),
              }}
            >
              {status === 'validating' || status === 'fixing' ? (
                <div className="flex h-full w-full items-center justify-center gap-2 text-[var(--color-muted-foreground)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Preparing preview...</span>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  title={fileName ?? 'Preview'}
                  srcDoc={iframeDoc}
                  onLoad={handleIframeLoad}
                  sandbox="allow-scripts allow-same-origin"
                  className="h-full w-full border-0"
                  {...(variant === 'presentation' ? { 'data-presentation-export-iframe': '' } : {})}
                />
              )}
              {variant === 'presentation' && <PresentationSlideNav iframeRef={iframeRef} />}
              {runtimeError && (
                <div className="absolute bottom-2 left-2 right-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200">
                  {runtimeError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SandpackErrorBoundary>
  )
}

// ============================================================================
// Viewport Button (shared style)
// ============================================================================

function ViewportButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]'
          : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]'
      }`}
      title={title}
    >
      {children}
    </button>
  )
}
