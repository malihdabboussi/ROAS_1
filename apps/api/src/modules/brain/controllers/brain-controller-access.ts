import { ForbiddenException } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'

export function assertBrainFeatureAllowed(scope: RequestScope) {
  if (scope.orgId && scope.orgRole === 'viewer') {
    throw new ForbiddenException('Viewers cannot access Brain')
  }
}
