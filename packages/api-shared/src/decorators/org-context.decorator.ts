import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { RequestScope } from '../services/org-scope.service'

export const OrgContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestScope => {
    const request = ctx.switchToHttp().getRequest()
    return {
      userId: request.user?.id,
      orgId: request.orgId ?? null,
      orgRole: request.orgRole ?? null,
    }
  },
)
