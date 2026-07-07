import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class OrgThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const orgId = req.orgId as string | undefined
    if (orgId) return `org:${orgId}`

    const userId = req.user?.id as string | undefined
    if (userId) return `user:${userId}`

    return req.ip ?? 'unknown'
  }
}
