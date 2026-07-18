'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { SpaceChatAgentPicker } from '@/features/spaces/components/chat/SpaceChatAgentPicker'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { useShellStore } from './use-shell-store'

/** Agent picker for shell new-chat surfaces (greeting / empty drawer). */
export function ShellNewChatAgentBar() {
  const activeAgentKey = useGlobalChatStore((s) => s.activeAgentKey)
  const setActiveAgentKey = useGlobalChatStore((s) => s.setActiveAgentKey)
  const roster = useGlobalChatStore((s) => s.roster)
  const loadRoster = useGlobalChatStore((s) => s.loadRoster)
  const requestNewChat = useShellStore((s) => s.requestNewChat)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  const chatAgents = useMemo(
    () => roster.filter((entry) => entry.kind === 'agent' && Boolean(entry.agent_key?.trim())),
    [roster],
  )

  const handleAgentChange = useCallback(
    (agentKey: string) => {
      setActiveAgentKey(agentKey)
      setActiveConversationId(null)
      requestNewChat()
    },
    [requestNewChat, setActiveAgentKey, setActiveConversationId],
  )

  return (
    <div className="flex shrink-0 items-center px-3 py-2 md:px-4">
      <SpaceChatAgentPicker
        agents={chatAgents}
        value={activeAgentKey}
        onChange={handleAgentChange}
      />
    </div>
  )
}
