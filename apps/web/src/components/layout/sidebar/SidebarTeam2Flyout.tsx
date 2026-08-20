'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { getIconColor, IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { Tooltip } from '@/components/ui/tooltip'
import { HomeCommunicationNav } from './HomeCommunicationNav'
import { SidebarAgentDmRow } from './SidebarAgentDmRow'
import { SidebarPersonRow } from './SidebarPersonRow'
import { SidebarTeamManageLinks } from './SidebarTeamManageLinks'
import { SidebarTeamRow } from './SidebarTeamRow'
import { useSidebarTeam2FlyoutData } from './useSidebarTeam2FlyoutData'

interface SidebarTeam2FlyoutProps {
  pathname: string
  embedded?: boolean
}
const DM_RECENT_LIMIT = 5

export function SidebarTeam2Flyout({ pathname, embedded = false }: SidebarTeam2FlyoutProps) {
  const {
    create,
    rename,
    recolor,
    reicon,
    remove,
    activeAgentKey,
    activeDmUserId,
    activeOrgId,
    agentsLoading,
    bootstrapLoading,
    canEditTeam,
    canManageOrgMembers,
    canManageTeamMembers,
    currentUserId,
    fallbackFetch,
    favoriteIds,
    getAgentMenuContext,
    getMemberByUserId,
    handleRename,
    loadOrgMembers,
    markPersonDmRead,
    people,
    peopleLoading,
    showOrgCollaboration,
    sortedAgents,
    sortedTeams,
    teamsLoading,
    unreadByPartnerId,
  } = useSidebarTeam2FlyoutData({ pathname })
  const [createOpen, setCreateOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftIcon, setDraftIcon] = useState('users')
  const [draftColor, setDraftColor] = useState<IconColorId>('default')
  const [creating, setCreating] = useState(false)
  const [dmExpanded, setDmExpanded] = useState(false)
  const draftRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (createOpen) requestAnimationFrame(() => draftRef.current?.focus())
  }, [createOpen])

  const [peopleExpanded, setPeopleExpanded] = useState(false)

  const submitCreate = async () => {
    const name = draftName.trim()
    if (!name) {
      setCreateOpen(false)
      return
    }
    setCreating(true)
    try {
      await create({ name, icon: draftIcon, color: draftColor })
      setDraftName('')
      setDraftIcon('users')
      setDraftColor('default')
      setCreateOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const teamBody = (
    <>
      <SidebarTeamManageLinks pathname={pathname} showManagePeople={showOrgCollaboration} />

      <div className="gap-spacing-6 flex flex-col">
        {showOrgCollaboration ? (
          <div className="group/teams">
            <div className="flex items-center justify-between pr-1">
              <p className="hub-dock-flyout-caption">Teams</p>
              <Tooltip label="New team" side="top">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="pointer-events-none -translate-x-1 rounded p-1 text-[var(--color-muted-foreground)] opacity-0 transition-all duration-150 ease-out hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] group-hover/teams:pointer-events-auto group-hover/teams:translate-x-0 group-hover/teams:opacity-100"
                  aria-label="New team"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            </div>
            {createOpen &&
              (() => {
                const draftPalette = getIconColor(draftColor)
                return (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                    onMouseDown={(e) => {
                      e.stopPropagation()
                    }}
                  >
                    <IconPicker
                      value={draftIcon}
                      onChange={setDraftIcon}
                      color={draftColor}
                      onColorChange={(c) => setDraftColor(c as IconColorId)}
                      customTrigger={
                        <span
                          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${draftPalette.glassClass}`}
                        >
                          <LucideIcon
                            name={draftIcon}
                            className={`h-3 w-3 ${draftPalette.textColor}`}
                          />
                        </span>
                      }
                    />
                    <input
                      ref={draftRef}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void submitCreate()
                        if (e.key === 'Escape') {
                          setDraftName('')
                          setDraftIcon('users')
                          setDraftColor('default')
                          setCreateOpen(false)
                        }
                      }}
                      disabled={creating}
                      placeholder={creating ? 'Creating…' : 'Team name'}
                      className="body-3 min-w-0 flex-1 bg-transparent text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none disabled:opacity-50"
                    />
                  </div>
                )
              })()}
            {(teamsLoading || (bootstrapLoading && sortedTeams.length === 0)) && (
              <div className="px-3 py-1"><ListSkeleton rows={3} label="Loading…" /></div>
            )}
            {!teamsLoading && !bootstrapLoading && sortedTeams.length === 0 && (
              <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                No teams yet
              </p>
            )}
            {!teamsLoading &&
              !(bootstrapLoading && sortedTeams.length === 0) &&
              sortedTeams.map((team) => {
                const teamHref = `/team/teams/${team.id}`
                const isActive = pathname === teamHref || pathname.startsWith(`${teamHref}/`)
                return (
                  <SidebarTeamRow
                    key={team.id}
                    team={team}
                    isActive={isActive}
                    canEdit={canEditTeam()}
                    canManageMembers={canManageTeamMembers()}
                    onRename={rename}
                    onRecolor={recolor}
                    onReicon={reicon}
                    onRemove={remove}
                  />
                )
              })}
          </div>
        ) : null}

        {showOrgCollaboration ? (
          <div>
            <HomeCommunicationNav pathname={pathname} cacheOnly={!fallbackFetch} />
          </div>
        ) : null}

        {/* Direct Messages */}
        <div>
          <p className="hub-dock-flyout-caption">Direct messages</p>
          {(agentsLoading || (bootstrapLoading && sortedAgents.length === 0)) && (
            <div className="px-3 py-1"><ListSkeleton rows={3} label="Loading…" /></div>
          )}
          {!agentsLoading && !bootstrapLoading && sortedAgents.length === 0 && (
            <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
              No agents yet
            </p>
          )}
          {!agentsLoading &&
            !(bootstrapLoading && sortedAgents.length === 0) &&
            (dmExpanded ? sortedAgents : sortedAgents.slice(0, DM_RECENT_LIMIT)).map((agent) => (
              <SidebarAgentDmRow
                key={agent.id}
                agent={agent}
                isActive={activeAgentKey === agent.agent_key}
                isFavorite={favoriteIds.has(agent.id)}
                getAgentMenuContext={getAgentMenuContext}
                onRename={handleRename}
              />
            ))}
          {!agentsLoading && sortedAgents.length > DM_RECENT_LIMIT && (
            <button
              type="button"
              onClick={() => setDmExpanded((v) => !v)}
              className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {/* Spacer matches the 20px avatar + 8px gap so the label aligns with agent names. */}
              <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
              <span className="body-3">
                {dmExpanded ? 'Show less' : `Show more (${sortedAgents.length - DM_RECENT_LIMIT})`}
              </span>
            </button>
          )}
        </div>

        {showOrgCollaboration ? (
          <div>
            <p className="hub-dock-flyout-caption">People</p>
            {(peopleLoading || (bootstrapLoading && people.length === 0)) && (
              <div className="px-3 py-1"><ListSkeleton rows={3} label="Loading…" /></div>
            )}
            {!peopleLoading && !bootstrapLoading && people.length === 0 && (
              <p className="px-3 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                No people yet
              </p>
            )}
            {!peopleLoading &&
              !(bootstrapLoading && people.length === 0) &&
              (peopleExpanded ? people : people.slice(0, DM_RECENT_LIMIT)).map((person) => (
                <SidebarPersonRow
                  key={person.user_id}
                  person={person}
                  isActive={activeDmUserId === person.user_id}
                  unreadCount={unreadByPartnerId[person.user_id] ?? 0}
                  activeOrgId={activeOrgId}
                  currentUserId={currentUserId}
                  canManageMembers={canManageOrgMembers}
                  getMemberByUserId={getMemberByUserId}
                  onMembersChanged={() => void loadOrgMembers({ force: true })}
                  onOpenMessage={() => void markPersonDmRead(person.user_id)}
                />
              ))}
            {!peopleLoading && people.length > DM_RECENT_LIMIT && (
              <button
                type="button"
                onClick={() => setPeopleExpanded((v) => !v)}
                className="hover:bg-hover-subtle flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
                <span className="body-3">
                  {peopleExpanded ? 'Show less' : `Show more (${people.length - DM_RECENT_LIMIT})`}
                </span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </>
  )

  if (embedded) {
    return <div className="px-2 pb-2">{teamBody}</div>
  }

  return <div className="scrollbar-hide flex-1 overflow-y-auto px-2 pb-2">{teamBody}</div>
}
