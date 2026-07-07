import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MachinesRepository } from '../repositories/machines.repository'

export type MachineWakeAttemptStatus =
  | 'running'
  | 'succeeded'
  | 'failed_retryable'
  | 'failed_terminal'

export type MachineWakeAttemptPhase =
  | 'profile_lookup'
  | 'fly_state_check'
  | 'provision'
  | 'start_machine'
  | 'health_check'
  | 'capability_probe'
  | 'identity_bind'
  | 'ready_probe'
  | 'running'
  | 'failed'

export type MachineWakePhase = MachineWakeAttemptPhase

export interface MachineWakeAttemptStartInput {
  userId: string
  machineId?: string | null
  flyApp?: string | null
  requestedBy: string
  metadata?: Record<string, unknown>
}

export interface MachineWakeAttemptFailInput {
  phase: MachineWakePhase
  status: Extract<MachineWakeAttemptStatus, 'failed_retryable' | 'failed_terminal'>
  failureCode: string
  errorMessage: string
  metadata?: Record<string, unknown>
}

@Injectable()
export class MachineWakeAttemptsService {
  private readonly logger = new Logger(MachineWakeAttemptsService.name)

  constructor(private readonly machinesRepository: MachinesRepository) {}

  async start(
    supabase: SupabaseClient,
    input: MachineWakeAttemptStartInput,
  ): Promise<string | null> {
    const result = await this.machinesRepository.createWakeAttempt(supabase, input)
    if (result.errorMessage) {
      this.logger.warn(
        `Failed to create machine wake attempt for ${input.userId}: ${result.errorMessage}`,
      )
      return null
    }
    return result.id
  }

  async phase(
    supabase: SupabaseClient,
    attemptId: string | null,
    phase: MachineWakePhase,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!attemptId) return
    await this.update(supabase, attemptId, {
      phase,
      ...(metadata ? { metadata } : {}),
    })
  }

  async succeed(
    supabase: SupabaseClient,
    attemptId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    if (!attemptId) return
    await this.update(supabase, attemptId, {
      status: 'succeeded',
      phase: 'running',
      failure_code: null,
      error_message: null,
      completed_at: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    })
  }

  async fail(
    supabase: SupabaseClient,
    attemptId: string | null,
    input: MachineWakeAttemptFailInput,
  ): Promise<void> {
    if (!attemptId) return
    await this.update(supabase, attemptId, {
      status: input.status,
      phase: input.phase,
      failure_code: input.failureCode,
      error_message: input.errorMessage.slice(0, 1000),
      completed_at: new Date().toISOString(),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    })
  }

  private async update(
    supabase: SupabaseClient,
    attemptId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const errorMessage = await this.machinesRepository.updateWakeAttempt(supabase, attemptId, patch)
    if (errorMessage) {
      this.logger.warn(`Failed to update machine wake attempt ${attemptId}: ${errorMessage}`)
    }
  }
}
