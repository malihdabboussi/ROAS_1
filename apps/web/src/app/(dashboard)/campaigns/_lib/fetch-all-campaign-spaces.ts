import { fetchSpacesPage } from '@/features/spaces/services/spaces.service'
import type { Space } from '@/features/spaces/types'

export async function fetchAllCampaignSpaces(): Promise<Space[]> {
  const spaces: Space[] = []
  let cursor: string | null = null

  do {
    const page = await fetchSpacesPage({ limit: 100, cursor })
    spaces.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)

  return spaces
}
