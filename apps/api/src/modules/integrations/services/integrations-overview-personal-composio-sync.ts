import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import type { ComposioService } from '../../composio/services/composio.service'
import type { IntegrationsCoreService } from './integrations-core.service'
import {
  getRowComposioConnectionId,
  type OverviewComposioAccountRef,
} from './integrations-overview-composio-row'

export async function syncPersonalComposioOverviewAccounts(input: {
  supabase: SupabaseClient
  userId: string
  scope: RequestScope
  data: Array<Record<string, unknown>>
  composio: ComposioService
  core: IntegrationsCoreService
}): Promise<{
  activeComposioAccounts: OverviewComposioAccountRef[]
  pendingComposioAccounts: OverviewComposioAccountRef[]
  activeComposioConnectionIds: Set<string>
  activeComposioIntegrationIds: Set<string>
  pendingComposioIntegrationIds: Set<string>
}> {
  const activeComposioAccounts: OverviewComposioAccountRef[] = []
  const pendingComposioAccounts: OverviewComposioAccountRef[] = []
  const activeComposioConnectionIds = new Set<string>()
  const activeComposioIntegrationIds = new Set<string>()
  const pendingComposioIntegrationIds = new Set<string>()

  const composioAccounts = (await input.composio.listConnectedAccounts({
    userId: input.userId,
  })) as Array<Record<string, unknown>>

  for (const account of composioAccounts) {
    const status = String(account.status ?? '')
      .trim()
      .toUpperCase()
    const toolkitSlug = String(
      account.toolkitSlug ??
        account.toolkit_slug ??
        (account.toolkit as Record<string, unknown> | undefined)?.slug ??
        '',
    )
      .trim()
      .toLowerCase()
    const integrationId = input.core.mapComposioToolkitToIntegrationId(toolkitSlug)
    if (!integrationId) continue
    const connectionId = String(account.id ?? '').trim()
    if (!connectionId) continue
    if (status === 'ACTIVE') {
      activeComposioAccounts.push({ integrationId, connectionId, toolkitSlug })
      activeComposioConnectionIds.add(connectionId)
      activeComposioIntegrationIds.add(integrationId)
    }
    if (status === 'PENDING' || status === 'INITIATED') {
      pendingComposioAccounts.push({ integrationId, connectionId, toolkitSlug })
      pendingComposioIntegrationIds.add(integrationId)
    }
  }

  const ACTIVE_ROW_STATUSES = new Set(['connected', 'pending', 'needs_reconnect'])
  const rowsByConnectionId = new Map<string, Record<string, unknown>>()
  for (const row of input.data) {
    const connectionId = getRowComposioConnectionId(row)
    if (!connectionId) continue
    const existing = rowsByConnectionId.get(connectionId)
    if (!existing) {
      rowsByConnectionId.set(connectionId, row)
      continue
    }
    // Prefer an active canonical row over a collapsed/disconnected duplicate that
    // still carries the same composio_connected_account_id in metadata.
    const existingActive = ACTIVE_ROW_STATUSES.has(String(existing.status ?? '').toLowerCase())
    const rowActive = ACTIVE_ROW_STATUSES.has(String(row.status ?? '').toLowerCase())
    if (rowActive && !existingActive) {
      rowsByConnectionId.set(connectionId, row)
      continue
    }
    if (rowActive === existingActive) {
      const rowConnected = String(row.status ?? '').toLowerCase() === 'connected'
      const existingConnected = String(existing.status ?? '').toLowerCase() === 'connected'
      if (rowConnected && !existingConnected) {
        rowsByConnectionId.set(connectionId, row)
      }
    }
  }

  for (const account of activeComposioAccounts) {
    const upsertMeta: Record<string, unknown> = {
      composio_connected_account_id: account.connectionId,
      composio_toolkit_slug: account.toolkitSlug,
    }

    if (account.integrationId === 'linkedin') {
      const existingRow = rowsByConnectionId.get(account.connectionId)
      const existingMeta =
        existingRow?.metadata &&
        typeof existingRow.metadata === 'object' &&
        !Array.isArray(existingRow.metadata)
          ? (existingRow.metadata as Record<string, unknown>)
          : {}
      if (typeof existingMeta.linkedin_author_urn === 'string') {
        upsertMeta.linkedin_author_urn = existingMeta.linkedin_author_urn
      } else {
        const urn = await input.core.resolveLinkedInAuthorUrn(input.userId)
        if (urn) upsertMeta.linkedin_author_urn = urn
      }
    }

    let row = rowsByConnectionId.get(account.connectionId)
    const rowId = String(row?.id ?? '').trim()

    if (rowId) {
      const { error: updateError } = await input.core.updateIntegrationById(
        input.supabase,
        rowId,
        {
          status: 'connected',
          metadata: {
            ...((row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
              ? row.metadata
              : {}) as Record<string, unknown>),
            ...upsertMeta,
          },
        },
      )
      if (!updateError && row) {
        row.status = 'connected'
        row.metadata = {
          ...((row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            ? row.metadata
            : {}) as Record<string, unknown>),
          ...upsertMeta,
        }
      }
    } else {
      const claimable = input.data.find((candidate) => {
        if (String(candidate.integration_id ?? '') !== account.integrationId) return false
        const status = String(candidate.status ?? '').toLowerCase()
        if (status !== 'connected' && status !== 'pending') return false
        const candidateConnectionId = getRowComposioConnectionId(candidate)
        if (!candidateConnectionId) return true
        if (!activeComposioConnectionIds.has(candidateConnectionId)) return true
        // Duplicate metadata: another row already owns this Composio account id.
        return rowsByConnectionId.get(candidateConnectionId) !== candidate
      })
      if (claimable) {
        row = claimable
        const claimableId = String(claimable.id ?? '').trim()
        if (claimableId) {
          const { error: updateError } = await input.core.updateIntegrationById(
            input.supabase,
            claimableId,
            {
              status: 'connected',
              metadata: {
                ...((claimable.metadata &&
                typeof claimable.metadata === 'object' &&
                !Array.isArray(claimable.metadata)
                  ? claimable.metadata
                  : {}) as Record<string, unknown>),
                ...upsertMeta,
              },
              connection_label: null,
            },
          )
          if (!updateError) {
            claimable.status = 'connected'
            claimable.metadata = {
              ...((claimable.metadata &&
              typeof claimable.metadata === 'object' &&
              !Array.isArray(claimable.metadata)
                ? claimable.metadata
                : {}) as Record<string, unknown>),
              ...upsertMeta,
            }
            claimable.connection_label = null
            rowsByConnectionId.set(account.connectionId, claimable)
          }
        }
      } else {
        const insertResult = await input.core.insertPersonalScopedIntegration(
          input.supabase,
          input.scope,
          {
            integration_id: account.integrationId,
            provider: account.integrationId,
            status: 'connected',
            connected_at: new Date().toISOString(),
            metadata: upsertMeta,
          },
        )
        if (insertResult.id) {
          row = {
            id: insertResult.id,
            user_id: input.userId,
            integration_id: account.integrationId,
            provider: account.integrationId,
            status: 'connected',
            agent_enabled: true,
            metadata: upsertMeta,
            scope_mode: 'personal',
            is_default: false,
            connection_label: null,
          }
          input.data.push(row)
          rowsByConnectionId.set(account.connectionId, row)
        }
      }
    }

    const currentLabel = String(row?.connection_label ?? '').trim()
    if (row && !currentLabel) {
      const identity = await input.core.resolveConnectionIdentity(
        account.integrationId,
        input.userId,
        account.connectionId,
      )
      if (identity) {
        const id = String(row.id ?? '').trim()
        if (id) {
          await input.core.updateIntegrationById(input.supabase, id, {
            connection_label: identity,
          })
          row.connection_label = identity
        }
      }
    }
  }

  for (const account of pendingComposioAccounts) {
    if (activeComposioConnectionIds.has(account.connectionId)) continue
    if (rowsByConnectionId.has(account.connectionId)) continue
    const insertResult = await input.core.insertPersonalScopedIntegration(
      input.supabase,
      input.scope,
      {
        integration_id: account.integrationId,
        provider: account.integrationId,
        status: 'pending',
        metadata: {
          composio_connected_account_id: account.connectionId,
          composio_toolkit_slug: account.toolkitSlug,
        },
      },
    )
    if (insertResult.id) {
      const row = {
        id: insertResult.id,
        user_id: input.userId,
        integration_id: account.integrationId,
        provider: account.integrationId,
        status: 'pending',
        agent_enabled: true,
        metadata: {
          composio_connected_account_id: account.connectionId,
          composio_toolkit_slug: account.toolkitSlug,
        },
        scope_mode: 'personal',
        is_default: false,
        connection_label: null,
      }
      input.data.push(row)
      rowsByConnectionId.set(account.connectionId, row)
    }
  }

  await collapseDuplicateComposioConnectionRows({
    supabase: input.supabase,
    data: input.data,
    core: input.core,
  })

  await clearComposioIdsOnDisconnectedDuplicates({
    supabase: input.supabase,
    data: input.data,
    core: input.core,
  })

  await repairDuplicatePersonalConnectionLabels({
    supabase: input.supabase,
    userId: input.userId,
    data: input.data,
    core: input.core,
  })

  return {
    activeComposioAccounts,
    pendingComposioAccounts,
    activeComposioConnectionIds,
    activeComposioIntegrationIds,
    pendingComposioIntegrationIds,
  }
}

