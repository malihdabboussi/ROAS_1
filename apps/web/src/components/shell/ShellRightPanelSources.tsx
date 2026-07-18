'use client'

import { useMemo } from 'react'
import { ExternalLink, Link2 } from 'lucide-react'
import type { Message } from '@/lib/conversations'
import { extractConversationSourceRows } from './shell-conversation-summary'
import { SHELL_RIGHT_PANEL_MESSAGES } from './shell-right-panel.messages.config'

export function ShellRightPanelSources({ messages }: { messages: Message[] }) {
  const rows = useMemo(() => extractConversationSourceRows(messages), [messages])

  if (rows.length === 0) {
    return (
      <p className="body-3 text-muted-foreground">{SHELL_RIGHT_PANEL_MESSAGES.chatSourcesEmpty}</p>
    )
  }

  return (
    <ul className="space-y-spacing-1">
      {rows.map((row) => {
        const content = (
          <>
            <Link2 className="icon-sm text-muted-foreground shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="body-3 text-foreground truncate">{row.title}</p>
              <p className="body-4 text-muted-foreground capitalize">{row.kind}</p>
            </div>
            {row.href ? (
              <ExternalLink className="icon-sm text-muted-foreground shrink-0" aria-hidden />
            ) : null}
          </>
        )

        return (
          <li key={row.id}>
            {row.href ? (
              <a
                href={row.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-hover-subtle gap-spacing-2 px-spacing-2 py-spacing-2 flex items-center rounded-lg"
              >
                {content}
              </a>
            ) : (
              <div className="gap-spacing-2 px-spacing-2 py-spacing-2 flex items-center rounded-lg">
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
