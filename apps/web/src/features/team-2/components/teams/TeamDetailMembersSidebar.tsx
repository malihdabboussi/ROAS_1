'use client'

import Link from 'next/link'
import type { RefObject } from 'react'
import { Plus, X } from 'lucide-react'
import type {
  AgentTeam,
  AgentTeamExternalMember,
  AgentTeamMember,
  MissionAgent,
} from '@/lib/agents'
import type { RemoveTeamMemberTarget } from './team-detail-member-types'

interface TeamDetailMembersSidebarProps {
  team: AgentTeam | null
  userMembers: AgentTeamMember[]
  agents: MissionAgent[]
  externalMembers: AgentTeamExternalMember[]
  canEditTeam: boolean
  addMemberCardRef: RefObject<HTMLDivElement | null>
  addMemberAnchorRef: RefObject<HTMLButtonElement | null>
  addMemberOpen: boolean
  onToggleAddMember: () => void
  addAgentCardRef: RefObject<HTMLDivElement | null>
  addAgentAnchorRef: RefObject<HTMLButtonElement | null>
  addAgentOpen: boolean
  onToggleAddAgent: () => void
  onRequestRemove: (target: RemoveTeamMemberTarget) => void
}

export function TeamDetailMembersSidebar({
  team,
  userMembers,
  agents,
  externalMembers,
  canEditTeam,
  addMemberCardRef,
  addMemberAnchorRef,
  addMemberOpen,
  onToggleAddMember,
  addAgentCardRef,
  addAgentAnchorRef,
  addAgentOpen,
  onToggleAddAgent,
  onRequestRemove,
}: TeamDetailMembersSidebarProps) {
  const teamKind = team?.team_kind ?? 'mixed'

  return (
    <aside className="gap-spacing-3 p-spacing-3 h-spacing-48 flex min-h-0 w-full shrink-0 flex-row overflow-x-auto md:h-auto md:w-72 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
      {teamKind !== 'agent' ? (
        <div
          ref={addMemberCardRef}
          className="surface-card border-subtle rounded-spacing-3 w-spacing-64 flex min-h-0 shrink-0 flex-col overflow-hidden border md:max-h-[40%] md:w-auto"
        >
          <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-between">
            <span className="body-4 text-muted-foreground font-medium uppercase tracking-wide">
              {teamKind === 'external' ? 'External people' : 'Internal people'} (
              {teamKind === 'external' ? externalMembers.length : userMembers.length})
            </span>
            {canEditTeam ? (
              <button
                ref={addMemberAnchorRef}
                type="button"
                onClick={onToggleAddMember}
                className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded p-0.5 transition-colors"
                aria-haspopup="menu"
                aria-expanded={addMemberOpen}
                aria-label="Add team member"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="p-spacing-2 min-h-0 flex-1 overflow-auto">
            {teamKind === 'external' ? (
              externalMembers.length === 0 ? (
                <p className="body-4 text-muted-foreground p-spacing-3 text-center">
                  No external people in this team
                </p>
              ) : (
                externalMembers.map((member) => (
                  <div
                    key={member.person_id}
                    className="hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 gap-spacing-2 group flex items-center transition-colors"
                  >
                    <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                      {member.display_name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onRequestRemove({
                          type: 'external',
                          id: member.person_id,
                          label: member.display_name,
                        })
                      }
                      className="btn-icon-bare text-muted-foreground hover:text-destructive translate-x-1 opacity-0 transition-all duration-150 focus-visible:translate-x-0 focus-visible:opacity-100 group-hover:translate-x-0 group-hover:opacity-100"
                      aria-label={`Remove ${member.display_name}`}
                    >
                      <X className="icon-xs" />
                    </button>
                  </div>
                ))
              )
            ) : userMembers.length === 0 ? (
              <p className="body-4 text-muted-foreground p-spacing-3 text-center">
                No users in this team
              </p>
            ) : (
              userMembers.map((member) => {
                const lockedInManagement =
                  !!team?.is_system &&
                  team.name === 'Management' &&
                  !!team.org_id &&
                  (member.role === 'owner' || member.role === 'admin')
                const label = member.full_name || member.email || member.user_id
                return (
                  <div
                    key={member.user_id}
                    className="hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 gap-spacing-2 group flex items-center transition-colors"
                  >
                    <span className="body-3 text-foreground min-w-0 flex-1 truncate">{label}</span>
                    {member.role ? (
                      <span className="body-4 text-muted-foreground capitalize">{member.role}</span>
                    ) : null}
                    {!lockedInManagement ? (
                      <button
                        type="button"
                        onClick={() =>
                          onRequestRemove({
                            type: 'human',
                            id: member.user_id,
                            label,
                          })
                        }
                        className="btn-icon-bare text-muted-foreground hover:text-destructive translate-x-1 opacity-0 transition-all duration-150 focus-visible:translate-x-0 focus-visible:opacity-100 group-hover:translate-x-0 group-hover:opacity-100"
                        aria-label={`Remove ${label}`}
                      >
                        <X className="icon-xs" />
                      </button>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : null}
      {teamKind === 'agent' || teamKind === 'mixed' ? (
        <div
          ref={addAgentCardRef}
          className="surface-card border-subtle rounded-spacing-3 w-spacing-64 flex shrink-0 flex-col overflow-hidden border md:w-auto"
        >
          <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-between">
            <span className="body-4 text-muted-foreground font-medium uppercase tracking-wide">
              Agents ({agents.length})
            </span>
            {canEditTeam ? (
              <button
                ref={addAgentAnchorRef}
                type="button"
                onClick={onToggleAddAgent}
                className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded p-0.5 transition-colors"
                aria-haspopup="menu"
                aria-expanded={addAgentOpen}
                aria-label="Add agent to team"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <div className="p-spacing-2">
            {agents.length === 0 ? (
              <p className="body-4 text-muted-foreground p-spacing-3 text-center">
                No agents in this team
              </p>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="hover:bg-hover-subtle rounded-spacing-2 px-spacing-2 py-spacing-1 group flex w-full items-center gap-2 transition-colors"
                >
                  <Link
                    href={`/team?agent=${encodeURIComponent(agent.agent_key)}`}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    {agent.image_url ? (
                      <img
                        src={agent.image_url}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                        {agent.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                      {agent.name}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      onRequestRemove({
                        type: 'agent',
                        id: agent.agent_key,
                        label: agent.name,
                      })
                    }
                    className="btn-icon-bare text-muted-foreground hover:text-destructive translate-x-1 opacity-0 transition-all duration-150 focus-visible:translate-x-0 focus-visible:opacity-100 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-label={`Remove ${agent.name}`}
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
