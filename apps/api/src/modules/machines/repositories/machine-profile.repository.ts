import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildMachineProfileUpdate,
  type CanonicalMachineProfileRow,
  type MachineProfileColumns,
} from '@vibey/api-shared'

type MachineProfileUpdateInput = Partial<CanonicalMachineProfileRow>

export type ProvisionLockResult = {
  acquired?: boolean
  status?: string
  machine_id?: string | null
  machine_url?: string | null
  fly_runtime_app?: string | null
  reason?: string | null
}

@Injectable()
export class MachineProfileRepository {
  async acquireProvisionLock(
    supabase: SupabaseClient,
    userId: string,
    environment: string,
  ): Promise<{ data: ProvisionLockResult | null; errorMessage: string | null }> {
    const { data, error } = await supabase.rpc('acquire_provision_lock', {
      p_user_id: userId,
      p_environment: environment,
    })
    return {
      data: (data ?? null) as ProvisionLockResult | null,
      errorMessage: error?.message ?? null,
    }
  }

  async findProfileRow(
    supabase: SupabaseClient,
    userId: string,
    selectFields: string[],
  ): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('profiles')
      .select(selectFields.join(', '))
      .eq('id', userId)
      .single()
    return (data ?? null) as Record<string, unknown> | null
  }

  async updateProfileMachineFields(
    supabase: SupabaseClient,
    userId: string,
    columns: MachineProfileColumns,
    patch: MachineProfileUpdateInput,
    options: { matchingMachineId?: string } = {},
  ): Promise<string | null> {
    let query = supabase
      .from('profiles')
      .update(buildMachineProfileUpdate(columns, patch))
      .eq('id', userId)

    if (options.matchingMachineId) {
      query = query.eq(columns.machineId, options.matchingMachineId)
    }

    const { error } = await query
    return error?.message ?? null
  }
}