/**
 * Multiple user_integrations rows can share one composio_connected_account_id
 * (reconnect races / old upserts). Keep one canonical row per connection id and
 * disconnect the rest so Manage/Library stop listing the same account N times.
 */
async function collapseDuplicateComposioConnectionRows(input: {
  supabase: SupabaseClient
  data: Array<Record<string, unknown>>
  core: IntegrationsCoreService
}): Promise<void> {
  const ACTIVE = new Set(['connected', 'pending', 'needs_reconnect'])
  const byConnectionId = new Map<string, Array<Record<string, unknown>>>()
  for (const row of input.data) {
    if (!ACTIVE.has(String(row.status ?? '').toLowerCase())) continue
    const connectionId = getRowComposioConnectionId(row)
    if (!connectionId) continue
    const list = byConnectionId.get(connectionId) ?? []
    list.push(row)
    byConnectionId.set(connectionId, list)
  }

  const removeIds = new Set<string>()
  const now = new Date().toISOString()
  for (const [connectionId, rows] of byConnectionId) {
    if (rows.length < 2) continue
    const keep = pickCanonicalComposioConnectionRow(rows)
    const keepId = String(keep.id ?? '').trim()
    for (const row of rows) {
      const id = String(row.id ?? '').trim()
      if (!id || id === keepId) continue
      removeIds.add(id)
      const meta =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const nextMeta = {
        ...meta,
        collapsed_duplicate_of: keepId || null,
        previous_composio_connected_account_id: connectionId,
        disconnected_at: now,
      }
      delete nextMeta.composio_connected_account_id
      await input.core.updateIntegrationById(input.supabase, id, {
        status: 'disconnected',
        metadata: nextMeta,
      })
      row.status = 'disconnected'
      row.metadata = nextMeta
    }
  }

  if (removeIds.size === 0) return
  for (let i = input.data.length - 1; i >= 0; i -= 1) {
    const id = String(input.data[i]?.id ?? '').trim()
    if (removeIds.has(id)) input.data.splice(i, 1)
  }
}

