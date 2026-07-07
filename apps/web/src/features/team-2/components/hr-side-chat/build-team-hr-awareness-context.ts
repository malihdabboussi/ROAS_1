import type {
  TeamAgentsPageContext,
  TeamFocusedAgent,
  TeamFocusPage,
  TeamSkillsPageContext,
} from '../../store/use-team-focus-store'

interface BuildTeamHrAwarenessContextInput {
  focusedAgent: TeamFocusedAgent | null
  page: TeamFocusPage
  skillsContext?: TeamSkillsPageContext | null
  agentsContext?: TeamAgentsPageContext | null
}

const PAGE_LABEL: Record<TeamFocusPage, string> = {
  agents: 'Manage Agents',
  skills: 'Manage Skills',
}

export function buildTeamHrAwarenessContext({
  focusedAgent,
  page,
  skillsContext,
  agentsContext,
}: BuildTeamHrAwarenessContextInput): string {
  const agentsLines = agentsContext ? buildAgentsContextLines(agentsContext) : []
  const skillsLines = skillsContext ? buildSkillsContextLines(skillsContext) : []

  if (focusedAgent) {
    const lines = [
      '[Team Context]',
      `Page: ${PAGE_LABEL[page]}`,
      `${focusedAgent.editable ? 'Editing agent' : 'Viewing agent'}: ${focusedAgent.name}`,
      `Agent key: ${focusedAgent.agent_key}`,
      focusedAgent.role ? `Role: ${focusedAgent.role}` : '',
      focusedAgent.level ? `Level: ${focusedAgent.level}` : '',
      focusedAgent.specialty ? `Specialty: ${focusedAgent.specialty}` : '',
      focusedAgent.capability_domain ? `Domain: ${focusedAgent.capability_domain}` : '',
      focusedAgent.editable
        ? 'When the user asks for changes, apply them to this agent unless they explicitly name another agent.'
        : 'This is a system agent and cannot be edited. Do not attempt to modify it; if the user asks, explain it is read-only.',
      ...agentsLines,
      ...skillsLines,
    ].filter(Boolean)
    return lines.join('\n').slice(0, 6000)
  }

  return [
    '[Team Context]',
    `Page: ${PAGE_LABEL[page]}`,
    'No specific agent is open. If the user asks to change an agent, ask which one.',
    ...agentsLines,
    ...skillsLines,
  ]
    .join('\n')
    .slice(0, 6000)
}

function buildAgentsContextLines(context: TeamAgentsPageContext): string[] {
  const lines = [
    '',
    '[Manage Agents Visible State]',
    `Panel: ${context.panel}`,
    `View: ${context.view}`,
    `Selected agent key: ${context.selectedAgentKey || 'none'}`,
    `Search query: ${context.searchQuery || 'none'}`,
    `Status filters: ${context.statusFilters.length ? context.statusFilters.join(', ') : 'none'}`,
    `Model filters: ${context.modelFilters.length ? context.modelFilters.join(', ') : 'none'}`,
    `Sort: ${context.sort}`,
    `Group by: ${context.groupBy}`,
    `Visible agents: ${context.visibleAgentCount} of ${context.totalAgentCount}`,
  ]

  if (context.visibleGroups.length > 0) {
    lines.push('Visible groups:')
    for (const group of context.visibleGroups) {
      lines.push(`- ${group.label} (${group.count})`)
    }
  }

  if (context.visibleAgents.length > 0) {
    lines.push('Visible agent list:')
    for (const agent of context.visibleAgents) {
      lines.push(
        `- ${agent.name} /${agent.agent_key} (${agent.level ?? 'unknown level'}, ${
          agent.status ?? 'unknown status'
        }, ${agent.is_active ? 'active' : 'inactive'}, model ${agent.model_label ?? agent.model_id ?? 'unknown'}, team ${
          agent.team_name ?? 'none'
        })`,
      )
    }
    if (context.visibleAgentsTruncated) lines.push('- Additional visible agents are not listed.')
  }

  if (context.selectedAgent) {
    const agent = context.selectedAgent
    lines.push('', '[Open Agent Detail]')
    lines.push(`Name: ${agent.name}`)
    lines.push(`Key: ${agent.agent_key}`)
    lines.push(`Role: ${agent.role ?? 'none'}`)
    lines.push(`Level: ${agent.level ?? 'unknown'}`)
    lines.push(`Specialty: ${agent.specialty ?? 'none'}`)
    lines.push(`Status: ${agent.status ?? 'unknown'} (${agent.is_active ? 'active' : 'inactive'})`)
    lines.push(`Model: ${agent.model_label ?? agent.model_id ?? 'unknown'}`)
    lines.push(`Team: ${agent.team_name ?? 'none'}`)
    lines.push(`Bio: ${agent.bio ?? 'none'}`)
    lines.push(`Editable in UI: ${agent.managementDisabled ? 'no' : 'yes'}`)
    lines.push(`Access tab visible: ${agent.showAccessTab ? 'yes' : 'no'}`)
    lines.push(`Has brain: ${agent.hasBrain ? 'yes' : 'no'}`)
    lines.push(
      `Missions: ${agent.activeMissionCount} active, ${agent.blockedMissionCount} blocked, ${agent.todoMissionCount} todo, ${agent.completedMissionCount} completed, ${agent.completedThisMonth} completed this month`,
    )
    lines.push(
      `Quality: overall ${agent.overallScore ?? 'none'}, missions scored ${agent.missionsScored}, success rate ${
        agent.successRate ?? 'none'
      }, average completion ${agent.averageCompletionRate ?? 'none'}, last active ${
        agent.lastActiveLabel ?? 'unknown'
      }`,
    )
    lines.push(
      `Assigned campaigns: ${
        agent.assignedCampaignNames.length ? agent.assignedCampaignNames.join(', ') : 'none'
      }`,
    )
    lines.push(
      `Skills visible in detail: ${
        agent.skillsLoading
          ? 'loading'
          : agent.skillNames.length
            ? agent.skillNames.join(', ')
            : 'none'
      }`,
    )
    if (agent.skillsError) lines.push(`Skills load error: ${agent.skillsError}`)
    lines.push(
      `Workflows visible in detail: ${
        agent.workflowNames.length ? agent.workflowNames.join(', ') : 'none'
      }`,
    )
    lines.push(
      `Channels visible in communication: ${
        agent.channelNames.length ? agent.channelNames.join(', ') : 'none'
      }`,
    )
  }

  const openModals = Object.entries(context.modalState)
    .filter(([, open]) => open)
    .map(([key]) => key)
  lines.push(`Open modals: ${openModals.length ? openModals.join(', ') : 'none'}`)

  return lines
}

