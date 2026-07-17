'use client'

import { useSkillDetailResources } from './use-skill-detail-resources'
import { useSkillsAgentsAndSkills } from './use-skills-agents-and-skills'
import { useSkillsCreateFlow } from './use-skills-create-flow'

export function useSkillsPage() {
  const agentsAndSkills = useSkillsAgentsAndSkills()
  const createFlow = useSkillsCreateFlow({
    selectedAgentKey: agentsAndSkills.selectedAgentKey,
    setSelectedAgentKey: agentsAndSkills.setSelectedAgentKey,
    setSkillsView: agentsAndSkills.setSkillsView,
    loadSkills: agentsAndSkills.loadSkills,
    refreshSkills: agentsAndSkills.refreshSkills,
  })
  const detailResources = useSkillDetailResources({
    detailSkillResolved: agentsAndSkills.detailSkillResolved,
    detailResourceId: agentsAndSkills.detailResourceId,
    setDetailResourceId: agentsAndSkills.setDetailResourceId,
    setExpandedFolders: agentsAndSkills.setExpandedFolders,
    refreshSkills: agentsAndSkills.refreshSkills,
    moveSkillResourceOptimistically: agentsAndSkills.moveSkillResourceOptimistically,
    deleteSkillResourceOptimistically: agentsAndSkills.deleteSkillResourceOptimistically,
  })
  return { ...agentsAndSkills, ...createFlow, ...detailResources }
}
