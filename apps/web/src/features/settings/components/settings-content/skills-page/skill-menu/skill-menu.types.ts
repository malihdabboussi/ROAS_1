import type { MissionAgent, MissionAgentSkill } from '@/features/mission-control/types'

export type SkillMenuState = {
  skill: MissionAgentSkill
  pointerPosition: { x: number; y: number }
}

export type SkillMenuActionsContext = {
  agents: MissionAgent[]
  skillsViewKey: 'all' | string
  onSelectSkill: (skill: MissionAgentSkill) => void
  onToggleEnabled: (skill: MissionAgentSkill, enabled: boolean) => void | Promise<void>
  onSkillsChanged: () => void
  onRequestDelete: (skill: MissionAgentSkill) => void
}
