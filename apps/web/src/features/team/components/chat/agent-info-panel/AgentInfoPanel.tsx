'use client'

import { X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { useUserRole } from '@/hooks/use-user-role'
import { TeamCommunicationTab } from '../../../containers/TeamCommunicationTab'
import { AgentInfoPanelTabIcon } from '../../../lib/agent-info-panel-tab-meta'
import { showsAgentAccessTab, type AgentInfoPanelTab } from '../../../lib/agent-info-panel-tabs'
import type { AgentInfoPanelProps } from './agent-info-panel.types'
import { AgentInfoAccessTab } from './AgentInfoAccessTab'
import { AgentInfoDetailsTab } from './AgentInfoDetailsTab'
import { AgentInfoPanelPortraitSection } from './AgentInfoPanelPortraitSection'
import { AgentInfoSkillsTab } from './AgentInfoSkillsTab'
import { useAgentInfoPanelPortrait } from './useAgentInfoPanelPortrait'

export type { AgentInfoPanelProps } from './agent-info-panel.types'

export function AgentInfoPanel(props: AgentInfoPanelProps) {
  const {
    selected,
    generatingAvatarIds,
    handleGeneratePortrait,
    setAgents,
    assignedCampaigns,
    nonGeneralCampaigns,
    onClose,
    fullScreen,
    fillParentWidth,
    onRequestCollapse,
    isSystemLikeAgent,
    communicationTabProps,
    setShowUpgradeModal,
    handleAddBrain,
    hasBrain,
    brainLoading,
    brainError,
    selectedAgentKey,
    infoPanelTab = 'info',
    onInfoPanelTabChange,
  } = props

  const portrait = useAgentInfoPanelPortrait({
    selected,
    setAgents,
    assignedCampaigns,
    nonGeneralCampaigns,
    generatingAvatarIds,
    handleGeneratePortrait,
  })

  const { role } = useUserRole()
  const isEnterprise = role === 'enterprise'
  const managementDisabled = props.managementDisabled === true
  const canAllowExtraAccess = props.canAllowExtraAccess !== false
  const canSetAgentTeam = props.canSetAgentTeam !== false

  const showUpgradeTab = showsAgentAccessTab(selected, isSystemLikeAgent)

  const shellClass = fullScreen
    ? 'fixed inset-0 z-40 flex flex-col bg-[var(--color-background)]'
    : fillParentWidth
      ? 'flex h-full min-h-0 w-full min-w-0 flex-col'
      : 'flex h-full min-h-0 w-[min(100%,380px)] shrink-0 flex-col'

  return (
    <div className={shellClass}>
      {fullScreen && onClose ? (
        <div className="border-border px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-between border-b">
          <p className="body-2 text-foreground font-semibold uppercase">Agent info</p>
          <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
            <X className="icon-sm" />
          </button>
        </div>
      ) : null}
      <div
        className={
          fillParentWidth
            ? 'relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0'
            : 'card-glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0'
        }
      >
        <AgentInfoPanelPortraitSection
          selected={selected}
          generatingAvatarIds={generatingAvatarIds}
          setAgents={setAgents}
          portrait={portrait}
          level={props.level}
          isSystemLikeAgent={props.isSystemLikeAgent}
          setNameValue={props.setNameValue}
          handleNameSave={props.handleNameSave}
          statusBadgeText={props.statusBadgeText}
          lastActiveLabel={props.lastActiveLabel}
          onRequestCollapse={onRequestCollapse}
        />

        {selected && (
          <Tabs
            value={infoPanelTab}
            onValueChange={(v) => onInfoPanelTabChange?.(v as AgentInfoPanelTab)}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <div className="px-spacing-3 pt-spacing-1 pb-spacing-1 shrink-0">
              <TabsList variant="full" className="flex-wrap">
                <TabsTrigger value="info" className="gap-spacing-2">
                  <AgentInfoPanelTabIcon tab="info" />
                  Info
                </TabsTrigger>
                {props.renderWorkTab ? (
                  <TabsTrigger value="work" className="gap-spacing-2">
                    <AgentInfoPanelTabIcon tab="work" />
                    Work
                  </TabsTrigger>
                ) : null}
                <TabsTrigger value="skills" className="gap-spacing-2">
                  <AgentInfoPanelTabIcon tab="skills" />
                  Skills
                </TabsTrigger>
                <TabsTrigger value="communication" className="gap-spacing-2">
                  <AgentInfoPanelTabIcon tab="communication" />
                  Comms
                </TabsTrigger>
                {showUpgradeTab ? (
                  <TabsTrigger value="access" className="gap-spacing-2">
                    <AgentInfoPanelTabIcon tab="access" />
                    Access
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <TabsContent
                value="info"
                className="mt-0 min-h-0 flex-1 overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                <AgentInfoDetailsTab
                  selected={props.selected}
                  level={props.level}
                  isSystemLikeAgent={props.isSystemLikeAgent}
                  bio={props.bio}
                  blockedCount={props.blockedCount}
                  activeCount={props.activeCount}
                  todoCount={props.todoCount}
                  totalCompleted={props.totalCompleted}
                  completedThisMonth={props.completedThisMonth}
                  successRate={props.successRate}
                  avgCompletionRate={props.avgCompletionRate}
                  missionsScored={props.missionsScored}
                  hasStats={props.hasStats}
                  overallColor={props.overallColor}
                  overall={props.overall}
                  metrics={props.metrics}
                  stats={props.stats}
                  hasBrain={props.hasBrain}
                  campaigns={props.campaigns}
                  nonGeneralCampaigns={props.nonGeneralCampaigns}
                  assignedCampaigns={props.assignedCampaigns}
                  campaignLoading={props.campaignLoading}
                  campaignActionLoading={props.campaignActionLoading}
                  campaignError={props.campaignError}
                  handleAssignCampaign={props.handleAssignCampaign}
                  handleUnassignCampaign={props.handleUnassignCampaign}
                  isSelectedRemovable={props.isSelectedRemovable}
                  isSelectedManager={props.isSelectedManager}
                  setFireError={props.setFireError}
                  setShowFireConfirm={props.setShowFireConfirm}
                  selectedAgentKey={props.selectedAgentKey}
                  managementDisabled={managementDisabled}
                />
              </TabsContent>

              {props.renderWorkTab ? (
                <TabsContent value="work" className="mt-0 min-h-0 flex-1 overflow-hidden">
                  {props.renderWorkTab()}
                </TabsContent>
              ) : null}

              <TabsContent
                value="skills"
                className="px-spacing-3 mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <AgentInfoSkillsTab
                  skillsLoading={props.skillsLoading}
                  agentSkills={props.agentSkills}
                  agentWorkflows={props.agentWorkflows}
                  skillsError={props.skillsError}
                  selectedAgentKey={props.selectedAgentKey}
                  disabled={managementDisabled}
                />
              </TabsContent>

              <TabsContent
                value="communication"
                className="px-spacing-3 pb-spacing-3 mt-0 min-h-0 flex-1 overflow-y-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                <TeamCommunicationTab {...communicationTabProps} disabled={managementDisabled} />
              </TabsContent>

              {showUpgradeTab && (
                <TabsContent
                  value="access"
                  className="px-spacing-3 pb-spacing-3 mt-0 min-h-0 flex-1 overflow-y-auto"
                  style={{ scrollbarWidth: 'none' }}
                >
                  <AgentInfoAccessTab
                    selected={selected}
                    selectedAgentKey={selectedAgentKey}
                    setAgents={setAgents}
                    hasBrain={hasBrain}
                    brainLoading={brainLoading}
                    brainError={brainError}
                    handleAddBrain={handleAddBrain}
                    setShowUpgradeModal={setShowUpgradeModal}
                    isEnterprise={isEnterprise}
                    disabled={managementDisabled}
                    canAllowExtra={canAllowExtraAccess}
                    canSetTeam={canSetAgentTeam}
                  />
                </TabsContent>
              )}
            </div>
          </Tabs>
        )}
      </div>
    </div>
  )
}
