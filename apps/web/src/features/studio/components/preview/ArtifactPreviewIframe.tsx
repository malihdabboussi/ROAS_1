'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ExternalLink, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { getArtifactSignedUrl } from '../../services/artifact-preview.service'

interface ArtifactPreviewIframeProps {
  /** Full storage path: {userId}/{campaignId}/funnel/pages/opt-in.tsx */
  filePath: string
  /** Display name for the artifact */
  fileName?: string
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export function ArtifactPreviewIframe({ filePath, fileName }: ArtifactPreviewIframeProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewport, setViewport] = useState<ViewportSize>('desktop')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getArtifactSignedUrl(filePath)
      .then((url) => {
        if (cancelled) return
        if (!url) {
          setError(STUDIO_INLINE_ERRORS.PREVIEW_URL_FAILED)
        } else {
          setSignedUrl(url)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.LOAD_PREVIEW)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filePath])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    )
  }

  if (error || !signedUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <AlertCircle className="text-[var(--color-muted-foreground)]/40 h-8 w-8" />
        <p className="body-3 text-[var(--color-muted-foreground)]">
          {error ?? 'Preview unavailable'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="border-b-glass flex items-center justify-between px-3 py-2">
        <span className="body-3 truncate font-medium text-[var(--color-foreground)]">
          {fileName ?? filePath.split('/').pop()}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewport('desktop')}
            className={`rounded-md p-1.5 transition-colors ${viewport === 'desktop' ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]'}`}
            title="Desktop"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={`rounded-md p-1.5 transition-colors ${viewport === 'tablet' ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]'}`}
            title="Tablet"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`rounded-md p-1.5 transition-colors ${viewport === 'mobile' ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]'}`}
            title="Mobile"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)]"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="bg-[var(--color-secondary)]/30 flex flex-1 items-start justify-center overflow-auto p-4">
        <iframe
          src={signedUrl}
          title={fileName ?? 'Artifact Preview'}
          sandbox="allow-scripts"
          className="rounded-lg border border-[var(--color-border)] bg-white shadow-lg transition-all duration-300"
          style={{
            width: VIEWPORT_WIDTHS[viewport],
            maxWidth: '100%',
            height: '100%',
            minHeight: '400px',
          }}
        />
      </div>
    </div>
  )
}