/**
 * Disconnected duplicates from earlier collapse runs may still carry the shared
 * composio_connected_account_id. Clear it so overview/list endpoints cannot treat
 * them as live connections when Composio still reports that account as ACTIVE.
 */
async function clearComposioIdsOnDisconnectedDuplicates(input: {
  supabase: SupabaseClient
  data: Array<Record<string, unknown>>
  core: IntegrationsCoreService
}): Promise<void> {
  const ACTIVE = new Set(['connected', 'pending', 'needs_reconnect'])
  const activeConnectionIds = new Set<string>()
  for (const row of input.data) {
    if (!ACTIVE.has(String(row.status ?? '').toLowerCase())) continue
    const connectionId = getRowComposioConnectionId(row)
    if (connectionId) activeConnectionIds.add(connectionId)
  }

  for (const row of input.data) {
    if (String(row.status ?? '').toLowerCase() !== 'disconnected') continue
    const connectionId = getRowComposioConnectionId(row)
    if (!connectionId || !activeConnectionIds.has(connectionId)) continue
    const id = String(row.id ?? '').trim()
    if (!id) continue
    const meta =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? { ...(row.metadata as Record<string, unknown>) }
        : {}
    meta.previous_composio_connected_account_id =
      meta.previous_composio_connected_account_id ?? connectionId
    delete meta.composio_connected_account_id
    await input.core.updateIntegrationById(input.supabase, id, { metadata: meta })
    row.metadata = meta
  }
}

