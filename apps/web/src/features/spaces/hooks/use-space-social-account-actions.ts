import { useCallback } from 'react'
import {
  addTrackedSocialAccount,
  removeTrackedSocialAccountItems,
  syncTrackedSocialAccount,
} from '../services/social-research.service'
import { updateSpace } from '../services/spaces.service'
import {
  reportSocialResearchError,
  socialResearchContext,
} from '../lib/report-social-research-error'
import type { Space } from '../types'
import {
  DEFAULT_SOCIAL_RESEARCH_CONFIG,
  socialResearchConfigKeyForPlatform,
  type SocialPlatform,
  type SocialResearchConfig,
  type SpaceSchema,
  type ViewDef,
} from '../types/space-schema'

function orgSocialResearchConfig(
  schema: SpaceSchema,
  viewId: string,
  configKey:
    | 'ig_research_config'
    | 'tiktok_research_config'
    | 'youtube_research_config'
    | 'twitter_research_config',
): SocialResearchConfig {
  const v = schema.views.find((x) => x.id === viewId)
  return { ...DEFAULT_SOCIAL_RESEARCH_CONFIG, ...v?.[configKey] }
}

function upsertTrackedAccount(
  accounts: SocialResearchConfig['tracked_accounts'],
  account: SocialResearchConfig['tracked_accounts'][number],
): SocialResearchConfig['tracked_accounts'] {
  const handle = account.handle.toLowerCase()
  const next = accounts.filter((existing) => existing.handle.toLowerCase() !== handle)
  return [...next, account]
}

export function useSpaceSocialAccountActions(opts: {
  platform: SocialPlatform
  activeView: ViewDef | null
  activeSchema: SpaceSchema | undefined
  activeSpace: Space | null
  patchActiveSpaceSchema: (s: SpaceSchema) => void
  applySessionDraft: (viewId: string, patch: Partial<ViewDef>) => void
  refresh: () => Promise<void>
}) {
  const {
    platform,
    activeView,
    activeSchema,
    activeSpace,
    patchActiveSpaceSchema,
    applySessionDraft,
    refresh,
  } = opts
  const configKey = socialResearchConfigKeyForPlatform(platform)

  const handleAddAccount = useCallback(
    async (handle: string) => {
      if (!activeView || !activeSchema || !activeSpace) {
        throw new Error('Space or view not ready')
      }
      const backend = { orgId: activeSpace.org_id ?? null }
      const orgConfig = orgSocialResearchConfig(activeSchema, activeView.id, configKey)
      const { account } = await addTrackedSocialAccount(platform, activeSpace.id, handle, backend)
      const nextAccounts = upsertTrackedAccount(orgConfig.tracked_accounts, account)
      const nextConfig: SocialResearchConfig = { ...orgConfig, tracked_accounts: nextAccounts }
      const nextViews = activeSchema.views.map((v) =>
        v.id === activeView.id ? { ...v, [configKey]: nextConfig } : v,
      )
      const nextSchema = { ...activeSchema, views: nextViews }
      patchActiveSpaceSchema(nextSchema)
      applySessionDraft(activeView.id, { [configKey]: { tracked_accounts: nextAccounts } })
      await updateSpace(activeSpace.id, { schema: nextSchema }, { ...backend, resilient: true })
      try {
        await refresh()
      } catch (err) {
        reportSocialResearchError(
          'account_add_refresh_failed',
          err,
          socialResearchContext(activeSpace.id, platform, { handle }),
          'warn',
        )
      }
    },
    [
      platform,
      configKey,
      activeView,
      activeSchema,
      activeSpace,
      applySessionDraft,
      patchActiveSpaceSchema,
      refresh,
    ],
  )

  const handleSyncAccount = useCallback(
    async (handle: string) => {
      if (!activeView || !activeSchema || !activeSpace) {
        throw new Error('Space or view not ready')
      }
      const backend = { orgId: activeSpace.org_id ?? null }
      const orgConfig = orgSocialResearchConfig(activeSchema, activeView.id, configKey)
      const { lastSyncedAt, accountPatch } = await syncTrackedSocialAccount(
        platform,
        activeSpace.id,
        handle,
        backend,
      )
      const nextAccounts = orgConfig.tracked_accounts.map((a) =>
        a.handle.toLowerCase() === handle.toLowerCase()
          ? { ...a, ...(accountPatch ?? {}), last_synced_at: lastSyncedAt }
          : a,
      )
      const nextConfig: SocialResearchConfig = { ...orgConfig, tracked_accounts: nextAccounts }
      const nextViews = activeSchema.views.map((v) =>
        v.id === activeView.id ? { ...v, [configKey]: nextConfig } : v,
      )
      const nextSchema = { ...activeSchema, views: nextViews }
      patchActiveSpaceSchema(nextSchema)
      applySessionDraft(activeView.id, { [configKey]: { tracked_accounts: nextAccounts } })
      await updateSpace(activeSpace.id, { schema: nextSchema }, { ...backend, resilient: true })
      try {
        await refresh()
      } catch (err) {
        reportSocialResearchError(
          'account_sync_refresh_failed',
          err,
          socialResearchContext(activeSpace.id, platform, { handle }),
          'warn',
        )
      }
    },
    [
      platform,
      configKey,
      activeView,
      activeSchema,
      activeSpace,
      applySessionDraft,
      patchActiveSpaceSchema,
      refresh,
    ],
  )

  const handleRemoveAccount = useCallback(
    async (handle: string) => {
      if (!activeView || !activeSchema || !activeSpace) {
        throw new Error('Space or view not ready')
      }
      const backend = { orgId: activeSpace.org_id ?? null }
      const orgConfig = orgSocialResearchConfig(activeSchema, activeView.id, configKey)
      await removeTrackedSocialAccountItems(platform, activeSpace.id, handle, backend)
      const nextAccounts = orgConfig.tracked_accounts.filter(
        (a) => a.handle.toLowerCase() !== handle.toLowerCase(),
      )
      const nextConfig: SocialResearchConfig = { ...orgConfig, tracked_accounts: nextAccounts }
      const nextViews = activeSchema.views.map((v) =>
        v.id === activeView.id ? { ...v, [configKey]: nextConfig } : v,
      )
      const nextSchema = { ...activeSchema, views: nextViews }
      patchActiveSpaceSchema(nextSchema)
      applySessionDraft(activeView.id, { [configKey]: { tracked_accounts: nextAccounts } })
      await updateSpace(activeSpace.id, { schema: nextSchema }, { ...backend, resilient: true })
      try {
        await refresh()
      } catch (err) {
        reportSocialResearchError(
          'account_remove_refresh_failed',
          err,
          socialResearchContext(activeSpace.id, platform, { handle }),
          'warn',
        )
      }
    },
    [
      platform,
      configKey,
      activeView,
      activeSchema,
      activeSpace,
      applySessionDraft,
      patchActiveSpaceSchema,
      refresh,
    ],
  )

  return { handleAddAccount, handleSyncAccount, handleRemoveAccount }
}
