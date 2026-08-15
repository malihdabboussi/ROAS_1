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
    <ul>
      {rows.map((row) => {
        // Single line: the link icon already says what `kind` said, and the
        // title carries the only detail worth scanning.
        const content = (
          <>
            <Link2 className="icon-sm text-muted-foreground shrink-0" aria-hidden />
            <span className="body-3 text-foreground min-w-0 flex-1 truncate">{row.title}</span>
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
                title={row.title}
                className="hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-1-5 flex items-center rounded-lg transition-colors"
              >
                {content}
              </a>
            ) : (
              <div
                title={row.title}
                className="gap-spacing-2 px-spacing-3 py-spacing-1-5 flex items-center rounded-lg"
              >
                {content}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
