'use client'

import { useCallback, useEffect, useRef } from 'react'
import { sendMessageStreaming } from '../services/chat.service'
import { useChatStore } from '../store/use-chat-store'
import { usePreviewErrorStore, type PreviewError } from '../store/use-preview-error-store'

const DEBOUNCE_MS = 4_000
const CODE_SNIPPET_LIMIT = 1500

function buildErrorFeedbackMessage(errors: PreviewError[]): string {
  const grouped = errors.reduce(
    (acc, e) => {
      const key = e.pageName ?? e.pageId ?? 'unknown page'
      if (!acc[key]) acc[key] = []
      acc[key].push(e)
      return acc
    },
    {} as Record<string, PreviewError[]>,
  )

  const lines: string[] = [
    '[SYSTEM: Preview Error Report — the generated code caused runtime errors in the browser preview. Fix the code and regenerate.]',
    '',
  ]

  for (const [page, pageErrors] of Object.entries(grouped)) {
    lines.push(`Page: "${page}"`)
    for (const err of pageErrors) {
      lines.push(`  - [${err.source}] ${err.message}`)
      if (err.stack) {
        const stackLines = err.stack.split('\n').slice(0, 5).join('\n    ')
        lines.push(`    Stack: ${stackLines}`)
      }
    }
    const withCode = pageErrors.find((e) => e.code)
    if (withCode?.code) {
      const snippet = withCode.code.slice(0, CODE_SNIPPET_LIMIT)
      lines.push(`  Generated code (first ${CODE_SNIPPET_LIMIT} chars):`)
      lines.push(`  \`\`\`tsx`)
      lines.push(`  ${snippet}`)
      lines.push(`  \`\`\``)
    }
    lines.push('')
  }

  lines.push(
    'Instructions: Identify the root cause (e.g. hooks inside conditionals, missing imports, invalid JSX). Regenerate the affected page(s) with corrected code.',
  )

  return lines.join('\n')
}

/**
 * Watches for unreported preview errors and auto-sends them to Vibey when the agent is idle.
 * Must be mounted once in a component that has access to the active campaign context.
 */
export function usePreviewErrorFeedback(campaignId: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const getUnreported = usePreviewErrorStore((s) => s.getUnreportedErrors)
  const markAllReported = usePreviewErrorStore((s) => s.markAllReported)

  const sendFeedback = useCallback(async () => {
    const chatState = useChatStore.getState()
    if (chatState.isStreaming) return
    if (!chatState.activeConversationId) return

    const unreported = getUnreported()
    if (unreported.length === 0) return

    markAllReported()

    const content = buildErrorFeedbackMessage(unreported)

    try {
      await sendMessageStreaming({
        conversation_id: chatState.activeConversationId,
        campaign_id: campaignId ?? undefined,
        content,
        suppressUserMessage: true,
      })
    } catch {
      // Best-effort — don't block UI
    }
  }, [campaignId, getUnreported, markAllReported])

  useEffect(() => {
    const unsub = usePreviewErrorStore.subscribe((state, prevState) => {
      const hasNew = state.errors.length > prevState.errors.length
      if (!hasNew) return

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const chatState = useChatStore.getState()
        if (chatState.isStreaming) {
          const unsubStream = useChatStore.subscribe((s) => {
            if (!s.isStreaming) {
              unsubStream()
              void sendFeedback()
            }
          })
        } else {
          void sendFeedback()
        }
      }, DEBOUNCE_MS)
    })

    return () => {
      unsub()
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sendFeedback])
}
