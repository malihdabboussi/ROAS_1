'use client'

import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { MissionAgentSkill } from '@/lib/agents/agent-skill-types'
import { SkillCard } from './skill-card'

export function SkillsListPanel({
  loadError,
  skillsLoading,
  filteredSkills,
  viewMode,
  toggleBusyId,
  menuOpenId,
  setMenuOpenId,
  onToggleEnabled,
  queueTrySkillMessage,
  downloadSkillMd,
  setDeleteTarget,
  setDetailResourceId,
  setDetailSkill,
  canViewOfficialSkillContent = false,
}: {
  loadError: string | null
  skillsLoading: boolean
  filteredSkills: MissionAgentSkill[]
  viewMode: 'grid' | 'list'
  toggleBusyId: string | null
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  onToggleEnabled: (skill: MissionAgentSkill, enabled: boolean) => void | Promise<void>
  queueTrySkillMessage: (skill: MissionAgentSkill) => void
  downloadSkillMd: (skill: MissionAgentSkill) => void
  setDeleteTarget: (skill: MissionAgentSkill) => void
  setDetailResourceId: (id: string | null) => void
  setDetailSkill: (skill: MissionAgentSkill) => void
  canViewOfficialSkillContent?: boolean
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="pb-spacing-4">
          {loadError ? <p className="body-3 text-destructive">{loadError}</p> : null}
          {skillsLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <VibeyLoadingOrb state="processing" size="sm" />
            </div>
          ) : filteredSkills.length === 0 ? (
            <p className="body-3 text-muted-foreground">
              No custom skills for this agent yet. Create one in team chat.
            </p>
          ) : viewMode === 'grid' ? (
            <div className="gap-spacing-3 grid grid-cols-1 items-stretch md:grid-cols-2">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  toggleBusyId={toggleBusyId}
                  menuOpenId={menuOpenId}
                  setMenuOpenId={setMenuOpenId}
                  onToggleEnabled={onToggleEnabled}
                  queueTrySkillMessage={queueTrySkillMessage}
                  downloadSkillMd={downloadSkillMd}
                  setDeleteTarget={setDeleteTarget}
                  setDetailResourceId={setDetailResourceId}
                  setDetailSkill={setDetailSkill}
                  canViewOfficialSkillContent={canViewOfficialSkillContent}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-spacing-3">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  toggleBusyId={toggleBusyId}
                  menuOpenId={menuOpenId}
                  setMenuOpenId={setMenuOpenId}
                  onToggleEnabled={onToggleEnabled}
                  queueTrySkillMessage={queueTrySkillMessage}
                  downloadSkillMd={downloadSkillMd}
                  setDeleteTarget={setDeleteTarget}
                  setDetailResourceId={setDetailResourceId}
                  setDetailSkill={setDetailSkill}
                  canViewOfficialSkillContent={canViewOfficialSkillContent}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
