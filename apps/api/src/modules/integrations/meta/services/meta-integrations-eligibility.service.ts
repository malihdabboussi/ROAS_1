import { Injectable } from '@nestjs/common'
import { MetaEligibilityRepository } from '../repositories/meta-eligibility.repository'

@Injectable()
export class MetaIntegrationsEligibilityService {
  constructor(private readonly repository: MetaEligibilityRepository) {}

  /**
   * Meta Ads connect is limited to platform roles admin/enterprise, or an active
   * personal/org subscription whose plan slug starts with `enterprise`.
   */
  async isEligible(userId: string, orgId: string | null): Promise<boolean> {
    const platformRole = await this.repository.findUserRole(userId)
    if (platformRole === 'admin' || platformRole === 'enterprise') return true

    if (orgId) {
      const planId = await this.repository.findOrgSubscriptionPlanId(orgId)
      if (!planId) return false
      return (await this.repository.findPlanSlug(planId)).startsWith('enterprise')
    }

    const planId = await this.repository.findUserSubscriptionPlanId(userId)
    if (!planId) return false
    return (await this.repository.findPlanSlug(planId)).startsWith('enterprise')
  }
}
