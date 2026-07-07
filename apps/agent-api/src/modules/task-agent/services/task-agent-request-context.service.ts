import { Injectable, Optional } from '@nestjs/common'
import { RequestContextService } from '../../shared/services/request-context.service'

interface TaskAgentScopeInput {
  itemId: string
  userId: string
  campaignId: string | null
  spaceId: string
  orgId: string | null
}

@Injectable()
export class TaskAgentRequestContextService {
  constructor(@Optional() private readonly requestContext?: RequestContextService) {}

  setScope(input: TaskAgentScopeInput): void {
    const scopeKind = input.campaignId ? 'campaign' : 'shared_space'
    this.requestContext?.set(
      input.itemId,
      input.userId,
      input.campaignId,
      '',
      null,
      null,
      input.orgId ?? null,
      'studio',
      null,
      input.spaceId,
      scopeKind,
    )
  }

  clearScope(itemId: string): void {
    this.requestContext?.clear(itemId)
  }
}
