import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { YourTurnItem, YourTurnQuery } from '../dto'
import { YourTurnRepository } from '../repositories/your-turn.repository'

@Injectable()
export class YourTurnService {
  constructor(private readonly yourTurnRepository: YourTurnRepository) {}

  async list(
    supabase: SupabaseClient,
    query: YourTurnQuery,
    workspaceOrgId: string | null,
    userId: string,
  ): Promise<YourTurnItem[]> {
    const feedScope = query.feed_scope ?? 'workspace'

    if (feedScope === 'org' && query.feed_org_id) {
      const membership = await this.yourTurnRepository.findActiveOrgMembership(
        supabase,
        query.feed_org_id,
        userId,
      )
      if (!membership) throw new ForbiddenException('Not a member of that organization')
    }

    let campaignSpaceIds: Set<string> | null = null
    if (query.campaign_id) {
      const ids = await this.yourTurnRepository.listSpaceIdsForCampaign(supabase, query.campaign_id)
      if (ids.length === 0) return []
      campaignSpaceIds = new Set(ids)
    }

    let rows = await this.yourTurnRepository.listYourTurnItems(supabase, {
      kind: query.kind,
      since: query.since,
      limit: query.limit,
    })

    if (feedScope === 'personal') {
      rows = rows.filter((r) => r.org_id == null)
    } else if (feedScope === 'workspace') {
      if (workspaceOrgId) {
        rows = rows.filter((r) => r.org_id === workspaceOrgId || r.org_id == null)
      } else {
        rows = rows.filter((r) => r.org_id == null)
      }
    } else if (feedScope === 'org' && query.feed_org_id) {
      rows = rows.filter((r) => r.org_id === query.feed_org_id)
    }

    if (campaignSpaceIds) {
      rows = rows.filter((r) => r.space_id !== null && campaignSpaceIds!.has(r.space_id))
    }

    return rows
  }
}
