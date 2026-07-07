import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { SpacePermissionsService } from './space-permissions.service'

@Injectable()
export class SpaceFlowBuilderAccessService {
  constructor(private readonly permissionsService: SpacePermissionsService) {}

  assertSpaceAccess(
    supabase: SupabaseClient,
    userId: string,
    spaceId: string,
    scope: RequestScope,
    level: 'view' | 'edit',
  ) {
    return this.permissionsService.assertCanAccessSpace(
      supabase,
      userId,
      scope.orgRole,
      spaceId,
      level,
      scope.orgId,
    )
  }
}
