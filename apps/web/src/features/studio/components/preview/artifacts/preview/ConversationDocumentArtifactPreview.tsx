'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { normalizeDeliverableContent } from '@/components/deliverables/normalize-deliverable-content'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { extractMarkdownFromDocumentContent } from '@/features/studio/lib/document-content-markdown'
import { fetchDocument } from '@/features/studio/services/artifact-preview.service'
import type { ConversationDocument } from '@/features/studio/types'
import { AnimatedArtifactTitle } from './animated-artifact-title'

export function ConversationDocumentArtifactPreview({
  documentId,
  titleFallback,
  toolbarLeading,
  toolbarTrailing,
}: {
  documentId: string
  titleFallback?: string | null
  toolbarLeading?: ReactNode
  toolbarTrailing?: ReactNode
}) {
  const [doc, setDoc] = useState<ConversationDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDoc(null)
    setError(null)
    void fetchDocument(documentId)
      .then((d) => {
        if (!cancelled) setDoc(d)
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load document')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [documentId])

  const title = (doc?.title ?? titleFallback ?? 'Document').trim() || 'Document'
  const mdRaw = doc ? extractMarkdownFromDocumentContent(doc.content) : null
  const markdown = mdRaw && mdRaw.trim().length > 0 ? normalizeDeliverableContent(mdRaw) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {toolbarLeading}
          <AnimatedArtifactTitle text={title} className="body-3 text-foreground font-medium" />
        </div>
        {toolbarTrailing ? (
          <div className="flex shrink-0 items-center gap-1">{toolbarTrailing}</div>
        ) : null}
      </div>
      <div className="px-spacing-4 py-spacing-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <VibeyLoadingOrb size="sm" text="Loading document…" />
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <AlertCircle className="text-muted-foreground/40 h-8 w-8" />
            <p className="body-3 text-muted-foreground">{error}</p>
          </div>
        ) : markdown ? (
          <MarkdownRenderer className="body-2 max-w-none leading-relaxed">
            {markdown}
          </MarkdownRenderer>
        ) : (
          <p className="body-3 text-muted-foreground">No content to display</p>
        )}
      </div>
    </div>
  )
}
