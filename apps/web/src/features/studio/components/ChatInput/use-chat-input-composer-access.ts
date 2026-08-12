import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { isProtectedSystemAgent } from '@/lib/agents/system-agent-contracts'
import { backendGet, backendPatch, backendPost, backendPut } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { CHAT_TOAST_ERRORS } from '@/lib/chat/chat-toast-errors.config'
import { CONNECT_ENDPOINTS, SUGGESTED_INTEGRATIONS } from './chat-input-constants'
import {
  applyComposerPolicyOverride,
  applyComposerSystemAccessPolicy,
  composerPolicyOverridesPayload,
  composerPolicyRowLocked,
  composerPolicyRowState,
  type AgentToggle,
  type ComposerAccessRow,
  type ComposerPlusSubmenu,
  type ComposerPolicy,
  type ComposerPolicyRowState,
} from './chat-input-policy'

type ComposerAccessFetchJson = (path: string) => Promise<unknown>
type ComposerAccessWriteJson = (path: string, body: unknown) => Promise<unknown>
type ComposerAccessCachedFetch = (
  key: string,
  fetcher: () => Promise<unknown>,
  opts?: { ttlMs?: number },
) => Promise<unknown>

interface AgentOverrideRow {
  capability_kind: string
  capability_id: string
  mode: string
}

interface IntegrationsOverviewResult {
  success: boolean
  connectedProviders: string[]
  providerModes?: Record<string, string>
  integrations: AgentToggle[]
}

interface IntegrationConnectResult {
  success?: boolean
  authorizeUrl?: string
  installUrl?: string
  redirect_url?: string
  error?: string
}

export interface UseChatInputComposerAccessOptions {
  agentKey: string
  openPlusSubmenuPosition: (submenu: Exclude<ComposerPlusSubmenu, null>) => void
  fetchJson?: ComposerAccessFetchJson
  patchJson?: ComposerAccessWriteJson
  postJson?: ComposerAccessWriteJson
  putJson?: ComposerAccessWriteJson
  loadCached?: ComposerAccessCachedFetch
  invalidateCache?: (key: string) => void
  showError?: (message: string) => void
  getCurrentHref?: () => string
  getCurrentOrigin?: () => string
  setWindowLocation?: (url: string) => void
}

const defaultFetchJson: ComposerAccessFetchJson = (path) => backendGet<unknown>(path)
const defaultPatchJson: ComposerAccessWriteJson = (path, body) => backendPatch<unknown>(path, body)
const defaultPostJson: ComposerAccessWriteJson = (path, body) => backendPost<unknown>(path, body)
const defaultPutJson: ComposerAccessWriteJson = (path, body) => backendPut<unknown>(path, body)
const defaultShowError = (message: string) => toast.error(message)
const defaultGetCurrentHref = () => (typeof window !== 'undefined' ? window.location.href : '')
const defaultGetCurrentOrigin = () => (typeof window !== 'undefined' ? window.location.origin : '')
const defaultSetWindowLocation = (url: string) => {
  if (typeof window !== 'undefined') window.location.href = url
}

const emptyComposerPolicy = (): ComposerPolicy => ({
  grants: [],
  overrides: { allow_extra: [], deny: [] },
})

