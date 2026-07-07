'use client'

import { useMemo } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import { renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import { ChatMarkdownView } from '@/features/studio/components/chat/ChatMarkdownView'
import type { DocumentAttachment } from '../../types'
import {
  attachmentPrimaryUrl,
  inferChatAttachmentKind,
  type ChatAttachmentPreviewKind,
} from './chat-attachment-preview.utils'

interface ChatAttachmentPreviewsProps {
  documents: DocumentAttachment[]
  className?: string
  /** Smaller typography for tight surfaces (e.g. task activity file previews). */
  compact?: boolean
}

const COMPACT_MARKDOWN_OVERRIDES =
  '[&_h1]:!mt-2 [&_h1]:!mb-1.5 [&_h1]:!text-sm [&_h2]:!mt-1.5 [&_h2]:!mb-1 [&_h2]:!text-xs [&_h2]:!font-semibold [&_h3]:!mt-1 [&_h3]:!mb-1 [&_h3]:!text-xs [&_p]:!mb-1.5 [&_p]:!text-xs [&_p]:!leading-snug [&_li]:!text-xs [&_li]:!leading-snug [&_ul]:!mb-1.5 [&_ol]:!mb-1.5 [&_pre]:typo-caption [&_pre]:!mb-1.5 [&_pre]:!p-2 [&_blockquote]:!my-1.5 [&_hr]:!my-2 [&_table]:!text-xs'

function PreviewChrome({
  filename,
  kind,
  compact,
  children,
}: {
  filename: string
  kind: ChatAttachmentPreviewKind
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`surface-card border-border rounded-spacing-2 max-w-xs overflow-hidden border ${compact ? 'mt-0' : 'mt-spacing-2'}`}
    >
      <div
        className={
          compact
            ? 'border-border typo-caption text-muted-foreground px-spacing-2 py-spacing-1 flex items-center justify-between gap-1 border-b'
            : 'border-border body-5 text-muted-foreground px-spacing-2 py-spacing-1 flex items-center justify-between gap-1.5 border-b'
        }
      >
        <span className="text-foreground min-w-0 truncate font-medium" title={filename}>
          {filename}
        </span>
        {!compact ? (
          <span className="badge-glass badge-glass-muted badge-glass-sm shrink-0 text-[10px] uppercase">
            {kind}
          </span>
        ) : null}
      </div>
      <div className="p-spacing-1">{children}</div>
    </div>
  )
}

function JsonPreview({ text, compact }: { text: string; compact?: boolean }) {
  const formatted = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }, [text])
  return (
    <pre
      className={
        compact
          ? 'typo-caption text-foreground max-h-36 overflow-auto whitespace-pre-wrap break-all font-mono'
          : 'body-5 text-foreground max-h-36 overflow-auto whitespace-pre-wrap break-all font-mono'
      }
    >
      {formatted}
    </pre>
  )
}

