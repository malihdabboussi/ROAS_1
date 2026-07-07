'use client'

import { useState } from 'react'
import type { RefObject } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgent, MissionAgentSkill } from '@/lib/agents/agent-skill-types'
import type { SkillMenuState } from './skill-menu/skill-menu.types'
import { SkillMenuDropdown } from './skill-menu/SkillMenuDropdown'
import { SkillsCatalogTree } from './skills-catalog-tree'
import { SkillsRailEmptyState } from './skills-empty-illustrations'
import { SkillsListToolbar } from './skills-list-toolbar'
import type { SkillsGroupBy, SkillsGroupSort, SkillTypeFilter } from './skills-page.types'
import { skillsLoadingLabel } from './skills-page.utils'

export function SkillsTreeSidebar({
  agents,
  search,
  setSearch,
  skillTypeFilters,
  toggleSkillTypeFilter,
  skillsGroupBy,
  setSkillsGroupBy,
  skillsGroupSort,
  setSkillsGroupSort,
  totalSkillCount,
  loadError,
  skillsLoading,
  skillsViewKey,
  filteredSkills,
  detailSkillId,
  detailResourceId,
  onSelectSkill,
  canViewOfficialSkillContent,
  toggleBusyId,
  onToggleEnabled,
  onSkillsChanged,
  setDeleteTarget,
  selectedAgentKey,
  addSkillMenuOpen,
  setAddSkillMenuOpen,
  openCreateFresh,
  openCreateWithJaime,
  skillUploadInputRef,
  handleUploadSkill,
  extracting,
}: {
  agents: MissionAgent[]
  search: string
  setSearch: (v: string) => void
  skillTypeFilters: SkillTypeFilter[]
  toggleSkillTypeFilter: (filter: SkillTypeFilter) => void
  skillsGroupBy: SkillsGroupBy
  setSkillsGroupBy: (value: SkillsGroupBy) => void
  skillsGroupSort: SkillsGroupSort
  setSkillsGroupSort: (value: SkillsGroupSort) => void
  totalSkillCount: number
  loadError: string | null
  skillsLoading: boolean
  skillsViewKey: 'all' | string
  filteredSkills: MissionAgentSkill[]
  detailSkillId: string | null
  detailResourceId: string | null
  onSelectSkill: (skill: MissionAgentSkill) => void
  canViewOfficialSkillContent: boolean
  toggleBusyId: string | null
  onToggleEnabled: (skill: MissionAgentSkill, enabled: boolean) => void | Promise<void>
  onSkillsChanged: () => void
  setDeleteTarget: (skill: MissionAgentSkill) => void
  selectedAgentKey: string
  addSkillMenuOpen: boolean
  setAddSkillMenuOpen: (open: boolean) => void
  openCreateFresh: () => void
  openCreateWithJaime: () => void
  skillUploadInputRef: RefObject<HTMLInputElement | null>
  handleUploadSkill: (files: FileList | File[]) => void
  extracting: boolean
}) {
  const [skillMenuState, setSkillMenuState] = useState<SkillMenuState | null>(null)

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <SkillsListToolbar
        skillsViewKey={skillsViewKey}
        skillsGroupBy={skillsGroupBy}
        setSkillsGroupBy={setSkillsGroupBy}
        skillsGroupSort={skillsGroupSort}
        setSkillsGroupSort={setSkillsGroupSort}
        search={search}
        setSearch={setSearch}
        skillTypeFilters={skillTypeFilters}
        toggleSkillTypeFilter={toggleSkillTypeFilter}
        selectedAgentKey={selectedAgentKey}
        addSkillMenuOpen={addSkillMenuOpen}
        setAddSkillMenuOpen={setAddSkillMenuOpen}
        openCreateFresh={openCreateFresh}
        openCreateWithJaime={openCreateWithJaime}
        skillUploadInputRef={skillUploadInputRef}
        handleUploadSkill={handleUploadSkill}
        extracting={extracting}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {loadError ? (
          <p className="body-3 px-spacing-2 pt-spacing-2 text-destructive">{loadError}</p>
        ) : null}
        {skillsLoading ? (
          <div className="px-spacing-2 py-spacing-6 flex min-h-0 w-full flex-1 flex-col items-center justify-center">
            <VibeyLoadingOrb
              state="processing"
              size="sm"
              text={skillsLoadingLabel(skillsViewKey, agents)}
            />
          </div>
        ) : filteredSkills.length === 0 ? (
          <SkillsRailEmptyState message={totalSkillCount > 0 ? 'No matches.' : 'No skills yet.'} />
        ) : (
          <div className="p-spacing-2 min-h-0 min-w-0 flex-1">
            <SkillsCatalogTree
              skills={filteredSkills}
              skillsViewKey={skillsViewKey}
              skillsGroupBy={skillsGroupBy}
              skillsGroupSort={skillsGroupSort}
              agents={agents}
              detailSkillId={detailSkillId}
              detailResourceId={detailResourceId}
              toggleBusyId={toggleBusyId}
              onSkillsChanged={onSkillsChanged}
              onSelectSkill={onSelectSkill}
              canViewOfficialSkillContent={canViewOfficialSkillContent}
              onToggleEnabled={onToggleEnabled}
              onOpenSkillMenu={(skill, position) =>
                setSkillMenuState({ skill, pointerPosition: position })
              }
            />
          </div>
        )}
      </div>

      {skillMenuState ? (
        <SkillMenuDropdown
          skill={skillMenuState.skill}
          agents={agents}
          pointerPosition={skillMenuState.pointerPosition}
          onClose={() => setSkillMenuState(null)}
          skillsViewKey={skillsViewKey}
          onSelectSkill={onSelectSkill}
          onToggleEnabled={onToggleEnabled}
          onSkillsChanged={onSkillsChanged}
          onRequestDelete={setDeleteTarget}
        />
      ) : null}
    </div>
  )
}