export function useChatInputComposerAccess({
  agentKey,
  openPlusSubmenuPosition,
  fetchJson = defaultFetchJson,
  patchJson = defaultPatchJson,
  postJson = defaultPostJson,
  putJson = defaultPutJson,
  loadCached = cachedFetch,
  invalidateCache = invalidateCachedFetch,
  showError = defaultShowError,
  getCurrentHref = defaultGetCurrentHref,
  getCurrentOrigin = defaultGetCurrentOrigin,
  setWindowLocation = defaultSetWindowLocation,
}: UseChatInputComposerAccessOptions) {
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const [providerModes, setProviderModes] = useState<Record<string, string>>({})
  const [agentToggles, setAgentToggles] = useState<AgentToggle[]>([])
  const [skillDenyKeys, setSkillDenyKeys] = useState<Set<string>>(new Set())
  const [skillTogglePending, setSkillTogglePending] = useState<string | null>(null)
  const [composerPolicy, setComposerPolicy] = useState<ComposerPolicy | null>(null)
  const [composerPolicyLoading, setComposerPolicyLoading] = useState(false)
  const [composerPolicyPending, setComposerPolicyPending] = useState<string | null>(null)
  const composerAccessReadOnly = isProtectedSystemAgent(agentKey)
  const skillDenyKeysLoadedForAgentRef = useRef<string | null>(null)
  const integrationsLoadedRef = useRef(false)

  const loadSkillDenyKeys = useCallback(() => {
    if (skillDenyKeysLoadedForAgentRef.current === agentKey) return
    skillDenyKeysLoadedForAgentRef.current = agentKey
    setSkillDenyKeys(new Set())
    setComposerPolicy(null)
    void loadCached(
      `agent-team-overrides:${agentKey}`,
      () => fetchJson(`/api/agent-teams/agents/${agentKey}/overrides`),
      { ttlMs: 300_000 },
    )
      .then((overrides) => {
        if (skillDenyKeysLoadedForAgentRef.current !== agentKey) return
        setSkillDenyKeys(
          new Set(
            asAgentOverrideRows(overrides)
              .filter((row) => row.capability_kind === 'skill' && row.mode === 'deny')
              .map((row) => row.capability_id),
          ),
        )
      })
      .catch(() => null)
  }, [agentKey, fetchJson, loadCached])

  const loadIntegrationOverview = useCallback(() => {
    if (integrationsLoadedRef.current) return
    integrationsLoadedRef.current = true
    void loadCached('integrations-overview', () => fetchJson('/api/integrations/overview'), {
      ttlMs: 120_000,
    })
      .then((result) => {
        const overview = result as Partial<IntegrationsOverviewResult> | null
        if (!overview?.success) return
        setConnectedProviders(overview.connectedProviders ?? [])
        setProviderModes(overview.providerModes ?? {})
        setAgentToggles(overview.integrations ?? [])
      })
      .catch(() => null)
  }, [fetchJson, loadCached])

  const suggestedUnconnected = useMemo(
    () => SUGGESTED_INTEGRATIONS.filter((provider) => !connectedProviders.includes(provider)),
    [connectedProviders],
  )

  const handleToggleAgent = useCallback(
    async (integrationId: string, enabled: boolean) => {
      setAgentToggles((prev) =>
        prev.map((toggle) =>
          toggle.integration_id === integrationId ? { ...toggle, agent_enabled: enabled } : toggle,
        ),
      )
      try {
        await patchJson('/api/integrations/agent-toggle', {
          integration_id: integrationId,
          agent_enabled: enabled,
        })
      } catch {
        setAgentToggles((prev) =>
          prev.map((toggle) =>
            toggle.integration_id === integrationId
              ? { ...toggle, agent_enabled: !enabled }
              : toggle,
          ),
        )
        showError(CHAT_TOAST_ERRORS.INTEGRATION_UPDATE_FAILED.userMessage)
      }
    },
    [patchJson, showError],
  )

  const openPlusSubmenu = useCallback(
    (submenu: Exclude<ComposerPlusSubmenu, null>) => {
      openPlusSubmenuPosition(submenu)
      if (submenu === 'skills' || submenu === 'access') loadSkillDenyKeys()
      if (submenu === 'integrations') loadIntegrationOverview()
      if (submenu === 'access' && !composerPolicy && !composerPolicyLoading) {
        setComposerPolicyLoading(true)
        fetchJson(`/api/agent-teams/agents/${agentKey}/policy`)
          .then((policy) =>
            setComposerPolicy(applyComposerSystemAccessPolicy(policy as ComposerPolicy, agentKey)),
          )
          .catch(() =>
            setComposerPolicy(applyComposerSystemAccessPolicy(emptyComposerPolicy(), agentKey)),
          )
          .finally(() => setComposerPolicyLoading(false))
      }
    },
    [
      agentKey,
      composerPolicy,
      composerPolicyLoading,
      fetchJson,
      loadIntegrationOverview,
      loadSkillDenyKeys,
      openPlusSubmenuPosition,
    ],
  )

  const handleSkillToggle = useCallback(
    async (skillKey: string, enabled: boolean) => {
      if (skillTogglePending) return
      setSkillTogglePending(skillKey)
      setSkillDenyKeys((prev) => {
        const next = new Set(prev)
        if (enabled) next.delete(skillKey)
        else next.add(skillKey)
        return next
      })
      try {
        await postJson(
          `/api/agent-teams/agents/${agentKey}/skill-overrides/${encodeURIComponent(skillKey)}`,
          { enabled },
        )
        invalidateCache(`agent-team-overrides:${agentKey}`)
      } catch {
        setSkillDenyKeys((prev) => {
          const next = new Set(prev)
          if (enabled) next.add(skillKey)
          else next.delete(skillKey)
          return next
        })
        showError('Could not update skill access.')
      } finally {
        setSkillTogglePending(null)
      }
    },
    [agentKey, invalidateCache, postJson, showError, skillTogglePending],
  )

  const handleAccessToggle = useCallback(
    async (row: ComposerAccessRow, nextOn: boolean) => {
      if (!composerPolicy || composerPolicyPending || composerAccessReadOnly) return
      if (composerPolicyRowLocked(composerPolicy, row.kind, row.id)) return
      const current = composerPolicyRowState(composerPolicy, row.kind, row.id)
      let target: ComposerPolicyRowState | null = null
      if (nextOn) {
        if (current === 'default' || current === 'inherited' || current === 'allow_extra') return
        target = current === 'deny' ? 'inherited' : 'allow_extra'
      } else {
        if (current === 'unset' || current === 'deny') return
        target = current === 'allow_extra' ? 'unset' : 'deny'
      }
      if (!target) return
      const previous = composerPolicy
      const optimistic = applyComposerPolicyOverride(composerPolicy, row.kind, row.id, target)
      setComposerPolicy(optimistic)
      setComposerPolicyPending(`${row.kind}:${row.id}`)
      try {
        await putJson(`/api/agent-teams/agents/${agentKey}/overrides`, {
          overrides: composerPolicyOverridesPayload(optimistic),
        })
        invalidateCache(`agent-team-overrides:${agentKey}`)
      } catch {
        setComposerPolicy(previous)
        showError('Could not update agent access.')
      } finally {
        setComposerPolicyPending(null)
      }
    },
    [
      agentKey,
      composerAccessReadOnly,
      composerPolicy,
      composerPolicyPending,
      invalidateCache,
      putJson,
      showError,
    ],
  )

  const handleConnectIntegration = useCallback(
    async (provider: string) => {
      const redirectTo = getCurrentHref()
      try {
        const mode = String(providerModes[provider] ?? '')
          .trim()
          .toLowerCase()
        if (mode === 'composio') {
          const origin = getCurrentOrigin()
          const callbackUrl = origin
            ? `${origin}/api/proxy/integrations/composio/callback?redirect_to=${encodeURIComponent(redirectTo)}&integration_id=${encodeURIComponent(provider)}`
            : ''
          const result = (await postJson('/api/integrations/composio/connect', {
            integration_id: provider,
            callback_url: callbackUrl || redirectTo,
            long_redirect_url: true,
          })) as IntegrationConnectResult
          if (!result?.success) throw new Error(result?.error || 'Failed to initiate connection')
          if (!result?.redirect_url) throw new Error('Missing redirect_url')
          setWindowLocation(result.redirect_url)
          return
        }

        const endpoint = CONNECT_ENDPOINTS[provider]
        if (!endpoint) return
        const result = (await postJson(endpoint, { redirectTo })) as IntegrationConnectResult
        const url = result?.authorizeUrl ?? result?.installUrl
        if (url) setWindowLocation(url)
        else showError(CHAT_TOAST_ERRORS.INTEGRATION_START_CONNECTION_FAILED.userMessage)
      } catch {
        showError(CHAT_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage)
      }
    },
    [getCurrentHref, getCurrentOrigin, postJson, providerModes, setWindowLocation, showError],
  )

  return {
    connectedProviders,
    agentToggles,
    skillDenyKeys,
    skillTogglePending,
    composerPolicy,
    composerPolicyLoading,
    composerPolicyPending,
    composerAccessReadOnly,
    suggestedUnconnected,
    loadIntegrationOverview,
    openPlusSubmenu,
    handleToggleAgent,
    handleSkillToggle,
    handleAccessToggle,
    handleConnectIntegration,
  }
}

function asAgentOverrideRows(value: unknown): AgentOverrideRow[] {
  return Array.isArray(value) ? (value as AgentOverrideRow[]) : []
}