function SinglePreview({ doc, compact }: { doc: DocumentAttachment; compact?: boolean }) {
  const kind = inferChatAttachmentKind(doc)
  const url = attachmentPrimaryUrl(doc)

  if (kind === 'image') {
    const src = url
    if (!src) {
      return (
        <PreviewChrome compact={compact} filename={doc.filename} kind={kind}>
          <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-4 text-center">
            No preview URL
          </p>
        </PreviewChrome>
      )
    }
    if (compact) {
      return (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-spacing-2 block max-w-[160px] overflow-hidden transition-opacity hover:opacity-90"
        >
          <img
            src={src}
            alt={doc.filename}
            className="block h-auto max-h-36 w-auto max-w-full object-cover"
          />
        </a>
      )
    }
    return (
      <PreviewChrome compact={compact} filename={doc.filename} kind={kind}>
        <a href={src} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={src}
            alt={doc.filename}
            className="rounded-spacing-1 max-h-36 w-full object-contain"
          />
        </a>
      </PreviewChrome>
    )
  }

  if (kind === 'video') {
    if (!url) {
      return (
        <PreviewChrome compact={compact} filename={doc.filename} kind={kind}>
          <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-4 text-center">
            No video URL
          </p>
        </PreviewChrome>
      )
    }
    return (
      <PreviewChrome compact={compact} filename={doc.filename} kind={kind}>
        <video
          src={url}
          controls
          className="rounded-spacing-1 max-h-40 w-full bg-black"
          playsInline
        >
          <track kind="captions" />
        </video>
      </PreviewChrome>
    )
  }

  if (kind === 'audio') {
    if (!url) {
      return (
        <PreviewChrome compact={compact} filename={doc.filename} kind={kind}>
          <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-4 text-center">
            No audio URL
          </p>
        </PreviewChrome>
      )
    }
    return (
      <PreviewChrome compact={compact} filename={doc.filename} kind={kind}>
        <audio src={url} controls className="w-full" preload="metadata" />
      </PreviewChrome>
    )
  }

  if (kind === 'pdf') {
    if (!url) {
      return (
        <PreviewChrome compact={compact} filename={doc.filename} kind="pdf">
          <p className="body-4 text-muted-foreground">Upload did not return a file URL.</p>
        </PreviewChrome>
      )
    }
    return (
      <PreviewChrome compact={compact} filename={doc.filename} kind="pdf">
        <iframe
          title={doc.filename}
          src={url}
          className="rounded-spacing-1 border-border bg-muted h-36 w-full border"
        />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="body-4 text-primary mt-spacing-2 inline-flex items-center gap-1 hover:underline"
        >
          <ExternalLink className="icon-xs" /> Open in new tab
        </a>
      </PreviewChrome>
    )
  }

  if (kind === 'json') {
    const text = doc.text ?? ''
    if (!text.trim() && url) {
      return (
        <PreviewChrome compact={compact} filename={doc.filename} kind="json">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center gap-2"
          >
            <ExternalLink className="icon-sm" /> Open JSON
          </a>
        </PreviewChrome>
      )
    }
    return (
      <PreviewChrome compact={compact} filename={doc.filename} kind="json">
        <JsonPreview text={text} compact={compact} />
      </PreviewChrome>
    )
  }

  if (kind === 'markdown') {
    const text = doc.text ?? ''
    if (!text.trim()) {
      return (
        <PreviewChrome compact={compact} filename={doc.filename} kind="markdown">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center gap-2"
            >
              <ExternalLink className="icon-sm" /> Open file
            </a>
          ) : (
            <p className="body-4 text-muted-foreground">No content to preview.</p>
          )}
        </PreviewChrome>
      )
    }
    const html = renderChatMarkdown(text)
    return (
      <PreviewChrome compact={compact} filename={doc.filename} kind="markdown">
        <ChatMarkdownView
          html={html}
          className={`${compact ? COMPACT_MARKDOWN_OVERRIDES : ''} max-h-36 overflow-auto`}
        />
      </PreviewChrome>
    )
  }

  if (kind === 'plaintext') {
    const text = doc.text ?? ''
    if (!text && url) {
      return (
        <PreviewChrome compact={compact} filename={doc.filename} kind="plaintext">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="button-glass-neutral body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center gap-2"
          >
            <ExternalLink className="icon-sm" /> Open file
          </a>
        </PreviewChrome>
      )
    }
    return (
      <PreviewChrome compact={compact} filename={doc.filename} kind="plaintext">
        <pre
          className={
            compact
              ? 'typo-caption text-foreground max-h-36 overflow-auto whitespace-pre-wrap break-words font-mono'
              : 'body-5 text-foreground max-h-36 overflow-auto whitespace-pre-wrap break-words font-mono'
          }
        >
          {text}
        </pre>
      </PreviewChrome>
    )
  }

  return (
    <PreviewChrome compact={compact} filename={doc.filename} kind="download">
      <div className="gap-spacing-2 py-spacing-2 flex flex-col items-center">
        <FileText className="text-muted-foreground icon-md" />
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="button-glass-primary body-3 rounded-spacing-2 px-spacing-4 py-spacing-2 inline-flex items-center gap-2"
          >
            <ExternalLink className="icon-sm" /> Download / open
          </a>
        ) : (
          <p className="body-4 text-muted-foreground text-center">
            No link available for this file.
          </p>
        )}
      </div>
    </PreviewChrome>
  )
}

export function ChatAttachmentPreviews({
  documents,
  className,
  compact = false,
}: ChatAttachmentPreviewsProps) {
  if (!documents.length) return null
  return (
    <div className={className ?? 'mt-spacing-2 space-y-spacing-2'}>
      {documents.map((doc, idx) => (
        <SinglePreview key={`${doc.filename}-${idx}`} doc={doc} compact={compact} />
      ))}
    </div>
  )
}
