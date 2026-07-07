import { MARKETING_AGENT_LIBRARY_FALLBACK } from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

/** Human assignee avatar (CEO preview), aligned with SpacesHeroMockup Kanban fillers */
export const MARKETING_SPACE_SHOWCASE_HUMAN_PHOTO =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces&auto=format&q=82'

export function marketingAgentPortraitByRoleKey(
  roleKey: string,
  libraryAgents?: PublicAgentLibraryRow[],
): string {
  return (
    libraryAgents?.find((a) => a.role_key === roleKey)?.image_url ??
    MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === roleKey)?.image_url ??
    ''
  )
}

function agentRow(roleKey: string, libraryAgents?: PublicAgentLibraryRow[]) {
  return (
    libraryAgents?.find((a) => a.role_key === roleKey) ??
    MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === roleKey)
  )
}

/** Faces + first names for Spaces marketing showcase mocks */
export function resolveSpacesShowcasePortraits(libraryAgents?: PublicAgentLibraryRow[]) {
  const analyst = agentRow('analyst', libraryAgents)
  const copywriter = agentRow('copywriter', libraryAgents)

  return {
    analystPhoto: analyst?.image_url ?? '',
    analystFirstName: analyst?.default_name ?? 'Agent',
    copywriterPhoto: copywriter?.image_url ?? '',
    copywriterFirstName: copywriter?.default_name ?? 'Agent',
    humanPhoto: MARKETING_SPACE_SHOWCASE_HUMAN_PHOTO,
  }
}
