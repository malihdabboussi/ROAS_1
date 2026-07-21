'use client'

import Link from 'next/link'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import type { AgentTeamKind, MissionAgent } from '@/lib/agents'
import type { SlackDiscoveredPerson } from '../../services/slack-people.service'
import type { TeamDetailOrgMember } from './team-detail-member-types'
import type {
  TeamDetailAddPanelPosition,
  useTeamDetailAddPanels,
} from './use-team-detail-add-panels'

type AddPanels = ReturnType<typeof useTeamDetailAddPanels>

interface SearchHeaderProps {
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (value: string) => void
  placeholder: string
  onClose: () => void
}

function TeamAddPickerSearchHeader({
  inputRef,
  value,
  onChange,
  placeholder,
  onClose,
}: SearchHeaderProps) {
  return (
    <div className="gap-spacing-2 p-spacing-3 flex shrink-0 items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          aria-hidden
        />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="body-4 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary box-border h-8 w-full rounded-lg border pl-7 pr-8 outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function panelStyle(position: TeamDetailAddPanelPosition) {
  return {
    top: position.top,
    left: position.left,
    width: position.width,
  }
}

function memberLabel(member: TeamDetailOrgMember): string {
  return member.profiles?.full_name ?? member.profiles?.email ?? member.user_id
}

function EmptyAgentsState({ query, allAgentsCount }: { query: string; allAgentsCount: number }) {
  if (allAgentsCount === 0) {
    return (
      <>
        <p className="body-4 text-muted-foreground">You have no agents yet.</p>
        <Link href="/team" className="body-4 text-primary hover:underline">
          Go to Team to create one
        </Link>
      </>
    )
  }

  if (query.trim()) {
    return <p className="body-4 text-muted-foreground/70">No matches</p>
  }

  return <p className="body-4 text-muted-foreground/70">Every agent is already in this team</p>
}

function HumanPickerRow({
  member,
  onPick,
}: {
  member: TeamDetailOrgMember
  onPick: (userId: string) => void
}) {
  const name = memberLabel(member)
  const email = member.profiles?.email ?? null
  const initial = (name?.[0] ?? '?').toUpperCase()
  return (
    <button
      key={member.id}
      type="button"
      className="gap-spacing-2 body-3 rounded-spacing-2 text-foreground px-spacing-2 py-spacing-1 hover:bg-hover-subtle flex w-full items-center text-left transition-colors"
      onClick={() => onPick(member.user_id)}
    >
      {member.profiles?.avatar_url ? (
        <img
          src={member.profiles.avatar_url}
          alt=""
          className="h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="text-muted-foreground bg-hover-subtle flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
          {initial}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        {email && email !== name ? (
          <span className="body-4 text-muted-foreground/70 block truncate">{email}</span>
        ) : null}
      </span>
      <span className="body-4 text-muted-foreground/70 shrink-0 capitalize">{member.role}</span>
    </button>
  )
}

function AgentPickerRow({
  agent,
  onPick,
}: {
  agent: MissionAgent
  onPick: (agentKey: string) => void
}) {
  const initial = (agent.name?.[0] ?? '?').toUpperCase()
  const role = agent.role?.trim() || null
  return (
    <button
      key={agent.agent_key || agent.id}
      type="button"
      className="gap-spacing-2 body-3 rounded-spacing-2 text-foreground px-spacing-2 py-spacing-1 hover:bg-hover-subtle flex w-full items-center text-left transition-colors"
      onClick={() => onPick(agent.agent_key)}
    >
      {agent.image_url ? (
        <img src={agent.image_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="text-muted-foreground bg-hover-subtle flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
          {initial}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{agent.name}</span>
        {role ? (
          <span className="body-4 text-muted-foreground/70 block truncate">{role}</span>
        ) : null}
      </span>
    </button>
  )
}

function ExternalPickerRow({
  person,
  onPick,
}: {
  person: SlackDiscoveredPerson
  onPick: (personId: string) => void
}) {
  const detail = person.title || person.email
  return (
    <button
      type="button"
      className="gap-spacing-2 body-3 rounded-spacing-2 text-foreground px-spacing-2 py-spacing-1 hover:bg-hover-subtle flex w-full items-center text-left transition-colors"
      onClick={() => onPick(person.id)}
    >
      <span className="text-muted-foreground bg-hover-subtle flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-semibold">
        {person.display_name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{person.display_name}</span>
        {detail ? (
          <span className="body-4 text-muted-foreground block truncate">{detail}</span>
        ) : null}
      </span>
    </button>
  )
}

function renderPanel(
  position: TeamDetailAddPanelPosition,
  panelRef: RefObject<HTMLDivElement | null>,
  className: string,
  children: ReactNode,
) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div ref={panelRef} className={className} style={panelStyle(position)} role="menu">
      {children}
    </div>,
    document.body,
  )
}

export function TeamDetailAddPanels({
  panels,
  allAgentsCount,
  orgMembersCount,
  onAddMember,
  onAssignAgent,
  onAddExternalMember,
  teamKind,
}: {
  panels: AddPanels
  allAgentsCount: number
  orgMembersCount: number
  onAddMember: (userId: string) => void
  onAssignAgent: (agentKey: string) => void
  onAddExternalMember: (personId: string) => void
  teamKind: AgentTeamKind
}) {
  const pickMember = (setOpen: () => void) => (userId: string) => {
    setOpen()
    onAddMember(userId)
  }
  const pickAgent = (setOpen: () => void) => (agentKey: string) => {
    setOpen()
    onAssignAgent(agentKey)
  }
  const pickExternal = (setOpen: () => void) => (personId: string) => {
    setOpen()
    onAddExternalMember(personId)
  }

  return (
    <>
      {panels.toolbarAddOpen && panels.toolbarAddPos
        ? renderPanel(
            panels.toolbarAddPos,
            panels.toolbarAddPanelRef,
            'z-dropdown rounded-spacing-2 border-border surface-card fixed flex max-h-[420px] min-w-0 flex-col overflow-hidden border shadow-lg',
            <>
              <TeamAddPickerSearchHeader
                inputRef={panels.toolbarAddInputRef}
                value={panels.toolbarAddQuery}
                onChange={panels.setToolbarAddQuery}
                placeholder="Search people and agents…"
                onClose={panels.closeToolbarAdd}
              />
              <div className="px-spacing-2 pb-spacing-2 min-h-0 flex-1 overflow-y-auto">
                {teamKind === 'external' ? (
                  <>
                    <div className="body-4 text-muted-foreground px-spacing-2 pb-spacing-1 pt-spacing-1 font-medium uppercase tracking-wide">
                      External people
                    </div>
                    {panels.filteredToolbarExternalPeople.map((person) => (
                      <ExternalPickerRow
                        key={person.id}
                        person={person}
                        onPick={pickExternal(panels.closeToolbarAdd)}
                      />
                    ))}
                  </>
                ) : teamKind === 'agent' ? null : (
                  <>
                    <div className="body-4 text-muted-foreground px-spacing-2 pb-spacing-1 pt-spacing-1 font-medium uppercase tracking-wide">
                      Internal people
                    </div>
                    {panels.filteredToolbarHumans.length === 0 ? (
                      <p className="body-4 text-muted-foreground/70 px-spacing-2 pb-spacing-2 text-center">
                        {orgMembersCount === 0
                          ? 'No org members found'
                          : orgMembersCount === panels.memberUserIds.size
                            ? 'Everyone is already in this team'
                            : panels.toolbarAddQuery.trim()
                              ? 'No matches'
                              : 'No people to add'}
                      </p>
                    ) : (
                      panels.filteredToolbarHumans.map((member) => (
                        <HumanPickerRow
                          key={member.id}
                          member={member}
                          onPick={pickMember(panels.closeToolbarAdd)}
                        />
                      ))
                    )}
                  </>
                )}
                {teamKind === 'agent' || teamKind === 'mixed' ? (
                  <>
                    <div className="body-4 text-muted-foreground px-spacing-2 pb-spacing-1 pt-spacing-3 font-medium uppercase tracking-wide">
                      Agents
                    </div>
                    {panels.filteredToolbarAgents.length === 0 ? (
                      <div className="px-spacing-2 py-spacing-2 text-center">
                        <EmptyAgentsState
                          query={panels.toolbarAddQuery}
                          allAgentsCount={allAgentsCount}
                        />
                      </div>
                    ) : (
                      panels.filteredToolbarAgents.map((agent) => (
                        <AgentPickerRow
                          key={agent.agent_key || agent.id}
                          agent={agent}
                          onPick={pickAgent(panels.closeToolbarAdd)}
                        />
                      ))
                    )}
                  </>
                ) : null}
              </div>
            </>,
          )
        : null}

      {panels.addAgentOpen && panels.addAgentPos
        ? renderPanel(
            panels.addAgentPos,
            panels.addAgentPanelRef,
            'z-dropdown rounded-spacing-2 border-border surface-card fixed flex max-h-[320px] min-w-0 flex-col overflow-hidden border shadow-lg',
            <>
              <TeamAddPickerSearchHeader
                inputRef={panels.addAgentInputRef}
                value={panels.addAgentQuery}
                onChange={panels.setAddAgentQuery}
                placeholder="Search agents…"
                onClose={panels.closeAddAgent}
              />
              <div className="px-spacing-2 pb-spacing-2 min-h-0 flex-1 overflow-y-auto">
                {panels.filteredAgents.length === 0 ? (
                  <div className="px-spacing-2 py-spacing-2 text-center">
                    <EmptyAgentsState
                      query={panels.addAgentQuery}
                      allAgentsCount={allAgentsCount}
                    />
                  </div>
                ) : (
                  panels.filteredAgents.map((agent) => (
                    <AgentPickerRow
                      key={agent.agent_key || agent.id}
                      agent={agent}
                      onPick={pickAgent(panels.closeAddAgent)}
                    />
                  ))
                )}
              </div>
            </>,
          )
        : null}

      {panels.addMemberOpen && panels.addMemberPos
        ? renderPanel(
            panels.addMemberPos,
            panels.addMemberPanelRef,
            'z-dropdown rounded-spacing-2 border-border surface-card fixed flex max-h-[320px] min-w-0 flex-col overflow-hidden border shadow-lg',
            <>
              <TeamAddPickerSearchHeader
                inputRef={panels.addMemberInputRef}
                value={panels.addMemberQuery}
                onChange={panels.setAddMemberQuery}
                placeholder={
                  teamKind === 'external' ? 'Search external people…' : 'Search org members…'
                }
                onClose={panels.closeAddMember}
              />
              <div className="px-spacing-2 pb-spacing-2 min-h-0 flex-1 overflow-y-auto">
                {teamKind === 'external' ? (
                  panels.filteredExternalPeople.map((person) => (
                    <ExternalPickerRow
                      key={person.id}
                      person={person}
                      onPick={pickExternal(panels.closeAddMember)}
                    />
                  ))
                ) : panels.filteredOrgMembers.length === 0 ? (
                  <p className="body-4 text-muted-foreground/70 px-spacing-2 py-spacing-2 text-center">
                    {orgMembersCount === 0
                      ? 'No org members found'
                      : panels.memberUserIds.size > 0 && panels.filteredOrgMembers.length === 0
                        ? 'Everyone is already in this team'
                        : 'No matches'}
                  </p>
                ) : (
                  panels.filteredOrgMembers.map((member) => (
                    <HumanPickerRow
                      key={member.id}
                      member={member}
                      onPick={pickMember(panels.closeAddMember)}
                    />
                  ))
                )}
              </div>
            </>,
          )
        : null}
    </>
  )
}
