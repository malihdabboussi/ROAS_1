import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildMachineProfileUpdate,
  type MachineProfileColumns,
  SupabaseServiceClient,
} from '@vibey/api-shared'

type DirectInviteCodeRow = {
  id: string
  max_uses: number | null
  uses_count: number
  expires_at: string | null
}

type MachineWakeAttemptStartRowInput = {
  userId: string
  machineId?: string | null
  flyApp?: string | null
  requestedBy: string
  metadata?: Record<string, unknown>
}

export type MachineStatusCount = { status: string; count: number }
export type MachineStatusSnapshotRow = {
  snapshot_at: string
  running: number
  estimated_hourly_cost: number
}
export type MachineReconciliationProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  machineId: string
  runtimeApp: string | null
  runtimeStatus: string | null
  machineStatus: string | null
  lastActivityAt: string | null
}
export type MachinePoolRow = {
  machine_id: string
  fly_app: string
  state: string
  claimed_by: string | null
  claimed_at: string | null
  failed_reason: string | null
}

@Injectable()
export class MachinesRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async hasActiveSubscription(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .maybeSingle()
    return Boolean(data)
  }

  async listActiveOrgRoles(supabase: SupabaseClient, userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('org_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('status', 'active')
    return Array.isArray(data) ? data.map((row) => String(row.role)) : []
  }

  async findActiveInviteCode(inviteCode: string): Promise<DirectInviteCodeRow | null> {
    const { data } = await this.serviceClient.client
      .from('direct_invite_codes')
      .select('id, max_uses, uses_count, expires_at')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .maybeSingle()
    return (data ?? null) as DirectInviteCodeRow | null
  }

  async findFreePlanId(): Promise<string | null> {
    const { data } = await this.serviceClient.client
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'free')
      .maybeSingle()
    return (data?.id as string | undefined) ?? null
  }

  async upsertFreeSubscription(userId: string, planId: string): Promise<void> {
    await this.serviceClient.client
      .from('user_subscriptions')
      .upsert({ user_id: userId, plan_id: planId, status: 'active' }, { onConflict: 'user_id' })
  }

  async incrementInviteUses(inviteCodeId: string, usesCount: number): Promise<void> {
    await this.serviceClient.client
      .from('direct_invite_codes')
      .update({ uses_count: usesCount })
      .eq('id', inviteCodeId)
  }

  async createWakeAttempt(
    supabase: SupabaseClient,
    input: MachineWakeAttemptStartRowInput,
  ): Promise<{ id: string | null; errorMessage: string | null }> {
    const { data, error } = await supabase
      .from('machine_wake_attempts')
      .insert({
        user_id: input.userId,
        machine_id: input.machineId ?? null,
        fly_app: input.flyApp ?? null,
        requested_by: input.requestedBy,
        status: 'running',
        phase: 'profile_lookup',
        metadata: input.metadata ?? {},
      })
      .select('id')
      .single()

    if (error) return { id: null, errorMessage: error.message }
    const id = (data as { id?: unknown } | null)?.id
    return { id: typeof id === 'string' && id.length > 0 ? id : null, errorMessage: null }
  }

  async updateWakeAttempt(
    supabase: SupabaseClient,
    attemptId: string,
    patch: Record<string, unknown>,
  ): Promise<string | null> {
    const { error } = await supabase
      .from('machine_wake_attempts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', attemptId)
    return error?.message ?? null
  }

  async listIdleProfiles(
    cutoff: string,
    columns: MachineProfileColumns,
  ): Promise<Array<{ id: string }>> {
    const { data } = await this.serviceClient.client
      .from('profiles')
      .select(`id, ${columns.machineId}, ${columns.runtimeApp}`)
      .eq(columns.runtimeStatus, 'running')
      .lt(columns.runtimeLastActivityAt, cutoff)
    return (data ?? []) as unknown as Array<{ id: string }>
  }

  async listStaleProfiles(
    cutoff: string,
    columns: MachineProfileColumns,
  ): Promise<Array<{ id: string }>> {
    const { data } = await this.serviceClient.client
      .from('profiles')
      .select(`id, ${columns.machineId}, ${columns.runtimeApp}`)
      .not(columns.machineId, 'is', null)
      .lt(columns.runtimeLastActivityAt, cutoff)
    return (data ?? []) as unknown as Array<{ id: string }>
  }

  async listPublishedRunningProfileIds(columns: MachineProfileColumns): Promise<string[]> {
    const { data } = await this.serviceClient.client
      .from('profiles')
      .select(`id, ${columns.runtimeStatus}, project_repos!inner(id)`)
      .eq(columns.runtimeStatus, 'running')
      .eq('project_repos.is_published', true)
      .eq('project_repos.deploy_status', 'running')
    return (((data as unknown as Array<{ id: string }>) ?? []) as Array<{ id: string }>).map(
      (row) => row.id,
    )
  }

  async listMachineStatusSnapshots(since: string): Promise<MachineStatusSnapshotRow[]> {
    const { data } = await this.serviceClient.client
      .from('machine_status_snapshots')
      .select('snapshot_at, running, estimated_hourly_cost')
      .gte('snapshot_at', since)
      .order('snapshot_at', { ascending: true })
    return (data ?? []) as MachineStatusSnapshotRow[]
  }

  async getMachineStatusCounts(environment: string): Promise<MachineStatusCount[]> {
    const { data } = await this.serviceClient.client.rpc('get_machine_status_counts', {
      p_environment: environment,
    })
    return (Array.isArray(data) ? data : []) as MachineStatusCount[]
  }

  async countRunningProfilesWithMachines(columns: MachineProfileColumns): Promise<number> {
    const { count } = await this.serviceClient.client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq(columns.runtimeStatus, 'running')
      .not(columns.machineId, 'is', null)
    return count ?? 0
  }

  async insertMachineStatusSnapshot(input: {
    total: number
    running: number
    suspended: number
    failed: number
    noneStatus: number
    alwaysOn: number
    estimatedHourlyCost: number
  }): Promise<void> {
    await this.serviceClient.client.from('machine_status_snapshots').insert({
      total_machines: input.total,
      running: input.running,
      suspended: input.suspended,
      failed: input.failed,
      none_status: input.noneStatus,
      always_on: input.alwaysOn,
      estimated_hourly_cost: input.estimatedHourlyCost,
    })
  }

  async listReconciliationProfileRows(
    columns: MachineProfileColumns,
  ): Promise<MachineReconciliationProfileRow[]> {
    const selectFields = [
      'id',
      'email',
      'full_name',
      columns.machineId,
      columns.runtimeApp,
      columns.runtimeStatus,
      columns.machineStatus,
      columns.runtimeLastActivityAt,
    ].join(', ')

    const { data, error } = await this.serviceClient.client
      .from('profiles')
      .select(selectFields)
      .not(columns.machineId, 'is', null)

    if (error) {
      throw new Error(`Failed to load profile machine rows: ${error.message}`)
    }

    return ((data ?? []) as unknown as Array<Record<string, unknown>>)
      .map((row) => ({
        id: String(row.id),
        email: typeof row.email === 'string' ? row.email : null,
        full_name: typeof row.full_name === 'string' ? row.full_name : null,
        machineId: String(row[columns.machineId] ?? ''),
        runtimeApp:
          typeof row[columns.runtimeApp] === 'string' ? (row[columns.runtimeApp] as string) : null,
        runtimeStatus:
          typeof row[columns.runtimeStatus] === 'string'
            ? (row[columns.runtimeStatus] as string)
            : null,
        machineStatus:
          typeof row[columns.machineStatus] === 'string'
            ? (row[columns.machineStatus] as string)
            : null,
        lastActivityAt:
          typeof row[columns.runtimeLastActivityAt] === 'string'
            ? (row[columns.runtimeLastActivityAt] as string)
            : null,
      }))
      .filter((row) => row.machineId.length > 0)
  }

  async listMachinePoolRows(): Promise<MachinePoolRow[]> {
    const { data, error } = await this.serviceClient.client
      .from('machine_pool')
      .select('machine_id, fly_app, state, claimed_by, claimed_at, failed_reason')

    if (error) {
      throw new Error(`Failed to load machine pool rows: ${error.message}`)
    }

    return ((data ?? []) as MachinePoolRow[]) ?? []
  }

  async updateReconciliationProfileStatus(
    columns: MachineProfileColumns,
    input: {
      id: string
      machineId: string
      runtimeStatus: 'suspended' | 'unknown'
      machineStatus: 'suspended' | 'unknown'
    },
  ): Promise<string | null> {
    const { error } = await this.serviceClient.client
      .from('profiles')
      .update(
        buildMachineProfileUpdate(columns, {
          runtimeStatus: input.runtimeStatus,
          machineStatus: input.machineStatus,
          runtimeLastActivityAt: null,
        }),
      )
      .eq('id', input.id)
      .eq(columns.machineId, input.machineId)

    return error?.message ?? null
  }
}
