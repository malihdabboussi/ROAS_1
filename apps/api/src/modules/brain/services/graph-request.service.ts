import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { GraphRequestRepository } from '../repositories/graph-request.repository'
import { BrainPermissionsService } from './brain-permissions.service'
import { GraphService } from './graph.service'

export interface GraphRequestInput {
  agentId?: string
  brainId?: string
  limit?: string
  minSignificance?: string
  memoryType?: string
}

@Injectable()
export class GraphRequestService {
  constructor(
    private readonly graphService: GraphService,
    private readonly brainPermissions: BrainPermissionsService,
    private readonly graphRequestRepository: GraphRequestRepository,
  ) {}

  async buildGraphForRequest(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
    input: GraphRequestInput,
  ) {
    const brainId = input.brainId?.trim()
    if (!brainId) {
      return this.graphService.buildGraph(supabase, {
        agent_id: input.agentId,
        owner_id: userId,
        org_id: scope.orgId,
        limit: input.limit ? Number(input.limit) : undefined,
        min_significance: input.minSignificance ? Number(input.minSignificance) : undefined,
        memory_type: input.memoryType,
      })
    }

    await this.brainPermissions.assertCanViewBrain(supabase, userId, scope, brainId)
    const brainScope = await this.loadBrainScope(supabase, brainId)

    if (brainScope !== 'agent') {
      return this.graphService.buildGraph(supabase, {
        owner_id: userId,
        org_id: scope.orgId,
        brain_id: brainId,
        limit: input.limit ? Number(input.limit) : undefined,
        min_significance: input.minSignificance ? Number(input.minSignificance) : undefined,
        memory_type: input.memoryType,
      })
    }

    return this.graphService.buildSkGraph(
      supabase,
      userId,
      brainId,
      scope.orgId,
      input.limit ? Number(input.limit) : undefined,
    )
  }

  private async loadBrainScope(supabase: SupabaseClient, brainId: string): Promise<string | null> {
    return this.graphRequestRepository.loadBrainScope(supabase, brainId)
  }
}
