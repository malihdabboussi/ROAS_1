export type RuntimeEnvironment = 'production' | 'staging'
export type AgentRuntimeType = 'fly_machine' | 'shared_railway'

export type MachineProfileColumns = {
  environment: RuntimeEnvironment
  machineId: string
  machineUrl: string
  machineStatus: string
  runtimeApp: string
  runtimeStatus: string
  runtimeLastActivityAt: string
  runtimeType: string
  runtimeUrl: string
}

export type CanonicalMachineProfileRow = {
  machineId: string | null
  machineUrl: string | null
  machineStatus: string | null
  runtimeApp: string | null
  runtimeStatus: string | null
  runtimeLastActivityAt: string | null
  runtimeType: AgentRuntimeType
  runtimeUrl: string | null
}

type MachineProfileUpdateInput = Partial<CanonicalMachineProfileRow>

function includesStaging(value: string | undefined): boolean {
  return typeof value === 'string' && value.toLowerCase().includes('staging')
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNullableTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeRuntimeType(value: unknown): AgentRuntimeType {
  return value === 'shared_railway' ? 'shared_railway' : 'fly_machine'
}

export function resolveRuntimeEnvironmentName(
  env: Record<string, string | undefined> = process.env,
): RuntimeEnvironment {
  const exactEnvSignals = [
    env.RAILWAY_ENVIRONMENT_NAME,
    env.APP_ENV,
    env.VIBEY_ENV,
    env.RUNTIME_ENV,
    env.NODE_ENV,
  ]
  if (exactEnvSignals.some((value) => value?.toLowerCase() === 'staging')) {
    return 'staging'
  }

  const hintedEnvSignals = [
    env.FLY_APP_NAME,
    env.FLY_RUNTIME_APP,
    env.VERCEL_GIT_COMMIT_REF,
    env.VERCEL_GIT_BRANCH,
    env.BACKEND_URL,
    env.NEXT_PUBLIC_BACKEND_URL,
    env.APP_URL,
    env.NEXT_PUBLIC_APP_URL,
  ]
  if (hintedEnvSignals.some(includesStaging)) {
    return 'staging'
  }

  return 'production'
}

export function resolveMachineProfileColumns(
  env: Record<string, string | undefined> = process.env,
): MachineProfileColumns {
  const environment = resolveRuntimeEnvironmentName(env)
  if (environment === 'staging') {
    return {
      environment,
      machineId: 'fly_machine_id_staging',
      machineUrl: 'fly_machine_url_staging',
      machineStatus: 'fly_machine_status_staging',
      runtimeApp: 'fly_runtime_app_staging',
      runtimeStatus: 'fly_runtime_status_staging',
      runtimeLastActivityAt: 'fly_runtime_last_activity_at_staging',
      runtimeType: 'agent_runtime_type_staging',
      runtimeUrl: 'agent_runtime_url_staging',
    }
  }

  return {
    environment,
    machineId: 'fly_machine_id',
    machineUrl: 'fly_machine_url',
    machineStatus: 'fly_machine_status',
    runtimeApp: 'fly_runtime_app',
    runtimeStatus: 'fly_runtime_status',
    runtimeLastActivityAt: 'fly_runtime_last_activity_at',
    runtimeType: 'agent_runtime_type',
    runtimeUrl: 'agent_runtime_url',
  }
}

export function resolveMachineProfileRow(
  row: Record<string, unknown> | null | undefined,
  columns: MachineProfileColumns,
): CanonicalMachineProfileRow {
  const source = row && typeof row === 'object' ? row : {}
  return {
    machineId: normalizeNullableString(source[columns.machineId]),
    machineUrl: normalizeNullableString(source[columns.machineUrl]),
    machineStatus: normalizeNullableString(source[columns.machineStatus]),
    runtimeApp: normalizeNullableString(source[columns.runtimeApp]),
    runtimeStatus: normalizeNullableString(source[columns.runtimeStatus]),
    runtimeLastActivityAt: normalizeNullableTimestamp(source[columns.runtimeLastActivityAt]),
    runtimeType: normalizeRuntimeType(source[columns.runtimeType]),
    runtimeUrl: normalizeNullableString(source[columns.runtimeUrl]),
  }
}

export function hasSharedRailwayRuntime(
  profile: Pick<CanonicalMachineProfileRow, 'runtimeType' | 'runtimeUrl'> | null | undefined,
): boolean {
  return profile?.runtimeType === 'shared_railway' && Boolean(profile.runtimeUrl)
}

export function buildMachineProfileUpdate(
  columns: MachineProfileColumns,
  values: MachineProfileUpdateInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (values.machineId !== undefined) patch[columns.machineId] = values.machineId
  if (values.machineUrl !== undefined) patch[columns.machineUrl] = values.machineUrl
  if (values.machineStatus !== undefined) patch[columns.machineStatus] = values.machineStatus
  if (values.runtimeApp !== undefined) patch[columns.runtimeApp] = values.runtimeApp
  if (values.runtimeStatus !== undefined) patch[columns.runtimeStatus] = values.runtimeStatus
  if (values.runtimeLastActivityAt !== undefined) {
    patch[columns.runtimeLastActivityAt] = values.runtimeLastActivityAt
  }
  if (values.runtimeType !== undefined) patch[columns.runtimeType] = values.runtimeType
  if (values.runtimeUrl !== undefined) patch[columns.runtimeUrl] = values.runtimeUrl
  return patch
}
