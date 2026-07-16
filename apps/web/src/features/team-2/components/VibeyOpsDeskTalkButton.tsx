'use client'

import { MessageSquare } from 'lucide-react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { TEAM_OPS_DESK_MESSAGES } from '../config/messages.config'
import { buildOpsDeskTalkKickoffMessage } from '../lib/build-ops-desk-talk-kickoff'
import type { OpsDeskSummary } from '../lib/ops-desk-summary'

interface VibeyOpsDeskTalkButtonProps {
  awarenessContext: string
  firstName: string
  summary: OpsDeskSummary
}

export function VibeyOpsDeskTalkButton({
  awarenessContext,
  firstName,
  summary,
}: VibeyOpsDeskTalkButtonProps) {
  return (
    <button
      type="button"
      className="button-glass-accent body-3 gap-spacing-2 px-spacing-4 py-spacing-2 inline-flex w-fit items-center rounded-lg font-medium"
      onClick={() => {
        useGlobalChatStore.getState().seedComposer({
          content: buildOpsDeskTalkKickoffMessage({ firstName, summary }),
          agentKey: 'vibey',
          railIntent: 'new',
          workContext: {
            surface: 'team',
            teamOpsLabel: TEAM_OPS_DESK_MESSAGES.TALK_CONTEXT_LABEL,
            teamOpsAwarenessContext: awarenessContext,
          },
        })
      }}
    >
      <MessageSquare className="icon-sm" aria-hidden />
      {TEAM_OPS_DESK_MESSAGES.TALK_TO_VIBEY}
    </button>
  )
}
