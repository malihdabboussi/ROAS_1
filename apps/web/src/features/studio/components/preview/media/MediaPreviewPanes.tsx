'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Copy, Expand, File } from 'lucide-react'
import { toast } from 'sonner'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import {
  extractMarkdownFromDocumentContent,
  normalizeStoredMarkdownText,
} from '@/features/studio/lib/document-content-markdown'
import type { MediaAsset } from '@/lib/services/media-api'
import type { ConversationDocument } from '../../../types'
import { formatDate, isMarkdownMediaAsset } from './media-tab.utils'
import { MediaExportToolbar } from './MediaExportToolbar'

export function DocumentPreview({
  doc,
  campaignId,
}: {
  doc: ConversationDocument
  campaignId: string
}) {
  const normalizedMarkdown = extractMarkdownFromDocumentContent(doc.content)
  const markdownExportRef = useRef<HTMLDivElement>(null)
  const pdfUrl = doc.content?.file_url
  const displayTitle = doc.title ?? 'Untitled'

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="body-2 text-foreground mb-1 font-semibold">{displayTitle}</h2>
          <p className="typo-caption text-muted-foreground">{formatDate(doc.created_at)}</p>
        </div>
        <MediaExportToolbar
          campaignId={campaignId}
          title={displayTitle}
          markdownSource={pdfUrl ? null : normalizedMarkdown}
          markdownExportRef={pdfUrl ? null : normalizedMarkdown ? markdownExportRef : null}
          remotePdfUrl={pdfUrl ?? null}
        />
      </div>
      {pdfUrl ? (
        <div className="flex flex-1 flex-col gap-3">
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="border-border flex-1 rounded-lg border"
            style={{ minHeight: '500px' }}
            title={displayTitle}
          />
        </div>
      ) : normalizedMarkdown ? (
        <div ref={markdownExportRef}>
          <MarkdownRenderer>{normalizedMarkdown}</MarkdownRenderer>
        </div>
      ) : (
        <div className="typo-caption bg-muted/30 text-muted-foreground rounded-lg p-4">
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(doc.content, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export function ImagePreview({ asset, campaignId }: { asset: MediaAsset; campaignId: string }) {
  const url = asset.public_url ?? ''
  const prompt = asset.source_prompt ?? asset.name
  const displayTitle = asset.source_prompt ?? asset.name ?? 'Image'
  const visualExportRef = useRef<HTMLDivElement>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setCopyStatus('copied')
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        setCopyStatus('copied')
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.COPY_FAILED)
        setCopyStatus('error')
      }
    }
    setTimeout(() => setCopyStatus('idle'), 2000)
  }, [url])

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="typo-caption text-muted-foreground">{formatDate(asset.created_at)}</p>
          <MediaExportToolbar
            campaignId={campaignId}
            title={displayTitle}
            markdownSource={null}
            markdownExportRef={null}
            visualExportRef={visualExportRef}
            originalFileUrl={url || null}
            originalFilename={asset.original_filename}
          >
            <Tooltip label="Full preview" side="bottom">
              <button
                type="button"
                onClick={() => window.open(url, '_blank')}
                className="btn-icon-glass"
              >
                <Expand className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip label={copyStatus === 'copied' ? 'Copied!' : 'Copy image'} side="bottom">
              <button type="button" onClick={handleCopy} className="btn-icon-glass">
                <Copy className="h-4 w-4" />
              </button>
            </Tooltip>
          </MediaExportToolbar>
        </div>
        <div ref={visualExportRef} className="flex flex-col gap-4">
          <img
            src={url}
            alt={asset.name}
            className="rounded-spacing-4 max-h-[70vh] w-full max-w-2xl object-contain"
          />
          {prompt && (
            <div className="card-glass rounded-spacing-3 px-spacing-4 overflow-hidden py-3">
              <p className="typo-caption text-muted-foreground mb-2 font-semibold uppercase">
                Prompt
              </p>
              <p className="body-3 text-foreground whitespace-pre-wrap">{prompt}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function VideoPreview({ asset, campaignId }: { asset: MediaAsset; campaignId: string }) {
  const url = asset.public_url ?? ''
  const prompt = asset.source_prompt ?? asset.name
  const displayTitle = asset.source_prompt ?? asset.name ?? 'Video'
  const visualExportRef = useRef<HTMLDivElement>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleCopy = useCallback(async () => {
    try {
      const res = await fetch(url, { mode: 'cors' })
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setCopyStatus('copied')
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        setCopyStatus('copied')
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.COPY_FAILED)
        setCopyStatus('error')
      }
    }
    setTimeout(() => setCopyStatus('idle'), 2000)
  }, [url])

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="typo-caption text-muted-foreground">{formatDate(asset.created_at)}</p>
          <MediaExportToolbar
            campaignId={campaignId}
            title={displayTitle}
            markdownSource={null}
            markdownExportRef={null}
            visualExportRef={visualExportRef}
            originalFileUrl={url || null}
            originalFilename={asset.original_filename}
          >
            <Tooltip label="Full preview" side="bottom">
              <button
                type="button"
                onClick={() => window.open(url, '_blank')}
                className="btn-icon-glass"
              >
                <Expand className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip label={copyStatus === 'copied' ? 'Copied!' : 'Copy video'} side="bottom">
              <button type="button" onClick={handleCopy} className="btn-icon-glass">
                <Copy className="h-4 w-4" />
              </button>
            </Tooltip>
          </MediaExportToolbar>
        </div>
        <div ref={visualExportRef} className="flex flex-col gap-4">
          <video src={url} controls className="rounded-spacing-4 max-h-[70vh] w-full max-w-2xl" />
          {prompt && (
            <div className="card-glass rounded-spacing-3 px-spacing-4 overflow-hidden py-3">
              <p className="typo-caption text-muted-foreground mb-2 font-semibold uppercase">
                Prompt
              </p>
              <p className="body-3 text-foreground whitespace-pre-wrap">{prompt}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function AudioPreview({ asset, campaignId }: { asset: MediaAsset; campaignId: string }) {
  const url = asset.public_url ?? ''
  const prompt = asset.source_prompt ?? asset.name
  const displayTitle = asset.source_prompt ?? asset.name ?? 'Audio'

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <p className="typo-caption text-muted-foreground">{formatDate(asset.created_at)}</p>
          <MediaExportToolbar
            campaignId={campaignId}
            title={displayTitle}
            markdownSource={null}
            markdownExportRef={null}
            originalFileUrl={url || null}
            originalFilename={asset.original_filename}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="card-glass rounded-spacing-4 px-spacing-4 overflow-hidden py-4">
            <audio src={url} controls className="w-full" preload="metadata" />
          </div>
          <div className="typo-caption text-muted-foreground flex items-center gap-2">
            <span>{asset.mime_type}</span>
            <span>&middot;</span>
            <span>
              {asset.file_size < 1024 * 1024
                ? `${(asset.file_size / 1024).toFixed(1)} KB`
                : `${(asset.file_size / (1024 * 1024)).toFixed(1)} MB`}
            </span>
          </div>
          {prompt && (
            <div className="card-glass rounded-spacing-3 px-spacing-4 overflow-hidden py-3">
              <p className="typo-caption text-muted-foreground mb-2 font-semibold uppercase">
                Source
              </p>
              <p className="body-3 text-foreground whitespace-pre-wrap">{prompt}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function FilePreview({ asset, campaignId }: { asset: MediaAsset; campaignId: string }) {
  const url = asset.public_url ?? ''
  const isPdf = asset.mime_type === 'application/pdf'
  const isMd = isMarkdownMediaAsset(asset)
  const [mdText, setMdText] = useState<string | null>(null)
  const [mdLoading, setMdLoading] = useState(isMd && Boolean(url))
  const markdownExportRef = useRef<HTMLDivElement>(null)
  const displayTitle = asset.source_prompt ?? asset.name ?? 'File'
  const mdPlain = mdText !== null ? (normalizeStoredMarkdownText(mdText) ?? mdText) : null

  useEffect(() => {
    if (!isMd || !url) {
      setMdText(null)
      setMdLoading(false)
      return
    }
    setMdLoading(true)
    setMdText(null)
    let cancelled = false
    void fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) {
          setMdText(text)
          setMdLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMdText(null)
          setMdLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isMd, url, asset.id])

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="body-2 text-foreground font-semibold">{asset.name}</h2>
            <p className="typo-caption text-muted-foreground">{formatDate(asset.created_at)}</p>
          </div>
          <MediaExportToolbar
            campaignId={campaignId}
            title={displayTitle}
            markdownSource={isMd && mdPlain ? mdPlain : null}
            markdownExportRef={isMd && mdPlain ? markdownExportRef : null}
            remotePdfUrl={isPdf ? url : null}
            remotePdfFilename={asset.original_filename}
            originalFileUrl={url || null}
            originalFilename={asset.original_filename}
          >
            <Tooltip label="Open" side="bottom">
              <button
                type="button"
                onClick={() => window.open(url, '_blank')}
                className="btn-icon-glass"
              >
                <Expand className="h-4 w-4" />
              </button>
            </Tooltip>
          </MediaExportToolbar>
        </div>
        <div className="typo-caption text-muted-foreground flex items-center gap-2">
          <span>{asset.mime_type}</span>
          <span>&middot;</span>
          <span>
            {asset.file_size < 1024 * 1024
              ? `${(asset.file_size / 1024).toFixed(1)} KB`
              : `${(asset.file_size / (1024 * 1024)).toFixed(1)} MB`}
          </span>
        </div>
        {isPdf ? (
          <iframe
            src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="border-border flex-1 rounded-lg border"
            style={{ minHeight: '500px' }}
            title={asset.name}
          />
        ) : isMd ? (
          mdLoading ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <VibeyLoadingOrb size="sm" text="Loading preview…" />
            </div>
          ) : mdText !== null ? (
            <div
              ref={markdownExportRef}
              className="border-border card-glass rounded-spacing-4 p-spacing-5 max-w-3xl border"
            >
              <MarkdownRenderer className="body-3 text-foreground max-w-none">
                {mdPlain ?? mdText}
              </MarkdownRenderer>
            </div>
          ) : (
            <div className="card-glass rounded-spacing-4 flex flex-col items-center justify-center gap-3 py-12">
              <File className="text-muted-foreground/30 h-12 w-12" />
              <p className="body-3 text-muted-foreground text-center">
                Preview unavailable. Open or download the file.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download={asset.original_filename}
                className="button-glass-accent mt-2 rounded-lg px-4 py-2 text-sm font-medium"
              >
                Download
              </a>
            </div>
          )
        ) : (
          <div className="card-glass rounded-spacing-4 flex flex-col items-center justify-center gap-3 py-12">
            <File className="text-muted-foreground/30 h-12 w-12" />
            <p className="body-3 text-muted-foreground">{asset.original_filename}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download={asset.original_filename}
              className="button-glass-accent mt-2 rounded-lg px-4 py-2 text-sm font-medium"
            >
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
