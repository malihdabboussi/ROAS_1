'use client'

import type { MouseEvent } from 'react'
import { Code, Download } from 'lucide-react'
import {
  chatCodeArtifactLanguageLabel,
  downloadChatCodeArtifact,
  openCodeArtifactInShell,
  type ChatCodeArtifactLanguage,
} from '@/lib/chat/chat-code-artifact'
import { CHAT_CODE_ARTIFACT_MESSAGES } from './chat-code-artifact.messages.config'

export function ChatCodeArtifactCard({
  title,
  language,
  code,
}: {
  title: string
  language: ChatCodeArtifactLanguage
  code: string
}) {
  const languageLabel = chatCodeArtifactLanguageLabel(language)
  const downloadLabel =
    language === 'css'
      ? CHAT_CODE_ARTIFACT_MESSAGES.DOWNLOAD_CSS.message
      : language === 'svg'
        ? CHAT_CODE_ARTIFACT_MESSAGES.DOWNLOAD_SVG.message
        : CHAT_CODE_ARTIFACT_MESSAGES.DOWNLOAD_HTML.message

  const openPreview = () => {
    openCodeArtifactInShell({ title, language, code })
  }

  const download = (event: MouseEvent) => {
    event.stopPropagation()
    downloadChatCodeArtifact(code, title, language)
  }

  return (
    <div className="border-border bg-card my-spacing-3 flex items-stretch overflow-hidden rounded-xl border">
      <button
        type="button"
        onClick={openPreview}
        className="gap-spacing-3 px-spacing-3 py-spacing-3 hover:bg-hover-subtle flex min-w-0 flex-1 items-center text-left transition-colors"
        aria-label={`${CHAT_CODE_ARTIFACT_MESSAGES.TOOLTIP_OPEN.message}: ${title}`}
        data-testid="chat-code-artifact-card"
      >
        <span className="bg-secondary h-spacing-8 w-spacing-8 flex shrink-0 items-center justify-center rounded-lg">
          <Code className="icon-sm text-muted-foreground" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="body-3 text-foreground block truncate font-medium">{title}</span>
          <span className="typo-caption text-muted-foreground">
            {CHAT_CODE_ARTIFACT_MESSAGES.CARD_KIND.message} · {languageLabel}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={download}
        className="body-4 text-foreground hover:bg-hover-subtle border-border px-spacing-3 shrink-0 border-l"
        aria-label={downloadLabel}
      >
        <span className="gap-spacing-1 flex items-center">
          <Download className="icon-sm text-muted-foreground" aria-hidden />
          {CHAT_CODE_ARTIFACT_MESSAGES.CARD_DOWNLOAD.message}
        </span>
      </button>
    </div>
  )
}
