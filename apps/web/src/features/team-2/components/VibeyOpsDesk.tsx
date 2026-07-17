'use client'

import { useEffect, useMemo, useState } from 'react'
import { useGlobalChatStore } from '@/components/global-chat/store/use-global-chat-store'
import { AwarenessToggle } from '@/features/mission-control/components/AwarenessToggle'
import type { MissionAgent } from '@/lib/agents'
import type { Mission } from '@/lib/missions'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import { createClient } from '@/lib/supabase/client'
import { resolveUserDisplayName } from '@/lib/user-display'
import { TEAM_OPS_DESK_MESSAGES } from '../config/messages.config'
import { buildTeamOpsAwarenessContext } from '../lib/build-team-ops-awareness-context'
import {
  buildOpsDeskSummary,
  firstNameFromDisplayName,
} from '../lib/ops-desk-summary'
import { VibeyOpsDeskBriefing } from './VibeyOpsDeskBriefing'
import { VibeyOpsDeskTalkButton } from './VibeyOpsDeskTalkButton'
import type { Team2StatusFilter } from './Team2Toolbar'

interface VibeyOpsDeskProps {
  agents: MissionAgent[]
  missions: Mission[]
  floor: React.ReactNode
  statusFilters?: Team2StatusFilter[]
  onStatusFilterClick?: (filter: 'working' | 'idle') => void
}

export function VibeyOpsDesk({
  agents,
  missions,
  floor,
  statusFilters = [],
  onStatusFilterClick,
}: VibeyOpsDeskProps) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [firstName, setFirstName] = useState<string>(TEAM_OPS_DESK_MESSAGES.GREETING_FALLBACK_NAME)
  const [autopilotEnabled, setAutopilotEnabled] = useState(false)
  const summary = useMemo(() => buildOpsDeskSummary(agents, missions), [agents, missions])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return
      const display = resolveUserDisplayName(session.user)
      setFirstName(
        firstNameFromDisplayName(display, TEAM_OPS_DESK_MESSAGES.GREETING_FALLBACK_NAME),
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  const awarenessContext = useMemo(
    () => buildTeamOpsAwarenessContext({ agents, missions, firstName }),
    [agents, missions, firstName],
  )

  useEffect(() => {
    const { collapsed, workContext, setWorkContext } = useGlobalChatStore.getState()
    if (collapsed) return
    if (workContext.surface !== 'team' || !workContext.teamOpsAwarenessContext) return
    setWorkContext({
      teamOpsLabel: TEAM_OPS_DESK_MESSAGES.TALK_CONTEXT_LABEL,
      teamOpsAwarenessContext: awarenessContext,
    })
  }, [awarenessContext])

  return (
    <div className="gap-spacing-3 grid h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <div className="card-glass border-border rounded-spacing-3 gap-spacing-3 p-spacing-4 flex shrink-0 flex-col border">
        <div className="gap-spacing-3 flex flex-col sm:flex-row sm:items-start sm:justify-between">
          <VibeyOpsDeskBriefing
            firstName={firstName}
            summary={summary}
            autopilotEnabled={autopilotEnabled}
            statusFilters={statusFilters}
            onStatusFilterClick={onStatusFilterClick}
          />
          <div className="shrink-0">
            <AwarenessToggle
              showStatusHint
              statusHint={TEAM_OPS_DESK_MESSAGES.AUTOPILOT_HINT}
              openSettingsLabel={TEAM_OPS_DESK_MESSAGES.AUTOPILOT_OPEN_SETTINGS}
              onOpenStrategy={() => openWorkspaceSettings('autopilot')}
              onEnabledChange={setAutopilotEnabled}
            />
          </div>
        </div>
        <div className="gap-spacing-2 flex flex-col">
          <p className="body-3 text-muted-foreground">
            {autopilotEnabled
              ? TEAM_OPS_DESK_MESSAGES.BRIEFING_PROMPT_AUTOPILOT
              : TEAM_OPS_DESK_MESSAGES.BRIEFING_PROMPT}
          </p>
          <VibeyOpsDeskTalkButton
            awarenessContext={awarenessContext}
            firstName={firstName}
            summary={summary}
          />
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">{floor}</div>
    </div>
  )
}
