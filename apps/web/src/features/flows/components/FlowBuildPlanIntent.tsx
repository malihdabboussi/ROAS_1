'use client'

import { useMemo } from 'react'
import { ChatMarkdownView } from '@/features/studio/components/chat/ChatMarkdownView'
import { normalizeFlowBuildPlanIntentForDisplay } from '@/lib/flows/flow-build-plan-intent.utils'
import { renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import { cn } from '@/lib/utils/cn'

export function FlowBuildPlanIntent({ intent }: { intent: string }) {
  const html = useMemo(
    () => renderChatMarkdown(normalizeFlowBuildPlanIntentForDisplay(intent)),
    [intent],
  )

  return (
    <ChatMarkdownView
      html={html}
      className={cn(
        'body-3 text-muted-foreground',
        '[&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground',
        '[&_a]:text-primary',
      )}
    />
  )
}
