'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { AgentTeam } from '@/lib/agents'
import { useOrgStore } from '@/lib/org'
import { useTeam2Perms } from '../../hooks/use-team2-perms'
import type { RemoveTeamMemberTarget } from './team-detail-member-types'
import { isTeamDetailTab, type TeamDetailTab } from './team-detail-view-types'
import { TeamAccessView } from './TeamAccessView'
import { TeamAnalyticsView } from './TeamAnalyticsView'
import { TeamDetailAddPanels } from './TeamDetailAddPanels'
import { TeamDetailHeader } from './TeamDetailHeader'
import { TeamDetailMembersSidebar } from './TeamDetailMembersSidebar'
import { TeamDetailRemoveDialog } from './TeamDetailRemoveDialog'
import { TeamDetailToolbar } from './TeamDetailToolbar'
import { TeamOverviewView } from './TeamOverviewView'
import { TeamViewTabs } from './TeamViewTabs'
import { useTeamDetailAddPanels } from './use-team-detail-add-panels'
import { useTeamDetailData } from './use-team-detail-data'

interface TeamDetailViewProps {
  teamId: string
  initialTeam?: AgentTeam | null
  embedded?: boolean
}

export function TeamDetailView({ teamId, initialTeam, embedded = false }: TeamDetailViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const activeTab: TeamDetailTab = isTeamDetailTab(tabFromUrl) ? tabFromUrl : 'overview'

  const setActiveTab = useCallback(
    (next: TeamDetailTab) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'overview') params.delete('tab')
      else params.set('tab', next)
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )
  const activeOrgId = useOrgStore((state) => state.activeOrgId)
  const data = useTeamDetailData({ teamId, initialTeam, activeOrgId })
  const [removeTarget, setRemoveTarget] = useState<RemoveTeamMemberTarget | null>(null)
  const [removingTarget, setRemovingTarget] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const perms = useTeam2Perms()
  const canEditTeam = perms.canEditTeam()
  const canManageTeamMembers = perms.canManageTeamMembers()
  const addPanels = useTeamDetailAddPanels({
    orgMembers: data.orgMembers,
    userMembers: data.userMembers,
    externalMembers: data.externalMembers,
    externalPeople: data.externalPeople,
    agents: data.members,
    allAgents: data.allAgents,
  })
  const openToolbarAddMembers = addPanels.openToolbarAddMembers

  useEffect(() => {
    if (searchParams.get('addMembers') !== '1') return
    if (!canManageTeamMembers) return
    openToolbarAddMembers()
    const params = new URLSearchParams(searchParams.toString())
    params.delete('addMembers')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [canManageTeamMembers, openToolbarAddMembers, pathname, router, searchParams])

  const submitRename = async () => {
    const trimmed = renameDraft.trim()
    if (!data.team || !trimmed || trimmed === data.team.name) {
      setRenaming(false)
      return
    }
    if (!canEditTeam) return
    await data.updateTeamName(trimmed)
    setRenaming(false)
  }

  const setColor = async (color: string) => {
    if (!data.team) return
    if (!canEditTeam) return
    await data.updateTeamColor(color)
  }

  const setIcon = async (icon: string) => {
    if (!data.team) return
    if (!canEditTeam) return
    await data.updateTeamIcon(icon)
  }

  const onDelete = async () => {
    if (!data.team || data.team.is_system) return
    if (!canEditTeam) return
    if (!window.confirm(`Delete team "${data.team.name}"? Agents are reassigned to General.`))
      return
    await data.deleteCurrentTeam()
    router.push('/team/teams')
  }

  const confirmRemoveTarget = useCallback(async () => {
    if (!removeTarget || removingTarget) return
    setRemovingTarget(true)
    try {
      if (removeTarget.type === 'human') {
        await data.deleteMember(removeTarget.id)
      } else if (removeTarget.type === 'external') {
        await data.deleteExternalMember(removeTarget.id)
      } else {
        await data.removeAgent(removeTarget.id)
      }
      setRemoveTarget(null)
    } finally {
      setRemovingTarget(false)
    }
  }, [data, removeTarget, removingTarget])

  const outerClass = embedded
    ? 'relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden'
    : 'relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3'
  const innerClass = embedded
    ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
    : 'flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border'

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        {!embedded ? (
          <TeamDetailHeader
            team={data.team}
            canEditTeam={canEditTeam}
            renaming={renaming}
            renameDraft={renameDraft}
            onRenameDraftChange={setRenameDraft}
            onStartRename={() => {
              if (!canEditTeam) return
              if (!data.team) return
              setRenameDraft(data.team.name)
              setRenaming(true)
            }}
            onCancelRename={() => setRenaming(false)}
            onSubmitRename={() => void submitRename()}
            onSetIcon={(name) => void setIcon(name)}
            onSetColor={(color) => void setColor(color)}
            onDelete={() => void onDelete()}
          />
        ) : null}

        <TeamViewTabs
          active={activeTab}
          onChange={setActiveTab}
          trailing={
            <TeamDetailToolbar
              rangeConfig={data.overviewRangeConfig}
              onRangePatch={(patch) =>
                data.setOverviewRangeConfig((prev) => ({ ...prev, ...patch }))
              }
              campaigns={data.campaigns}
              campaignFilterIds={data.campaignFilterIds}
              onCampaignFilterIdsChange={data.setCampaignFilterIds}
              spaceOptions={data.spacePickerOptions}
              spaceFilterIds={data.spaceFilterIds}
              onSpaceFilterIdsChange={data.setSpaceFilterIds}
              showSpaceFilter={activeTab !== 'analytics'}
              addMembersToolbarOpen={addPanels.toolbarAddOpen}
              onToggleAddMembersToolbar={addPanels.toggleToolbarAddMembers}
              addMembersToolbarRef={addPanels.toolbarAddAnchorRef}
            />
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden md:flex-row">
          <div className="p-spacing-4 min-h-0 min-w-0 flex-1 overflow-auto">
            {data.loading ? (
              <p className="body-3 text-muted-foreground p-spacing-6 text-center">Loading…</p>
            ) : activeTab === 'overview' ? (
              <TeamOverviewView
                teamId={teamId}
                rangeConfig={data.overviewRangeConfig}
                campaignFilterIds={data.campaignFilterIds}
                spaceFilterIds={data.spaceFilterIds}
                missionCampaignById={data.missionCampaignById}
              />
            ) : activeTab === 'analytics' ? (
              <TeamAnalyticsView
                teamId={teamId}
                rangeConfig={data.overviewRangeConfig}
                campaignFilterIds={data.campaignFilterIds}
                members={data.members}
                missions={data.missions}
                humanMembers={data.userMembers}
                orgId={activeOrgId}
              />
            ) : (
              <TeamAccessView
                grants={data.grants}
                savingKind={data.savingKind}
                toggle={data.toggleGrant}
                canEditTeam={canEditTeam}
              />
            )}
          </div>

          <TeamDetailMembersSidebar
            team={data.team}
            userMembers={data.userMembers}
            externalMembers={data.externalMembers}
            agents={data.members}
            canEditTeam={canEditTeam}
            addMemberCardRef={addPanels.addMemberCardRef}
            addMemberAnchorRef={addPanels.addMemberAnchorRef}
            addMemberOpen={addPanels.addMemberOpen}
            onToggleAddMember={addPanels.toggleAddMemberPanel}
            addAgentCardRef={addPanels.addAgentCardRef}
            addAgentAnchorRef={addPanels.addAgentAnchorRef}
            addAgentOpen={addPanels.addAgentOpen}
            onToggleAddAgent={addPanels.toggleAddAgentPanel}
            onRequestRemove={setRemoveTarget}
          />
        </div>
      </div>

      <TeamDetailRemoveDialog
        target={removeTarget}
        removing={removingTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => void confirmRemoveTarget()}
      />

      <TeamDetailAddPanels
        panels={addPanels}
        allAgentsCount={data.allAgents.length}
        orgMembersCount={data.orgMembers.length}
        onAddMember={(userId) => void data.addMember(userId)}
        onAssignAgent={(agentKey) => void data.assignAgent(agentKey)}
        onAddExternalMember={(personId) => void data.addExternalMember(personId)}
        teamKind={data.team?.team_kind ?? 'mixed'}
      />
    </div>
  )
}
