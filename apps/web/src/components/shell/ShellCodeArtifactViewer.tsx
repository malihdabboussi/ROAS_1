'use client'

import { useMemo, useState } from 'react'
import { Code, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { CHAT_CODE_ARTIFACT_MESSAGES } from '@/components/chat/chat-code-artifact.messages.config'
import { ChatCodeArtifactCopyMenu } from '@/components/chat/ChatCodeArtifactCopyMenu'
import { ShellArtifactViewerPanel } from '@/components/shell/ShellArtifactViewerPanel'
import { HtmlMiniIframe } from '@/components/ui/HtmlMiniIframe'
import { Tooltip } from '@/components/ui/tooltip'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import {
  chatCodeArtifactLanguageFromMime,
  chatCodeArtifactLanguageLabel,
  downloadChatCodeArtifact,
  toChatCodePreviewSrcDoc,
} from '@/lib/chat/chat-code-artifact'
import { cn } from '@/lib/utils/cn'

export function ShellCodeArtifactViewer({ target }: { target: ShellArtifactViewerTarget }) {
  const language = chatCodeArtifactLanguageFromMime(target.mimeType) ?? 'html'
  const code = target.content ?? ''
  const [mode, setMode] = useState<'preview' | 'code'>('preview')
  const srcDoc = useMemo(() => toChatCodePreviewSrcDoc(code, language), [code, language])
  const languageLabel = chatCodeArtifactLanguageLabel(language)
  const lines = useMemo(() => code.split('\n'), [code])
  const downloadLabel =
    language === 'css'
      ? CHAT_CODE_ARTIFACT_MESSAGES.DOWNLOAD_CSS.message
      : language === 'svg'
        ? CHAT_CODE_ARTIFACT_MESSAGES.DOWNLOAD_SVG.message
        : CHAT_CODE_ARTIFACT_MESSAGES.DOWNLOAD_HTML.message

  return (
    <ShellArtifactViewerPanel
      target={target}
      showOpenTargets={false}
      titleVariant="plain"
      languageLabel={languageLabel}
      bodyClassName="overflow-hidden"
      leading={
        <div className="gap-spacing-1 flex shrink-0 items-center" role="group" aria-label="View">
          <Tooltip label={CHAT_CODE_ARTIFACT_MESSAGES.TOOLTIP_PREVIEW.message} side="bottom">
            <button
              type="button"
              onClick={() => setMode('preview')}
              aria-label={CHAT_CODE_ARTIFACT_MESSAGES.TOOLTIP_PREVIEW.message}
              aria-pressed={mode === 'preview'}
              className={cn(
                'btn-icon-bare rounded-lg border outline-none focus:outline-none focus-visible:outline-none',
                mode === 'preview'
                  ? 'card-glass-blue text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle border-transparent',
              )}
            >
              <Eye className="icon-sm" aria-hidden />
            </button>
          </Tooltip>
          <Tooltip label={CHAT_CODE_ARTIFACT_MESSAGES.TOOLTIP_CODE.message} side="bottom">
            <button
              type="button"
              onClick={() => setMode('code')}
              aria-label={CHAT_CODE_ARTIFACT_MESSAGES.TOOLTIP_CODE.message}
              aria-pressed={mode === 'code'}
              className={cn(
                'btn-icon-bare rounded-lg border outline-none focus:outline-none focus-visible:outline-none',
                mode === 'code'
                  ? 'card-glass-blue text-foreground'
                  : 'text-muted-foreground hover:bg-hover-subtle border-transparent',
              )}
            >
              <Code className="icon-sm" aria-hidden />
            </button>
          </Tooltip>
        </div>
      }
      actions={
        <ChatCodeArtifactCopyMenu
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(code)
              toast.success(CHAT_CODE_ARTIFACT_MESSAGES.COPY_SUCCESS.message)
            } catch {
              toast.error(CHAT_CODE_ARTIFACT_MESSAGES.COPY_ERROR.message)
            }
          }}
          onDownload={() => downloadChatCodeArtifact(code, target.title, language)}
          downloadLabel={downloadLabel}
        />
      }
    >
      {mode === 'preview' ? (
        <HtmlMiniIframe html={srcDoc} title={target.title} interactive className="bg-background" />
      ) : (
        <div className="flex min-h-full overflow-auto">
          <ol className="typo-caption text-muted-foreground py-spacing-4 pl-spacing-4 pr-spacing-3 select-none text-right">
            {lines.map((_, index) => (
              <li key={index} className="body-4">
                {index + 1}
              </li>
            ))}
          </ol>
          <pre className="body-4 text-foreground py-spacing-4 pr-spacing-4 min-w-0 flex-1 whitespace-pre-wrap break-words">
            {code}
          </pre>
        </div>
      )}
    </ShellArtifactViewerPanel>
  )
}
