/**
 * P9 — Integrations façade.
 *
 * INSERTs:
 *   1. `integrations_available` (UPSERT) — ensure catalog rows exist for the
 *      five demo providers. Slack + Twitter ship via the Composio seed
 *      migration (`20260305125500_seed_composio_integrations_available.sql`);
 *      Telegram / Notion / Linear are NOT yet in the catalog, so we upsert
 *      stub rows for them here. Without these, the user_integrations FK on
 *      `integration_id` would fail.
 *
 *   2. `user_integrations` (UPSERT, scope_mode='org_shared') for the founder
 *      across Slack + Telegram (native paths) + Notion + Linear + X
 *      (Composio paths). Composio paths receive a plausible
 *      `composio_connected_account_id` + `composio_toolkit_slug` in metadata
 *      so `IntegrationsOverviewService.getOverview` does not flip status to
 *      'disconnected' when `project_composio_toolkit_config.execution_mode`
 *      is 'composio' (see overview service — NATIVE_OAUTH_OVERRIDES=['slack']
 *      already exempts Slack from that flip).
 *
 *   3. `agent_channels` (UPSERT) — for each hired named agent, one row per
 *      channel_type appropriate to the agent's team (the matrix mirrors
 *      P4's agent_team_grants channel grants):
 *        brand   (Maya/Sara/Casey)  → slack
 *        growth  (Leo)              → slack, x
 *        delivery(Devon/Riley)      → slack, linear
 *        ops     (Owen)             → slack, notion
 *
 * Org-scoped. Deterministic ids — `--reset` cascades from P1.
 */
import { TEAM } from '../content/team'
import { AGENCY_FOUNDED_AT } from '../content/timeline'
import { startResult, type PhaseHandler, type PhaseState } from './_context'

interface IntegrationCatalogRow {
  id: string
  provider: string
  name: string
  description: string
  managedBy: 'native' | 'composio'
}

const INTEGRATIONS_TO_SEED: readonly IntegrationCatalogRow[] = [
  {
    id: 'slack',
    provider: 'slack',
    name: 'Slack',
    description: 'Connect Slack so agents can read and send messages in channels and DMs.',
    managedBy: 'native',
  },
  {
    id: 'telegram',
    provider: 'telegram',
    name: 'Telegram',
    description: 'Connect Telegram so agents can read and reply in DMs and group chats.',
    managedBy: 'native',
  },
  {
    id: 'notion',
    provider: 'notion',
    name: 'Notion',
    description: 'Connect Notion so agents can read pages and update databases.',
    managedBy: 'composio',
  },
  {
    id: 'linear',
    provider: 'linear',
    name: 'Linear',
    description: 'Connect Linear so agents can read tickets and triage workstreams.',
    managedBy: 'composio',
  },
  {
    id: 'twitter',
    provider: 'twitter',
    name: 'X (Twitter)',
    description: 'Connect X (Twitter) so agents can publish posts and read engagement.',
    managedBy: 'composio',
  },
  {
    id: 'github',
    provider: 'github',
    name: 'GitHub',
    description: 'Connect GitHub so agents can read repos and manage pull requests.',
    managedBy: 'composio',
  },
  {
    id: 'google_ads',
    provider: 'google_ads',
    name: 'Google Ads',
    description: 'Connect Google Ads so agents can read campaigns and performance data.',
    managedBy: 'composio',
  },
  {
    id: 'meta',
    provider: 'meta',
    name: 'Meta Ads',
    description: 'Connect Meta Ads so agents can read ad accounts and performance data.',
    managedBy: 'composio',
  },
  {
    id: 'stripe',
    provider: 'stripe',
    name: 'Stripe',
    description: 'Connect Stripe so agents can read billing and subscription data.',
    managedBy: 'composio',
  },
]

interface AgentChannelDef {
  channelType: 'slack' | 'telegram' | 'x' | 'linear' | 'notion'
  /** Backdate channel created_at this many days AFTER the agent hiredAt. */
  daysAfterHire: number
}

const TEAM_CHANNEL_MATRIX: Record<
  'brand' | 'growth' | 'delivery' | 'ops',
  readonly AgentChannelDef[]
