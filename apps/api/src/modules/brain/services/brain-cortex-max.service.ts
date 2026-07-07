import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { BrainCortexMaxRepository } from '../repositories/brain-cortex-max.repository'
import { BrainPermissionsService } from './brain-permissions.service'

@Injectable()
export class BrainCortexMaxService {
  constructor(
    private readonly repo: BrainCortexMaxRepository,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  async setBrainImage(input: {
    brainId: string
    userId: string
    scope: RequestScope
    imageUrl: string | null
  }) {
    const brain = await this.repo.findBrainForImage(input.brainId)
    if (!brain) throw new NotFoundException('Brain not found')

    const ownsBrain = brain.owner_id === input.userId
    const sharesOrg = input.scope.orgId != null && brain.org_id === input.scope.orgId
    const isOrgAdmin =
      sharesOrg && (input.scope.orgRole === 'owner' || input.scope.orgRole === 'admin')

    if (brain.scope === 'company' || brain.scope === 'customer') {
      if (!isOrgAdmin) {
        throw new ForbiddenException('Only owner or admin can change this brain image')
      }
    } else if (!ownsBrain && !isOrgAdmin) {
      throw new ForbiddenException('Not authorized to change this brain image')
    }

    const nextValue =
      typeof input.imageUrl === 'string' && input.imageUrl.trim().length > 0
        ? input.imageUrl.trim()
        : null

    try {
      await this.repo.updateBrainImage(input.brainId, nextValue)
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error))
    }

    return { success: true, brain_id: input.brainId, image_url: nextValue }
  }

  async toggleCortexMax(input: {
    brainId: string
    userId: string
    scope: RequestScope
    supabase: SupabaseClient
    enabled: boolean
  }) {
    const brain = await this.repo.findBrainForCortexToggle(input.brainId)
    if (!brain) throw new NotFoundException('Brain not found')

    await this.brainPermissions.assertCanTrainBrain(
      input.supabase,
      input.userId,
      input.scope,
      input.brainId,
    )

    const enabled = input.enabled === true
    try {
      await this.repo.updateCortexMax(input.brainId, enabled)
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : String(error))
    }

    let initialSyncTriggered = false
    if (enabled && !brain.last_library_sync_at) {
      const memoryCount = await this.repo.countBrainMemories(input.brainId)
      if (memoryCount >= 50) {
        initialSyncTriggered = await this.repo.enqueueInitialLibrarySync({
          brainId: input.brainId,
          userId: brain.owner_id,
          orgId: brain.org_id ?? null,
        })
      }
    }

    return {
      success: true,
      cortex_max: enabled,
      initial_sync_triggered: initialSyncTriggered,
    }
  }

  async getNarrativePages(input: {
    brainId: string
    userId: string
    scope: RequestScope
    supabase: SupabaseClient
  }) {
    const brain = await this.repo.findBrainForNarrativePages(input.brainId)
    if (!brain) throw new NotFoundException('Brain not found')

    await this.brainPermissions.assertCanQueryBrain(
      input.supabase,
      input.userId,
      input.scope,
      input.brainId,
    )

    const pages = await this.repo.listActiveNarrativePages(input.brainId)
    return {
      success: true,
      cortex_max: brain.cortex_max === true,
      pages,
    }
  }

  async getTimelines(input: {
    brainId: string
    userId: string
    scope: RequestScope
    supabase: SupabaseClient
  }) {
    const brain = await this.repo.findBrainForNarrativePages(input.brainId)
    if (!brain) throw new NotFoundException('Brain not found')

    await this.brainPermissions.assertCanQueryBrain(
      input.supabase,
      input.userId,
      input.scope,
      input.brainId,
    )

    const timelines = await this.repo.listActiveTimelines(input.brainId)
    return {
      success: true,
      cortex_max: brain.cortex_max === true,
      timelines,
    }
  }

  async getTimelineItems(input: {
    brainId: string
    timelineId: string
    userId: string
    scope: RequestScope
    supabase: SupabaseClient
  }) {
    const brain = await this.repo.findBrainForNarrativePages(input.brainId)
    if (!brain) throw new NotFoundException('Brain not found')

    await this.brainPermissions.assertCanQueryBrain(
      input.supabase,
      input.userId,
      input.scope,
      input.brainId,
    )

    const items = await this.repo.listTimelineItems(input.brainId, input.timelineId)
    return {
      success: true,
      cortex_max: brain.cortex_max === true,
      items,
    }
  }
}
