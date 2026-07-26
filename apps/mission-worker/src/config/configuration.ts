export default () => ({
  port: parseInt(process.env.PORT || '3005', 10),

  redis: {
    url: process.env.REDIS_URL_MISSIONS || process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    queuePrefix: process.env.REDIS_QUEUE_PREFIX || 'bull',
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    directDbUrl:
      process.env.SUPABASE_DIRECT_DB_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.DATABASE_URL ||
      '',
  },

  openclaw: {
    gatewayUrl: process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789',
    gatewayToken: process.env.OPENCLAW_GATEWAY_TOKEN || '',
    modelPrefix: process.env.OPENCLAW_MODEL_PREFIX || 'openclaw',
  },

  missions: {
    skipMachineWake: (process.env.MISSIONS_SKIP_MACHINE_WAKE || '').toLowerCase() === 'true',
    batchSize: parseInt(process.env.MISSIONS_BATCH_SIZE || '20', 10),
    executionTimeoutMs: parseInt(process.env.MISSIONS_EXECUTION_TIMEOUT_MS || '1800000', 10),
    executionAbsoluteMaxMs: parseInt(
      process.env.MISSIONS_EXECUTION_ABSOLUTE_MAX_MS || '5400000',
      10,
    ),
    machineWakeWaitMs: parseInt(process.env.MISSIONS_MACHINE_WAKE_WAIT_MS || '45000', 10),
    openclawRequestTimeoutMs: parseInt(
      process.env.MISSIONS_OPENCLAW_REQUEST_TIMEOUT_MS || '5100000',
      10,
    ),
    bullLockDurationMs: parseInt(process.env.MISSIONS_BULL_LOCK_DURATION_MS || '6000000', 10),
    bullStalledIntervalMs: parseInt(process.env.MISSIONS_BULL_STALLED_INTERVAL_MS || '120000', 10),
    stalledMinutes: parseInt(process.env.MISSIONS_STALLED_MINUTES || '10', 10),
    useOutboxDispatch:
      (process.env.MISSIONS_USE_OUTBOX_DISPATCH || 'true').toLowerCase() !== 'false',
    outboxReconcileMs: parseInt(process.env.MISSIONS_OUTBOX_RECONCILE_MS || '60000', 10),
    outboxCircuitBreakerFailures: parseInt(
      process.env.MISSIONS_OUTBOX_CIRCUIT_BREAKER_FAILURES || '5',
      10,
    ),
    outboxCircuitBreakerMs: parseInt(process.env.MISSIONS_OUTBOX_CIRCUIT_BREAKER_MS || '30000', 10),
    managerScopeAmendEnabled:
      (process.env.MISSION_MANAGER_SCOPE_AMEND_ENABLED || 'false').toLowerCase() === 'true',
  },

  brainOps: {
    outboxReconcileMs: parseInt(process.env.BRAIN_OPS_OUTBOX_RECONCILE_MS || '60000', 10),
    nightJanitorSweepMs: parseInt(
      process.env.BRAIN_OPS_NIGHT_JANITOR_SWEEP_MS || String(6 * 60 * 60 * 1000),
      10,
    ),
    customerSignalSweepMs: parseInt(
      process.env.CUSTOMER_SIGNAL_SWEEP_MS || String(15 * 60 * 1000),
      10,
    ),
    customerSignalFlushTokens: parseInt(process.env.CUSTOMER_SIGNAL_FLUSH_TOKENS || '50000', 10),
    customerSignalGraceMinutes: parseInt(process.env.CUSTOMER_SIGNAL_GRACE_MINUTES || '30', 10),
  },

  dreamOps: {
    outboxReconcileMs: parseInt(
      process.env.DREAM_OPS_OUTBOX_RECONCILE_MS ||
        process.env.BRAIN_OPS_OUTBOX_RECONCILE_MS ||
        '60000',
      10,
    ),
    nightJanitorSweepMs: parseInt(
      process.env.DREAM_OPS_NIGHT_JANITOR_SWEEP_MS ||
        process.env.BRAIN_OPS_NIGHT_JANITOR_SWEEP_MS ||
        String(6 * 60 * 60 * 1000),
      10,
    ),
  },

  agentRuntimeAutoscaler: {
    enabled: (process.env.AGENT_RUNTIME_AUTOSCALER_ENABLED || 'false').toLowerCase() === 'true',
    mode: readAutoscalerMode(process.env.AGENT_RUNTIME_AUTOSCALER_MODE),
    pollMs: parseInt(process.env.AGENT_RUNTIME_AUTOSCALER_POLL_MS || '30000', 10),
    lockTtlMs: parseInt(process.env.AGENT_RUNTIME_AUTOSCALER_LOCK_TTL_MS || '45000', 10),
    minReplicas: parseInt(process.env.AGENT_RUNTIME_AUTOSCALER_MIN_REPLICAS || '2', 10),
    maxReplicas: parseInt(process.env.AGENT_RUNTIME_AUTOSCALER_MAX_REPLICAS || '4', 10),
    scaleUpWaitMs: parseInt(process.env.AGENT_RUNTIME_AUTOSCALER_SCALE_UP_WAIT_MS || '10000', 10),
    scaleUpConsecutiveSamples: parseInt(
      process.env.AGENT_RUNTIME_AUTOSCALER_SCALE_UP_CONSECUTIVE_SAMPLES || '2',
      10,
    ),
    scaleUpCooldownMs: parseInt(
      process.env.AGENT_RUNTIME_AUTOSCALER_SCALE_UP_COOLDOWN_MS || '120000',
      10,
    ),
    scaleDownIdleMs: parseInt(
      process.env.AGENT_RUNTIME_AUTOSCALER_SCALE_DOWN_IDLE_MS || '900000',
      10,
    ),
    scaleDownCooldownMs: parseInt(
      process.env.AGENT_RUNTIME_AUTOSCALER_SCALE_DOWN_COOLDOWN_MS || '900000',
      10,
    ),
    projectId: process.env.RAILWAY_AUTOSCALER_PROJECT_ID || '',
    environmentId: process.env.RAILWAY_AUTOSCALER_ENVIRONMENT_ID || '',
    serviceId: process.env.RAILWAY_AUTOSCALER_SERVICE_ID || '',
    region: process.env.RAILWAY_AUTOSCALER_REGION || 'europe-west4-drams3a',
    apiToken: process.env.RAILWAY_PROJECT_TOKEN || process.env.RAILWAY_API_TOKEN || '',
    apiTokenType:
      process.env.RAILWAY_AUTOSCALER_TOKEN_TYPE ||
      (process.env.RAILWAY_PROJECT_TOKEN ? 'project' : 'bearer'),
  },

  missionApi: {
    mainApiUrl: process.env.MAIN_API_URL || process.env.API_URL || process.env.BACKEND_URL || '',
    callbackUrl:
      process.env.MISSION_CALLBACK_URL ||
      `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/internal/missions/callback`,
    internalToken: process.env.INTERNAL_API_TOKEN || '',
    requestTimeoutMs: parseInt(process.env.MISSION_API_REQUEST_TIMEOUT_MS || '30000', 10),
    agentApiUrl: process.env.AGENT_API_URL || 'http://localhost:3003',
  },

  providerBilling: {
    reconcilerEnabled:
      (process.env.PROVIDER_BILLING_RECONCILER_ENABLED || 'true').toLowerCase() === 'true',
    reconcileMs: parseInt(process.env.PROVIDER_BILLING_RECONCILE_MS || '60000', 10),
    reconcileLimit: parseInt(process.env.PROVIDER_BILLING_RECONCILE_LIMIT || '25', 10),
  },
})

function readAutoscalerMode(value: string | undefined): 'active' | 'dry_run' | 'off' {
  if (value === 'active' || value === 'dry_run' || value === 'off') return value
  return 'active'
}
