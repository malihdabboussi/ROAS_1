import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

export interface FailedPoolMachine {
  machine_id: string
  fly_app: string
  failed_reason: string | null
}

export interface PoolStatusRow {
  state: string
  created_at: string
}

export interface ClaimPoolMachineResult {
  claimed?: boolean
  reason?: string
  machine_id?: string
  fly_app?: string
}

@Injectable()
export class MachinePoolRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async listPoolStatusRows(): Promise<PoolStatusRow[]> {
    const { data, error } = await this.serviceClient.client
      .from('machine_pool')
      .select('state, created_at')
    if (error) throw new Error(`Failed to fetch pool status: ${error.message}`)
    return (data ?? []) as PoolStatusRow[]
  }

  async listFailedPoolMachines(
    limit: number,
  ): Promise<{ data: FailedPoolMachine[]; errorMessage: string | null }> {
    const { data, error } = await this.serviceClient.client
      .from('machine_pool')
      .select('machine_id, fly_app, failed_reason')
      .eq('state', 'failed')
      .limit(limit)
    return {
      data: ((data ?? []) as FailedPoolMachine[]) ?? [],
      errorMessage: error?.message ?? null,
    }
  }

  async countActivePoolMachines(): Promise<{ count: number; errorMessage: string | null }> {
    const { data, error } = await this.serviceClient.client
      .from('machine_pool')
      .select('state')
      .in('state', ['ready', 'provisioning'])
    return { count: data?.length ?? 0, errorMessage: error?.message ?? null }
  }

  async markPoolMachineReady(machineId: string): Promise<string | null> {
    const { error } = await this.serviceClient.client
      .from('machine_pool')
      .update({
        state: 'ready',
        claimed_by: null,
        claimed_at: null,
        failed_reason: null,
      })
      .eq('machine_id', machineId)
    return error?.message ?? null
  }

  async insertProvisioningPoolMachine(machineId: string, flyApp: string): Promise<string | null> {
    const { error } = await this.serviceClient.client.from('machine_pool').insert({
      machine_id: machineId,
      fly_app: flyApp,
      state: 'provisioning',
    })
    return error?.message ?? null
  }

  async markPoolMachineFailed(machineId: string, failedReason: string): Promise<void> {
    await this.serviceClient.client
      .from('machine_pool')
      .update({ state: 'failed', failed_reason: failedReason })
      .eq('machine_id', machineId)
  }

  async claimPoolMachine(
    userId: string,
  ): Promise<{ data: ClaimPoolMachineResult | null; errorMessage: string | null }> {
    const { data, error } = await this.serviceClient.client.rpc('claim_pool_machine', {
      p_user_id: userId,
    })
    return {
      data: (data ?? null) as ClaimPoolMachineResult | null,
      errorMessage: error?.message ?? null,
    }
  }

  async markPoolMachineDestroyFailed(machineId: string): Promise<void> {
    await this.serviceClient.client
      .from('machine_pool')
      .update({ failed_reason: 'destroy_failed' })
      .eq('machine_id', machineId)
  }

  async deletePoolMachine(machineId: string): Promise<string | null> {
    const { error } = await this.serviceClient.client
      .from('machine_pool')
      .delete()
      .eq('machine_id', machineId)
    return error?.message ?? null
  }

  async releaseClaimAsFailed(machineId: string): Promise<void> {
    await this.serviceClient.client
      .from('machine_pool')
      .update({ state: 'failed', failed_reason: 'assignment_failed_released' })
      .eq('machine_id', machineId)
  }
}
