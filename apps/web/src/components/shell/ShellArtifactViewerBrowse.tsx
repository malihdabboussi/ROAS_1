'use client'

import { GlobalArtifactsPage } from '@/features/artifacts/components/GlobalArtifactsPage'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { ShellArtifactViewerTarget } from '@/lib/artifacts'
import { ShellRightPanelFiles } from './ShellRightPanelFiles'

const EMPTY_MESSAGES: never[] = []

export function ShellArtifactViewerBrowse({
  view,
  target,
}: {
  view: 'library' | 'files'
  target: ShellArtifactViewerTarget
}) {
  const conversationId = target.conversationId
  const activeConversationId = useChatStore((state) => state.activeConversationId)
  const filesConversationId = conversationId || activeConversationId
  const messages = useChatStore((state) =>
    filesConversationId
      ? (state.messagesByConversation[filesConversationId] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES,
  )

  if (view === 'files' && filesConversationId) {
    return (
      <div className="p-spacing-3">
        <ShellRightPanelFiles conversationId={filesConversationId} messages={messages} />
      </div>
    )
  }

  return <GlobalArtifactsPage embedded initialFilter={view === 'files' ? 'files' : 'all'} />
}
