import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type RequestScope } from '@vibey/api-shared'
import { MachinesRepository } from '../repositories/machines.repository'

@Injectable()
export class MachineProvisionAccessService {
  private readonly logger = new Logger(MachineProvisionAccessService.name)
  private readonly runtimeEligibleOrgRoles = new Set(['owner', 'admin', 'creator', 'editor'])

  constructor(private readonly machinesRepository: MachinesRepository) {}

  async hasActiveSubscription(supabase: SupabaseClient, userId: string): Promise<boolean> {
    return this.machinesRepository.hasActiveSubscription(supabase, userId)
  }

  async hasRuntimeEligibleOrgAccess(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
  ): Promise<boolean> {
    if (scope.orgId) {
      return this.runtimeEligibleOrgRoles.has(scope.orgRole ?? '')
    }

    const roles = await this.machinesRepository.listActiveOrgRoles(supabase, userId)
    return roles.some((role) => this.runtimeEligibleOrgRoles.has(role))
  }

  async redeemInviteCodeForFreeSubscription(userId: string, inviteCode: string): Promise<void> {
    const validCode = await this.machinesRepository.findActiveInviteCode(inviteCode)

    const isExpired = validCode?.expires_at ? new Date(validCode.expires_at) < new Date() : false
    const isMaxed =
      validCode?.max_uses !== null &&
      validCode?.max_uses !== undefined &&
      validCode.uses_count >= validCode.max_uses

    if (!validCode || isExpired || isMaxed) {
      throw new ForbiddenException('Invalid or expired invite code')
    }

    const freePlanId = await this.machinesRepository.findFreePlanId()

    if (freePlanId) {
      await this.machinesRepository.upsertFreeSubscription(userId, freePlanId)
      this.logger.log(`Created free subscription for invited user ${userId}`)
    }

    await this.machinesRepository.incrementInviteUses(validCode.id, validCode.uses_count + 1)
  }
}
