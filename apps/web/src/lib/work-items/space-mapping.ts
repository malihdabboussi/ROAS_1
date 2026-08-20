import { backendPost } from '@/lib/api/backend-client'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import { fetchPrograms, type Program } from '@/lib/programs'
import { fetchSpaces, type SpaceSummary } from '@/lib/spaces'

export interface SpaceMappingSpace {
  id: string
  title: string
  visibility: 'private' | 'team'
}

/** One campaign row in the program · campaign → space cascade. */
export interface SpaceMappingGroup {
  campaignId: string
  campaignName: string
  /** "Program · Campaign" when the campaign belongs to a program. */
  label: string
  spaces: SpaceMappingSpace[]
}

/**
 * Groups spaces by campaign (campaign rows carry the program name) so picking a
 * destination remaps an item's program · campaign · space in one move. Same
 * ordering as every scope picker: case-insensitive A–Z at each level.
 */
export function buildSpaceMappingGroups(
  spaces: SpaceSummary[],
  campaigns: Campaign[],
  programs: Program[],
  excludeSpaceId?: string,
): SpaceMappingGroup[] {
  const programNameById = new Map(programs.map((program) => [program.id, program.name]))
  const ordered = [...campaigns].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
  )
  return ordered
    .map((campaign) => {
      const programName = campaign.program_id ? programNameById.get(campaign.program_id) : undefined
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        label: programName ? `${programName} · ${campaign.name}` : campaign.name,
        spaces: spaces
          .filter((space) => space.campaign_id === campaign.id && space.id !== excludeSpaceId)
          .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
          .map((space) => ({
            id: space.id,
            title: space.title,
            visibility: space.visibility ?? ('private' as const),
          })),
      }
    })
    .filter((group) => group.spaces.length > 0)
}

/** Client Workspace name from "Program · Campaign · Space" (second-to-last segment). */
export function campaignNameFromMappingPath(pathLabel: string | undefined): string | null {
  if (!pathLabel) return null
  const parts = pathLabel
    .split(' · ')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 2] ?? null
  return null
}

export async function fetchSpaceMappingGroups(
  excludeSpaceId?: string,
): Promise<SpaceMappingGroup[]> {
  const [spaces, campaigns, programs] = await Promise.all([
    fetchSpaces<SpaceSummary>().catch(() => [] as SpaceSummary[]),
    fetchCampaigns().catch(() => [] as Campaign[]),
    fetchPrograms().catch(() => [] as Program[]),
  ])
  return buildSpaceMappingGroups(spaces, campaigns, programs, excludeSpaceId)
}

/** Relocates a space item (task, follow-up, doc) into another space. */
export function transferItemToSpace(
  sourceSpaceId: string,
  itemId: string,
  targetSpaceId: string,
): Promise<Record<string, unknown>> {
  return backendPost<Record<string, unknown>>(
    `/api/spaces/${sourceSpaceId}/items/${itemId}/transfer-to-space`,
    { target_space_id: targetSpaceId, mode: 'move' },
  )
}