> = {
  brand: [{ channelType: 'slack', daysAfterHire: 1 }],
  growth: [
    { channelType: 'slack', daysAfterHire: 1 },
    { channelType: 'x', daysAfterHire: 4 },
  ],
  delivery: [
    { channelType: 'slack', daysAfterHire: 1 },
    { channelType: 'linear', daysAfterHire: 3 },
  ],
  ops: [
    { channelType: 'slack', daysAfterHire: 2 },
    { channelType: 'notion', daysAfterHire: 5 },
  ],
}

function deriveAgentKey(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'agent'
  )
}

function ensureDryRunBootstrap(state: PhaseState, idFn: (...parts: string[]) => string): void {
  if (!state.orgId) state.orgId = idFn('org', 'foundry-creative')
  if (!state.founderUserId) state.founderUserId = idFn('user', 'founder')
  if (!state.hiredAgentKeys || state.hiredAgentKeys.length === 0) {
    state.hiredAgentKeys = ['maya', 'leo', 'sara', 'devon', 'casey', 'riley', 'owen']
  }
}

export const runP09Integrations: PhaseHandler = async (ctx) => {
  const r = startResult('09-integrations')
  const { state, log, supabase, ids, dryRun, timeline } = ctx

  if (dryRun && (!state.orgId || !state.founderUserId || !state.hiredAgentKeys?.length)) {
    ensureDryRunBootstrap(state, ids.id)
    log.step(
      'Dry-run isolation: synthesized state.orgId + state.founderUserId + state.hiredAgentKeys',
    )
  }

  const orgId = state.orgId
  const founderUserId = state.founderUserId
  const hiredAgentKeys = state.hiredAgentKeys ?? []
  if (!orgId) throw new Error('P9 requires state.orgId (set by P1)')
  if (!founderUserId) throw new Error('P9 requires state.founderUserId (set by P1)')
  if (hiredAgentKeys.length === 0) {
    throw new Error('P9 requires state.hiredAgentKeys (set by P4)')
  }

  const warnings: string[] = [
    'Composio-mode integrations may flip to disconnected on overview load (Notion/Linear/X) if project_composio_toolkit_config.execution_mode is set to "composio" without a matching ACTIVE Composio account.',
  ]
  const rowCounts: Record<string, number> = {
    integrations_available: 0,
    user_integrations: 0,
    agent_channels: 0,
  }

  const agencyFoundedIso = timeline.iso(AGENCY_FOUNDED_AT)

  // ─── 1) Ensure integrations_available catalog rows ─────────────────────
  log.step(`Ensuring ${INTEGRATIONS_TO_SEED.length} integrations_available rows exist`)
  for (const integration of INTEGRATIONS_TO_SEED) {
    if (dryRun) {
      log.step(
        `  [dry-run] would UPSERT integrations_available { id: "${integration.id}", managed_by: "${integration.managedBy}" }`,
      )
    } else {
      const { error: catErr } = await supabase.from('integrations_available').upsert(
        {
          id: integration.id,
          provider: integration.provider,
          name: integration.name,
          description: integration.description,
          auth_type: 'oauth2',
          is_available: true,
          metadata: { managed_by: integration.managedBy },
        },
        { onConflict: 'id', ignoreDuplicates: false },
      )
      if (catErr) {
        throw new Error(
          `Upsert integrations_available "${integration.id}" failed: ${catErr.message}`,
        )
      }
    }
    rowCounts.integrations_available = (rowCounts.integrations_available ?? 0) + 1
  }

  // ─── 2) user_integrations for the founder (org-shared) ─────────────────
  log.step(`Inserting ${INTEGRATIONS_TO_SEED.length} user_integrations rows (org-shared)`)
  for (let i = 0; i < INTEGRATIONS_TO_SEED.length; i++) {
    const integration = INTEGRATIONS_TO_SEED[i]
    if (!integration) continue
    const provider = integration.id
    const rowId = ids.id('user_integration', founderUserId, provider)

    // Stagger connection across the first ~6 weeks (one per 1-2 weeks).
    const connectedAt = timeline.after(AGENCY_FOUNDED_AT, 7 + i * 9, 11, 0)
    const connectedAtIso = timeline.iso(connectedAt)

    const metadata: Record<string, unknown> = {}
    if (integration.managedBy === 'composio') {
      metadata.composio_connected_account_id = ids.id('composio-account', orgId, provider)
      metadata.composio_toolkit_slug = provider
    }

    const row = {
      id: rowId,
      user_id: founderUserId,
      org_id: orgId,
      integration_id: provider,
      provider,
      status: 'connected',
      scope_mode: 'org_shared',
      is_default: true,
      agent_enabled: true,
      connection_label: integration.name,
      access_token: `demo-stub-token-${provider}`,
      refresh_token: null,
      token_expires_at: null,
      connected_at: connectedAtIso,
      last_sync_at: connectedAtIso,
      error_message: null,
      metadata,
      created_at: connectedAtIso,
      updated_at: connectedAtIso,
    }

    if (dryRun) {
      log.step(
        `  [dry-run] would UPSERT user_integrations { provider: "${provider}", status: "connected", composio: ${integration.managedBy === 'composio'} }`,
      )
    } else {
      const { error: uiErr } = await supabase
        .from('user_integrations')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: false })
      if (uiErr) {
        throw new Error(`Upsert user_integrations "${provider}" failed: ${uiErr.message}`)
      }
    }
    rowCounts.user_integrations = (rowCounts.user_integrations ?? 0) + 1
  }

  // ─── 3) agent_channels per team matrix ─────────────────────────────────
  log.step('Inserting agent_channels per team matrix')
  for (const hire of TEAM) {
    const agentKey = deriveAgentKey(hire.name)
    if (!hiredAgentKeys.includes(agentKey)) {
      log.step(`  Skipping ${hire.name}: not in state.hiredAgentKeys (P4 gateway sync failure?)`)
      continue
    }

    const channelDefs = TEAM_CHANNEL_MATRIX[hire.team]
    for (const def of channelDefs) {
      const channelId = ids.id('agent_channel', orgId, agentKey, def.channelType)
      const channelCreated = timeline.after(hire.hiredAt, def.daysAfterHire, 14, 0)
      const channelCreatedIso = timeline.iso(channelCreated)

      const providerConfig: Record<string, unknown> = {
        seeded: true,
        provider: def.channelType,
        agency: 'foundry-creative',
      }
      if (def.channelType === 'slack') {
        providerConfig.team_id = `T${ids.id('slack-team', orgId).replace(/-/g, '').slice(0, 8).toUpperCase()}`
        providerConfig.channel_id = `C${ids.id('slack-channel', orgId, agentKey).replace(/-/g, '').slice(0, 8).toUpperCase()}`
        providerConfig.channel_name = `${agentKey}-room`
      } else if (def.channelType === 'telegram') {
        providerConfig.chat_id = `-100${ids.id('telegram-chat', orgId, agentKey).replace(/-/g, '').slice(0, 10)}`
      } else if (def.channelType === 'linear') {
        providerConfig.team_key = hire.team.toUpperCase()
        providerConfig.workspace = 'foundry-creative'
      } else if (def.channelType === 'notion') {
        providerConfig.workspace_id = ids.id('notion-workspace', orgId)
      } else if (def.channelType === 'x') {
        providerConfig.handle = `@foundry_${agentKey}`
      }

      const row = {
        id: channelId,
        user_id: founderUserId,
        org_id: orgId,
        agent_key: agentKey,
        channel_type: def.channelType,
        provider_config: providerConfig,
        webhook_secret: null,
        is_active: true,
        is_public: false,
        last_message_at: null,
        error_message: null,
        created_at: channelCreatedIso,
        updated_at: channelCreatedIso,
      }

      if (dryRun) {
        log.step(
          `  [dry-run] would UPSERT agent_channels { agent_key: "${agentKey}", channel_type: "${def.channelType}" }`,
        )
      } else {
        const { error: acErr } = await supabase
          .from('agent_channels')
          .upsert(row, { onConflict: 'id', ignoreDuplicates: false })
        if (acErr) {
          throw new Error(
            `Upsert agent_channels { agent_key: ${agentKey}, channel_type: ${def.channelType} } failed: ${acErr.message}`,
          )
        }
      }
      rowCounts.agent_channels = (rowCounts.agent_channels ?? 0) + 1
    }
  }

  log.step(
    `agency founded ${agencyFoundedIso} — integrations + agent_channels staggered across the timeline`,
  )

  return r.finish(rowCounts, warnings)
}
