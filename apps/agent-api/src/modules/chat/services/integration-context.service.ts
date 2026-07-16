import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentPolicyService } from '../../agent-policy/services/agent-policy.service'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import {
  canonicalizeIntegrationId,
  toAgentFacingIntegrationId,
} from '../../shared/utils/integration-id.util'

const PERSONAL_CROSS_CONTEXT_INTEGRATIONS = ['fathom', 'fireflies', 'slack', 'page_grader'] as const

interface ConnectedIntegration {
  integration_id: string
  provider: string
  status: string
  connected_at: string | null
  last_sync_at: string | null
  metadata?: Record<string, unknown> | null
  agent_enabled?: boolean
}

interface IntegrationContextCacheEntry {
  resolvedAt: number
  context: string
}

const INTEGRATION_CONTEXT_CACHE_TTL_MS = 5 * 60_000

@Injectable()
export class IntegrationContextService {
  private readonly logger = new Logger(IntegrationContextService.name)
  private readonly supabase: SupabaseClient
  private readonly contextCache = new Map<string, IntegrationContextCacheEntry>()

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly policy: AgentPolicyService,
    private readonly repository: ChatContextRepository = new ChatContextRepository(),
  ) {
    this.supabase = svc.client
  }

  async buildIntegrationContext(
    userId: string,
    agentKey?: string,
    orgId?: string | null,
  ): Promise<string> {
    const cacheKey = this.integrationContextCacheKey(userId, agentKey, orgId)
    const cached = this.contextCache.get(cacheKey)
    if (cached && Date.now() - cached.resolvedAt < INTEGRATION_CONTEXT_CACHE_TTL_MS) {
      return cached.context
    }

    let allowedIntegrationIds: Set<string> | null = null
    if (agentKey) {
      try {
        const policy = await this.policy.resolveAgentPolicy(agentKey, {
          orgId: orgId ?? null,
          userId: orgId ? null : userId,
        })
        allowedIntegrationIds = new Set(
          policy.grants
            .filter((g) => g.kind === 'integration')
            .map((g) => canonicalizeIntegrationId(g.id)),
        )
        for (const a of policy.overrides.allow_extra) {
          if (a.kind === 'integration') allowedIntegrationIds.add(canonicalizeIntegrationId(a.id))
        }
        for (const d of policy.overrides.deny) {
          if (d.kind === 'integration')
            allowedIntegrationIds.delete(canonicalizeIntegrationId(d.id))
        }
        // No allowed integrations at all = nothing to inject.
        if (allowedIntegrationIds.size === 0) return ''
      } catch (err) {
        this.logger.warn(
          `policy resolve failed, falling back to permissive: ${err instanceof Error ? err.message : err}`,
        )
        allowedIntegrationIds = null
      }
    }

    try {
      const { data, error } = await this.repository.listScopedIntegrations(this.supabase, {
        userId,
        orgId,
      })

      if (error) throw error
      const rows = ((data ?? []) as Array<ConnectedIntegration & Record<string, unknown>>).filter(
        (row) => {
          if (!orgId) return true
          const scopeMode = String(row.scope_mode ?? '')
          if (scopeMode === 'org_shared') return true
          if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
          return false
        },
      )
      if (orgId) {
        const { data: personalRows, error: personalError } =
          await this.repository.listPersonalIntegrations(this.supabase, {
            userId,
            integrationIds: PERSONAL_CROSS_CONTEXT_INTEGRATIONS,
          })
        if (personalError) throw personalError
        const existingIntegrationIds = new Set(
          rows.map((row) =>
            String(row.integration_id ?? '')
              .trim()
              .toLowerCase(),
          ),
        )
        for (const row of (personalRows ?? []) as Array<
          ConnectedIntegration & Record<string, unknown>
        >) {
          const integrationId = String(row.integration_id ?? '')
            .trim()
            .toLowerCase()
          if (!integrationId || existingIntegrationIds.has(integrationId)) continue
          rows.push(row)
          existingIntegrationIds.add(integrationId)
        }
      }
      const connectedRows = rows.filter((row) => {
        const status = String(row.status ?? '')
          .trim()
          .toLowerCase()
        if (status !== 'connected') return false
        const integrationId = String(row.integration_id ?? '')
          .trim()
          .toLowerCase()
        if (allowedIntegrationIds && !allowedIntegrationIds.has(integrationId)) return false
        return row.agent_enabled !== false
      })

      const grouped = new Map<string, Array<Record<string, unknown>>>()
      for (const row of connectedRows) {
        const integrationId = String(row.integration_id ?? '')
          .trim()
          .toLowerCase()
        if (!integrationId) continue
        const bucket = grouped.get(integrationId) ?? []
        bucket.push(row as Record<string, unknown>)
        grouped.set(integrationId, bucket)
      }

      const providerIds = new Set(Array.from(grouped.keys()).map(toAgentFacingIntegrationId))
      providerIds.add('social_analysis')
      providerIds.add('seo_research')
      const providerNames = Array.from(providerIds)
      const lines: string[] = [
        '<connected_integrations>',
        providerNames.join(', '),
        '</connected_integrations>',
      ]
      if (grouped.size > 0) {
        lines.push('<integration_connections>')
        for (const [integrationId, bucket] of grouped.entries()) {
          const visibleIntegrationId = toAgentFacingIntegrationId(integrationId)
          const connectionSummaries = bucket.map((row) => {
            const id = String(row.id ?? '').trim()
            const scopeMode = String(row.scope_mode ?? 'personal')
            const defaultMark =
              scopeMode === 'org_shared' && Boolean(row.is_default) ? 'default' : 'non_default'
            const labelRaw = String(
              row.connection_label ??
                (row.metadata as Record<string, unknown> | undefined)?.connection_label ??
                (row.metadata as Record<string, unknown> | undefined)?.email ??
                '',
            ).trim()
            const label = labelRaw || id || 'connection'
            return `${label}(${scopeMode},${defaultMark})`
          })
          lines.push(`${visibleIntegrationId}: ${connectionSummaries.join(' | ')}`)
        }
        lines.push('</integration_connections>')
      }

      this.logger.debug(`Injected integration context: ${connectedRows.length} connected rows`)
      const context = lines.join('\n')
      this.contextCache.set(cacheKey, { resolvedAt: Date.now(), context })
      return context
    } catch (err) {
      this.logger.warn(
        `Failed to build integration context: ${err instanceof Error ? err.message : err}`,
      )
      return ''
    }
  }

  bustIntegrationContextCache(input?: {
    userId?: string
    orgId?: string | null
    agentKey?: string
  }): void {
    if (!input) {
      this.contextCache.clear()
      return
    }
    for (const key of this.contextCache.keys()) {
      if (input.userId && !key.includes(`user:${input.userId}`)) continue
      if (input.orgId !== undefined && !key.includes(`org:${input.orgId ?? ''}`)) continue
      if (input.agentKey && !key.includes(`agent:${input.agentKey}`)) continue
      this.contextCache.delete(key)
    }
  }

  private integrationContextCacheKey(
    userId: string,
    agentKey?: string,
    orgId?: string | null,
  ): string {
    return [`user:${userId}`, `org:${orgId ?? ''}`, `agent:${agentKey ?? ''}`].join('|')
  }
}
