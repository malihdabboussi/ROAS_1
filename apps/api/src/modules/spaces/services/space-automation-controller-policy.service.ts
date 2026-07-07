import { ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type OrgRole } from '../../org/dto'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { assertAutomationValidWhenEnabled } from './space-automation-publishable'
import { SpaceAutomationSchedulerService } from './space-automation-scheduler.service'

@Injectable()
export class SpaceAutomationControllerPolicyService {
  constructor(
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly schedulerService: SpaceAutomationSchedulerService,
  ) {}

  async syncScheduleColumns(
    supabase: SupabaseClient,
    spaceId: string,
    automation: Record<string, unknown>,
  ): Promise<void> {
    const automationId = String(automation.id ?? '')
    if (!automationId) return
    const next = this.schedulerService.computeInitialNextFireAt(automation)
    await this.automationsRepo.updateScheduleFields(supabase, spaceId, automationId, {
      schedule_next_fire_at: next ? next.toISOString() : null,
    })
  }

  assertCanMutateAutomation(
    automation: Record<string, unknown>,
    userId: string,
    effectiveLevel: 'view' | 'edit' | 'admin',
  ): void {
    if (effectiveLevel === 'admin') return
    const createdBy = typeof automation.created_by === 'string' ? automation.created_by : null
    if (createdBy && createdBy === userId) return
    throw new ForbiddenException(
      'You can only modify automations you created. Ask an admin to change others.',
    )
  }

  assertCanUseFathomSource(
    body: { trigger?: { type?: unknown; source?: unknown } | undefined },
    orgRole: OrgRole | null | undefined,
  ): void {
    const trigger = body.trigger
    if (!trigger || trigger.type !== 'external_fathom_recording_ready') return
    const source = trigger.source as { mode?: string } | undefined
    const mode = source?.mode ?? 'self'
    if (mode === 'self') return
    if (orgRole !== 'admin' && orgRole !== 'owner') {
      throw new ForbiddenException(
        'Only org admin/owner can build a Fathom rule that listens to another user or team.',
      )
    }
  }

  validateFlowCandidate(candidate: Record<string, unknown>) {
    try {
      assertAutomationValidWhenEnabled({ ...candidate, is_draft: false, enabled: true })
      return { valid: true, errors: [] as string[] }
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Flow validation failed'],
      }
    }
  }
}
