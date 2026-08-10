import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hasSharedRailwayRuntime,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
  type RequestScope,
} from '@vibey/api-shared'
import { FlyMachineStateService } from '../../machines/services/fly-machine-state.service'
import { MachinesService } from '../../machines/services/machines.service'
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'
import { OnboardingRepository } from '../repositories/onboarding.repository'
import type {
  OnboardingRetryAction,
  OnboardingStatusResponse,
  OnboardingStep,
} from '../types/onboarding-status.types'

@Injectable()
export class OnboardingStatusService {
  private readonly logger = new Logger(OnboardingStatusService.name)
  private readonly machineColumns = resolveMachineProfileColumns(process.env)

  constructor(
    private readonly machinesService: MachinesService,
    private readonly flyState: FlyMachineStateService,
    private readonly agentOperations: MissionsAgentOperationsService,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async getStatus(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
  ): Promise<OnboardingStatusResponse> {
    const runtime = await this.getRuntimeStatus(supabase, userId)
    const org = await this.getOrgStatus(supabase, userId, scope.orgId)

    if (!org.ready) {
      return this.response('working', 'building_team', runtime, org, 'onboard_org')
    }

    if (runtime.ready) {
      return this.response('ready', 'running_final_check', runtime, org, null)
    }

    if (!runtime.machineId) {
      return this.response('working', 'preparing_workspace', runtime, org, 'provision_machine')
    }

    if (runtime.state === 'destroyed' || runtime.state === 'destroying') {
      return this.response(
        'recoverable_error',
        'preparing_workspace',
        runtime,
        org,
        'provision_machine',
      )
    }

    if (runtime.state !== 'started') {
      return this.response('working', 'turning_things_on', runtime, org, 'ensure_running')
    }

    if (!runtime.ready) {
      return this.response('working', 'running_final_check', runtime, org, 'ensure_running')
    }

    return this.response('ready', 'running_final_check', runtime, org, null)
  }

  async retry(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
  ): Promise<OnboardingStatusResponse> {
    const status = await this.getStatus(supabase, userId, scope)

    try {
      if (status.retry_action === 'onboard_org') {
        await this.agentOperations.onboardFirstAgent(
          supabase,
          userId,
          {
            archetype: 'ceo',
            name: 'Pixel',
            style: 'balanced',
            avatar_mode: 'animation',
          },
          scope.orgId,
        )
      }

      if (status.retry_action === 'provision_machine') {
        await this.machinesService.provision(supabase, userId)
      }

      if (status.retry_action === 'ensure_running') {
        await this.machinesService.ensureRunning(supabase, userId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Onboarding retry failed for user ${userId}: ${message}`)
    }

    return this.getStatus(supabase, userId, scope)
  }

  private async getRuntimeStatus(supabase: SupabaseClient, userId: string) {
    const selectFields = [
      this.machineColumns.machineId,
      this.machineColumns.runtimeApp,
      this.machineColumns.machineUrl,
      this.machineColumns.runtimeType,
      this.machineColumns.runtimeUrl,
    ].join(', ')

    const { data: profileRow, error } = await this.onboardingRepository.getProfileMachineRow(
      supabase,
      userId,
      selectFields,
    )

    if (error) {
      this.logger.warn(`Failed to read onboarding profile for ${userId}: ${error.message}`)
      return { ready: false, machineId: null, state: null }
    }

    const profile = resolveMachineProfileRow(
      profileRow as unknown as Record<string, unknown> | null,
      this.machineColumns,
    )
    if (hasSharedRailwayRuntime(profile)) {
      return { ready: true, machineId: null, state: 'shared_railway' }
    }

    const machineId = typeof profile.machineId === 'string' ? profile.machineId.trim() : ''
    if (!machineId) return { ready: false, machineId: null, state: null }

    const app = profile.runtimeApp || this.machinesService.flyRuntimeApp
    const state = await this.flyState.getMachineState(machineId, app)
    const ready =
      state === 'started' ? await this.machinesService.probeReadyEndpoint(machineId, app) : false

    return { ready, machineId, state }
  }

  private async getOrgStatus(supabase: SupabaseClient, userId: string, orgId: string | null) {
    if (!orgId) return { ready: true, activeOrgId: null }
    const status = await this.agentOperations.checkOrgOnboardingStatus(supabase, userId, orgId)
    return { ready: status.onboarded === true, activeOrgId: orgId }
  }

  private response(
    overall: OnboardingStatusResponse['overall'],
    currentStep: OnboardingStep,
    runtime: { ready: boolean; machineId: string | null; state: string | null },
    org: { ready: boolean; activeOrgId: string | null },
    retryAction: OnboardingRetryAction,
  ): OnboardingStatusResponse {
    return {
      overall,
      current_step: currentStep,
      runtime: {
        ready: runtime.ready,
        machine_id: runtime.machineId,
        state: runtime.state,
      },
      org: {
        ready: org.ready,
        active_org_id: org.activeOrgId,
      },
      retry_action: retryAction,
    }
  }
}
