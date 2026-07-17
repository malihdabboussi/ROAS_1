'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileText, Maximize2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { SpaceDocGoogleExportButton } from '@/components/deliverables/SpaceDocGoogleExportButton'
import { VisualDocFullMode } from '@/components/deliverables/VisualDocFullMode'
import { DocEditorProseStyles, DriveDocViewer, VisualDocView } from '@/components/spaces'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { fetchDocument } from '@/lib/artifacts'
import { extractMarkdownFromDocumentContent } from '@/lib/content/document-content-markdown'
import { markdownToHtml } from '@/lib/content/markdown-to-html'
import {
  editorFontFamilyForStyle,
  editorFontSizePxForSize,
  exportSpaceDocVisualPdf,
  fetchSpaceItem,
  fetchSpaceItemById,
  getDocCustomDataRecord,
  hashDocSource,
  parseDocEditorUiFromCustomData,
  visualizeSpaceDoc,
  type DocViewMode,
  type SpaceItem,
} from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

function resolveDocBodyForPreview(item: SpaceItem): string {
  const raw = item.doc_body ?? item.notes ?? ''
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  return markdownToHtml(raw) ?? raw
}

function conversationDocumentIdFromCustomData(customData: Record<string, unknown>): string | null {
  const id = customData._conversation_document_id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

async function resolveConversationDocumentBody(
  customData: Record<string, unknown>,
): Promise<string> {
  const documentId = conversationDocumentIdFromCustomData(customData)
  if (!documentId) return ''
  const doc = await fetchDocument(documentId)
  const markdown = extractMarkdownFromDocumentContent(doc.content)
  return markdown ? (markdownToHtml(markdown) ?? markdown) : ''
}

function slugifyVisualDocFilename(title: string | null | undefined): string {
  const s = (title ?? 'visual-doc')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return s.slice(0, 80) || 'visual-doc'
}

export function SpaceDocDeliverablePreview({
  spaceId,
  itemId,
  title,
}: {
  spaceId: string
  itemId: string
  title?: string | null
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docBody, setDocBody] = useState('')
  const [customData, setCustomData] = useState<Record<string, unknown>>({})
  const [loadedItem, setLoadedItem] = useState<SpaceItem | null>(null)
  const [docViewMode, setDocViewMode] = useState<DocViewMode>('doc')
  const [visualizing, setVisualizing] = useState(false)
  const [exportingVisualPdf, setExportingVisualPdf] = useState(false)
  const [visualFullModeOpen, setVisualFullModeOpen] = useState(false)
  const [currentDocBodyHash, setCurrentDocBodyHash] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setDocViewMode('doc')
    void fetchSpaceItemById(itemId, title)
      .catch(() => fetchSpaceItem(spaceId, itemId))
      .then(async (item) => {
        if (cancelled) return
        const custom = getDocCustomDataRecord(item.custom_data)
        const resolvedBody = resolveDocBodyForPreview(item)
        setLoadedItem(item)
        setCustomData(custom)
        if (resolvedBody) {
          setDocBody(resolvedBody)
          return
        }
        const conversationBody = await resolveConversationDocumentBody(custom).catch(() => '')
        if (!cancelled) setDocBody(conversationBody)
      })
      .catch((cause) => {
        if (cancelled) return
        const errMsg = cause instanceof Error ? cause.message : String(cause)
        setError(errMsg)
        setLoadedItem(null)
        setDocBody('')
        setCustomData({})
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [spaceId, itemId, title])

  const {
    docFontStyle,
    docFontSize,
    docFullWidth,
    isDriveDoc,
    driveFileId,
    driveModifiedTime,
    driveWebViewLink,
    docVisualHtml,
    docVisualStatus,
    docVisualSourceHash,
    docVisualLastError,
    docVisualPresentationId,
  } = useMemo(() => parseDocEditorUiFromCustomData(customData), [customData])
  const visualHtml = typeof docVisualHtml === 'string' && docVisualHtml.trim() ? docVisualHtml : null

  useEffect(() => {
    let cancelled = false
    void hashDocSource(docBody).then((hash) => {
      if (!cancelled) setCurrentDocBodyHash(hash)
    })
    return () => {
      cancelled = true
    }
  }, [docBody])

  useEffect(() => {
    if (!visualFullModeOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setVisualFullModeOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visualFullModeOpen])

  const hasDocBody = docBody.trim().length > 0
  const isVisualizing = visualizing || docVisualStatus === 'generating'

  const runVisualize = useCallback(
    async (opts?: { prompt?: string }) => {
      const target = loadedItem
      if (!target) return
      setVisualizing(true)
      try {
        const input: { force: true; prompt?: string } = { force: true }
        if (opts?.prompt?.trim()) input.prompt = opts.prompt.trim()
        const result = await visualizeSpaceDoc(target.space_id, target.id, input)
        setCustomData(getDocCustomDataRecord(result.custom_data))
        toast.success('Visual doc is ready.')
      } catch (cause) {
        toast.error(sanitizeUserError(cause, "I couldn't visualize this doc."))
      } finally {
        setVisualizing(false)
      }
    },
    [loadedItem],
  )

  const downloadVisualHtmlFile = useCallback(() => {
    if (!visualHtml) return
    const blob = new Blob([visualHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugifyVisualDocFilename(title ?? loadedItem?.title)}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [loadedItem?.title, title, visualHtml])

  const openVisualFullMode = useCallback(() => {
    const presentationId = docVisualPresentationId?.trim()
    const target = loadedItem
    if (presentationId && target) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vibey-open-artifact', {
            detail: {
              artifactType: 'presentation',
              artifactId: presentationId,
              spaceId: target.space_id,
              name: title ?? target.title ?? 'Visual presentation',
            },
          }),
        )
      }
      return
    }
    setVisualFullModeOpen(true)
  }, [docVisualPresentationId, loadedItem, title])

  const downloadVisualPdfFile = useCallback(async () => {
    if (!visualHtml || exportingVisualPdf) return
    setExportingVisualPdf(true)
    try {
      await exportSpaceDocVisualPdf({
        title: title ?? loadedItem?.title ?? 'visual-doc',
        visualHtml,
      })
    } finally {
      setExportingVisualPdf(false)
    }
  }, [exportingVisualPdf, loadedItem?.title, title, visualHtml])

  if (loading) {
    return (
      <div className="gap-spacing-4 py-spacing-16 flex min-h-0 flex-1 flex-col items-center justify-center">
        <VibeyChatOrb className="h-14 w-14" state="thinking" />
      </div>
    )
  }

  if (error) {
    return <div className="body-2 text-muted-foreground">{error}</div>
  }

  if (isDriveDoc && driveFileId) {
    return (
      <div className="flex min-h-[min(70vh,40rem)] flex-1 flex-col">
        <DriveDocViewer
          key={`${itemId}:${driveFileId}`}
          driveFileId={driveFileId}
          modifiedTime={driveModifiedTime}
          webViewLink={driveWebViewLink}
        />
      </div>
    )
  }

  const visualChromeIconBtnClass =
    'inline-flex shrink-0 items-center rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground'

  return (
    <div className="gap-spacing-3 flex min-h-[min(70vh,44rem)] flex-1 flex-col">
      <DocEditorProseStyles
        editorFontSizePx={editorFontSizePxForSize(docFontSize)}
        editorFontFamily={editorFontFamilyForStyle(docFontStyle)}
        docFullWidth={docFullWidth}
      />
      <div className="gap-spacing-2 flex min-w-0 shrink-0 items-center">
        <div role="tablist" className="gap-spacing-1 flex min-w-0 flex-1 items-center">
          {(['doc', 'visual'] as const).map((mode) => {
            const selected = docViewMode === mode
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setDocViewMode(mode)}
                className={cn(
                  'px-spacing-2 py-spacing-2 hover:bg-hover-subtle relative flex min-w-0 shrink-0 items-center rounded-md text-xs font-medium transition-colors',
                  selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode === 'doc' ? 'Doc' : 'Visual'}
                {selected ? (
                  <span className="bg-foreground absolute bottom-0 left-2 right-2 h-0.5 rounded-full" />
                ) : null}
              </button>
            )
          })}
        </div>

        {docViewMode === 'doc' && hasDocBody ? (
          <SpaceDocGoogleExportButton
            spaceId={loadedItem?.space_id ?? spaceId}
            itemId={loadedItem?.id ?? itemId}
            title={title?.trim() || loadedItem?.title?.trim() || 'Untitled'}
            docBody={docBody}
            customData={customData}
            onCustomDataChanged={setCustomData}
          />
        ) : null}

        {docViewMode === 'visual' ? (
          <div className="gap-spacing-1 flex shrink-0 items-center">
            {visualHtml ? (
              <>
                <Tooltip
                  label={docVisualPresentationId ? 'Open Design' : 'Full mode'}
                  side="bottom"
                >
                  <span className="inline-flex">
                    <button
                      type="button"
                      className={visualChromeIconBtnClass}
                      onClick={openVisualFullMode}
                      aria-label={
                        docVisualPresentationId
                          ? 'Open linked presentation Design mode'
                          : 'Open visual doc full mode'
                      }
                    >
                      <Maximize2 className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </span>
                </Tooltip>
                <Tooltip label="Download HTML" side="bottom">
                  <span className="inline-flex">
                    <button
                      type="button"
                      className={visualChromeIconBtnClass}
                      onClick={downloadVisualHtmlFile}
                      aria-label="Download visual doc as HTML"
                    >
                      <Download className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </span>
                </Tooltip>
                <Tooltip label="Download PDF" side="bottom">
                  <span className="inline-flex">
                    <button
                      type="button"
                      className={visualChromeIconBtnClass}
                      onClick={() => void downloadVisualPdfFile()}
                      disabled={exportingVisualPdf}
                      aria-label="Download visual doc as PDF"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                    </button>
                  </span>
                </Tooltip>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void runVisualize()}
              disabled={isVisualizing || (!visualHtml && !hasDocBody)}
              className="badge-glass badge-glass-green body-3 rounded-spacing-2 h-spacing-7 inline-flex shrink-0 items-center gap-1 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isVisualizing ? <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
              {visualHtml ? 'Re-visualize' : 'Visualize'}
            </button>
          </div>
        ) : null}
      </div>

      {docViewMode === 'visual' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <VisualDocView
            html={visualHtml}
            status={docVisualStatus}
            sourceHash={docVisualSourceHash}
            currentDocBodyHash={currentDocBodyHash}
            hasDocBody={hasDocBody}
            lastError={docVisualLastError}
            onVisualize={runVisualize}
            isVisualizing={isVisualizing}
          />
        </div>
      ) : (
        <div className="doc-editor-surface min-h-0 flex-1 overflow-y-auto">
          {hasDocBody ? (
            <div className="ProseMirror" dangerouslySetInnerHTML={{ __html: docBody }} />
          ) : (
            <div className="gap-spacing-3 flex min-h-0 flex-1 flex-col items-center justify-center text-center">
              <p className="body-3 text-muted-foreground max-w-md">
                This document does not have an editable doc body saved. Its content is available in
                the Visual tab.
              </p>
              {visualHtml ? (
                <button
                  type="button"
                  onClick={() => setDocViewMode('visual')}
                  className="badge-glass badge-glass-green body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 inline-flex shrink-0 items-center font-semibold transition-opacity hover:opacity-90"
                >
                  Open Visual
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}

      <VisualDocFullMode
        html={visualHtml}
        open={visualFullModeOpen}
        onClose={() => setVisualFullModeOpen(false)}
        closeButtonClassName={visualChromeIconBtnClass}
      />
    </div>
  )
}