function pickCanonicalComposioConnectionRow(
  rows: Array<Record<string, unknown>>,
): Record<string, unknown> {
  return [...rows].sort((a, b) => {
    const aDefault = a.is_default ? 1 : 0
    const bDefault = b.is_default ? 1 : 0
    if (aDefault !== bDefault) return bDefault - aDefault
    const aConnected = String(a.status ?? '').toLowerCase() === 'connected' ? 1 : 0
    const bConnected = String(b.status ?? '').toLowerCase() === 'connected' ? 1 : 0
    if (aConnected !== bConnected) return bConnected - aConnected
    const aLabel = String(a.connection_label ?? '').trim() ? 1 : 0
    const bLabel = String(b.connection_label ?? '').trim() ? 1 : 0
    if (aLabel !== bLabel) return bLabel - aLabel
    const aTime = String(a.connected_at ?? a.updated_at ?? '')
    const bTime = String(b.connected_at ?? b.updated_at ?? '')
    if (aTime !== bTime) return aTime.localeCompare(bTime)
    return String(a.id ?? '').localeCompare(String(b.id ?? ''))
  })[0]!
}

async function repairDuplicatePersonalConnectionLabels(input: {
  supabase: SupabaseClient
  userId: string
  data: Array<Record<string, unknown>>
  core: IntegrationsCoreService
}): Promise<void> {
  const labelsByIntegration = new Map<string, Map<string, string[]>>()
  for (const row of input.data) {
    if (String(row.status ?? '').toLowerCase() !== 'connected') continue
    const connectionId = getRowComposioConnectionId(row)
    if (!connectionId) continue
    const integrationId = String(row.integration_id ?? '')
    const label = String(row.connection_label ?? '').trim()
    if (!label) continue
    const byLabel = labelsByIntegration.get(integrationId) ?? new Map<string, string[]>()
    const ids = byLabel.get(label) ?? []
    ids.push(connectionId)
    byLabel.set(label, ids)
    labelsByIntegration.set(integrationId, byLabel)
  }
  for (const row of input.data) {
    if (String(row.status ?? '').toLowerCase() !== 'connected') continue
    const connectionId = getRowComposioConnectionId(row)
    if (!connectionId) continue
    const integrationId = String(row.integration_id ?? '')
    const label = String(row.connection_label ?? '').trim()
    const colliding = Boolean(
      label && (labelsByIntegration.get(integrationId)?.get(label)?.length ?? 0) > 1,
    )
    if (label && !colliding) continue
    try {
      const identity = await input.core.resolveConnectionIdentity(
        integrationId,
        input.userId,
        connectionId,
      )
      if (!identity || identity === label) continue
      const id = String(row.id ?? '').trim()
      if (!id) continue
      await input.core.updateIntegrationById(input.supabase, id, { connection_label: identity })
      row.connection_label = identity
    } catch {
      // identity resolution failed — skip
    }
  }
}