function buildSkillsContextLines(context: TeamSkillsPageContext): string[] {
  const lines = [
    '',
    '[Manage Skills Visible State]',
    `Panel: ${context.panel}`,
    `Skills view: ${context.viewKey}`,
    `Selected agent key: ${context.selectedAgentKey || 'none'}`,
    `Search query: ${context.searchQuery || 'none'}`,
    `Active filters: ${context.activeFilters.length ? context.activeFilters.join(', ') : 'none'}`,
    `Visible skills: ${context.visibleSkillCount} of ${context.totalSkillCount}`,
  ]

  if (context.loadError) lines.push(`Load error visible: ${context.loadError}`)

  if (context.visibleSkills.length > 0) {
    lines.push('Visible skill list:')
    for (const skill of context.visibleSkills) {
      lines.push(
        `- ${skill.name} /${skill.skill_key} (agent ${skill.agent_key}, ${
          skill.is_enabled ? 'enabled' : 'disabled'
        }, ${skill.source ?? 'unknown source'})`,
      )
    }
    if (context.visibleSkillsTruncated) lines.push('- Additional visible skills are not listed.')
  }

  if (context.selectedSkill) {
    const skill = context.selectedSkill
    lines.push('', '[Open Skill]')
    lines.push(`Name: ${skill.name}`)
    lines.push(`Key: ${skill.skill_key}`)
    lines.push(`Agent key: ${skill.agent_key}`)
    lines.push(`Status: ${skill.is_enabled ? 'enabled' : 'disabled'}`)
    lines.push(`Source: ${skill.source ?? 'unknown'}`)
    if (skill.description) lines.push(`Description: ${skill.description}`)
    if (skill.resource_paths.length > 0) {
      lines.push(`Resources: ${skill.resource_paths.join(', ')}`)
      if (skill.resource_paths_truncated) lines.push('More resources exist but are not listed.')
    } else {
      lines.push('Resources: none')
    }
    lines.push('Skill markdown visible to user:')
    lines.push(skill.markdown_excerpt || '(empty)')
    if (skill.markdown_truncated) lines.push('[Skill markdown truncated in page context]')
  }

  if (context.selectedResource) {
    const resource = context.selectedResource
    lines.push('', '[Open Skill Resource]')
    lines.push(`Path: ${resource.file_path}`)
    lines.push(`Content type: ${resource.content_type ?? 'unknown'}`)
    lines.push(`Storage URL: ${resource.storage_url ?? 'none'}`)
    lines.push('Resource content visible to user:')
    lines.push(resource.content_excerpt || '(no text content)')
    if (resource.content_truncated) lines.push('[Resource content truncated in page context]')
  }

  return lines
}
